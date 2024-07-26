import React, { useState, useEffect } from "react";
import { View, Button } from "react-native";
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
} from "react-native-webrtc";
import { supabase } from "@/context/supabaseClient";

const configuration = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};

export default function JoinScreen() {
  const [roomId, setRoomId] = useState(123);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cachedLocalPC, setCachedLocalPC] = useState<RTCPeerConnection | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isOffCam, setIsOffCam] = useState(false);

  // Automatically start stream
  useEffect(() => {
    startLocalStream();
  }, []);

  useEffect(() => {
    if (localStream) {
      joinCall(roomId);
    }
  }, [localStream]);

  // End call button
  async function endCall() {
    console.log("Ending call...");
    // @ts-ignore
    if (cachedLocalPC) {
      cachedLocalPC.getSenders().forEach((sender, index, array) => {
        cachedLocalPC?.removeTrack(sender);
      });
      cachedLocalPC.close();
      console.log("Peer connection closed.");
    }

    const { data, error } = await supabase
      .from("rooms")
      .update({ answer: null, connected: false })
      .eq("id", roomId);

    if (error) {
      console.error("Error ending call: ", error);
    } else {
      console.log("Call ended, room updated.");
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCachedLocalPC(null);
  }

  // Start local webcam on your device
  const startLocalStream = async () => {
    console.log("Starting local stream...");

    const isFront = true;
    const devices = await mediaDevices.enumerateDevices() as MediaDeviceInfo[];
    const facing = isFront ? "front" : "environment";
    const videoSourceId = devices.find(
      (device) => device.kind === "videoinput" && (device as MediaDeviceInfo & { facing: string }).facing === facing
    )?.deviceId;
    const facingMode = isFront ? "user" : "environment";
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500, // Provide your own width, height, and frame rate here
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
    console.log("Local stream started.");
  };

  // Join call function
  const joinCall = async (id: number) => {
    console.log("Joining call...");

    const { data: roomSnapshot, error: roomError } = await supabase.from("rooms").select("*").eq("id", id).single();

    if (roomError) {
      console.error("Error fetching room data: ", roomError);
      return;
    }

    const localPC = new RTCPeerConnection(configuration);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        localPC.addTrack(track, localStream);
      });
    }

    const callerCandidatesCollection = supabase.from("callerCandidates");
    const calleeCandidatesCollection = supabase.from("calleeCandidates");

    localPC.addIceCandidate = async (e: RTCPeerConnectionIceEvent) => {
      if (!e.candidate) {
        console.log("Got final candidate!");
        return;
      }
      const { data, error } = await calleeCandidatesCollection.insert({
        room_id: id,
        candidate: e.candidate.toJSON(),
      });

      if (error) {
        console.error("Error adding callee candidate: ", error);
      } else {
        console.log("Callee candidate added.");
      }
    };

    (localPC as any).ontrack = (e: RTCTrackEvent) => {
      console.log("Received remote track.");
      const newStream = new MediaStream();
      e.streams[0].getTracks().forEach((track) => {
        newStream.addTrack(track as unknown as MediaStreamTrack);
      });
      setRemoteStream(newStream);
    };

    const offer = roomSnapshot.offer;
    await localPC.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await localPC.createAnswer();
    await localPC.setLocalDescription(answer);

    const { data, error } = await supabase
      .from("rooms")
      .update({ answer, connected: true })
      .eq("id", id);

    if (error) {
      console.error("Error setting answer: ", error);
    } else {
      console.log("Answer set, room updated.");
    }

    // Listen for remote candidates
    const callerSubscription = supabase
      .channel(`public:callerCandidates:room_id=eq.${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "callerCandidates", filter: `room_id=eq.${id}` }, (payload) => {
        const data = payload.new;
        localPC.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log("Added ICE candidate.");
      })
      .subscribe();

    // Listen for call end
    const roomSubscription = supabase
      .channel(`public:rooms:id=eq.${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}` }, (payload) => {
        const data = payload.new;
        if (!data.answer) {
          console.log("Call ended by remote.");
        }
      })
      .subscribe();

    setCachedLocalPC(localPC);

    return () => {
      supabase.removeChannel(callerSubscription);
      supabase.removeChannel(roomSubscription);
      console.log("Subscriptions removed.");
    };
  };

  const switchCamera = () => {
    localStream?.getVideoTracks().forEach((track) => {
      // @ts-ignore
      track._switchCamera();
    });
    console.log("Camera switched.");
  };

  // Mutes the local's outgoing audio
  const toggleMute = () => {
    if (!remoteStream) {
      return;
    }
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
    console.log("Audio toggled.");
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsOffCam(!track.enabled);
    });
    console.log("Camera toggled.");
  };

  return (
    <View style={{ flex: 1 }}>
      {!remoteStream && (
        <RTCView
          style={{ flex: 1 }}
          streamURL={localStream?.toURL()}
          objectFit={"cover"}
        />
      )}

      {remoteStream && (
        <>
          <RTCView
            mirror={true}
            style={{ flex: 1 }}
            streamURL={remoteStream?.toURL()}
            objectFit={"cover"}
          />
          {!isOffCam && (
            <RTCView
              mirror={true}
              style={{ width: 128, height: 192, position: 'absolute', right: 24, top: 32 }}
              streamURL={localStream?.toURL()}
            />
          )}
        </>
      )}
      <View style={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <CallActionBox
          switchCamera={switchCamera}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          endCall={endCall}
        />
      </View>
    </View>
  );
}

const CallActionBox = ({ switchCamera, toggleMute, toggleCamera, endCall }: any) => {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 16 }}>
      <Button title="Switch Camera" onPress={switchCamera} />
      <Button title="Toggle Mute" onPress={toggleMute} />
      <Button title="Toggle Camera" onPress={toggleCamera} />
      <Button title="End Call" onPress={endCall} />
    </View>
  );
};