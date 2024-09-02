import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "expo-router";
import { WebRTCContextType } from "@/types/webRTCContextType";
import { WebRTCManager } from "./webrtcManager";
import { MediaStream } from "react-native-webrtc";
import {supabase} from "@/context/supabaseClient"; // Import your Supabase client

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStream2, setRemoteStream2] = useState<MediaStream | null>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>("");
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>("");
  const [secondTargetUserID, setSecondTargetUserID] = useState<string>("");
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<number | null>(null);
  const socket = useRef<Socket | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const uri = "https://4761db7d6332.ngrok.app"; // Use your actual server URL

  useEffect(() => {
    initializeWebRTC();

    const callCheckInterval = setInterval(() => {
      checkCallingStatus();
    }, 1000);

    return () => {
      cleanupSocket();
      clearInterval(callCheckInterval);
    };
  }, [user?.id, targetUserID]);

  useEffect(() => {
    if (secondTargetUserID && webrtcManager.current) {
      webrtcManager.current.setSecondTargetUserID(secondTargetUserID).then(async () => {
        console.log("Second target user ID set in WebRTCManager:", secondTargetUserID);
      });
    }
  }, [secondTargetUserID]);

  const initializeWebRTC = () => {
    if (!socket.current) {
      initializeSocket();
    }
    if (targetUserID || secondTargetUserID) {
      setupWebRTC();
    }
  };

  const initializeSocket = () => {
    socket.current = io(uri + "/webrtcPeer", {
      path: "/io/webrtc",
      auth: { userID: user?.id, role: "user" },
    });

    socket.current.on("connection-success", () => {
      socket.current?.emit("register", user?.id);
      checkCallingStatus();
    });

    socket.current.on("offerOrAnswer", async (sdpData: any) => {
      try {
        const connectionIndex = sdpData.from === targetUserID ? 1 : 2;
        if (webrtcManager.current) {
          await webrtcManager.current.handleRemoteSDP(sdpData, connectionIndex);
        } else {
          console.error(`No WebRTCManager found for user ID ${sdpData.from}`);
        }
      } catch (error) {
        console.error("Error handling offer/answer:", error);
      }
    });

    socket.current.on("candidate", (candidate: any) => {
      if (webrtcManager.current) {
        webrtcManager.current.handleIceCandidate(
          candidate,
          candidate.connectionIndex
        );
      }
    });

    socket.current.on("endCall", () => {
      endCall();
    });

    socket.current.on("callingStatus", (data: { isBeingCalled: boolean; from?: string }) => {
      if (data.isBeingCalled && data.from) {
        const isOnCallScreen = pathname.startsWith("/call");
        if (!isOnCallScreen) {
          setTargetUserID(data.from);
          router.push(`/call/${data.from}/answering`);
        }
      }
    });

    socket.current.on("callResponse", async (data: { decision: "accept" | "reject"; from: string }) => {
      if (data.decision === "accept") {
        router.replace(`/call/${data.from}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        createOffer(1);
        startCallTimer(); // Start the call timer when the call is accepted
      } else {
        console.log(`User ${data.from} rejected the call.`);
        endCall();
        resetContext();
      }
    });

    socket.current.on("serverAssigned", async (data: any) => {
      console.log("Server assigned");
      setSecondTargetUserID(data?.serverID);
    });

    socket.current.on("noServerAvailable", async () => {
      console.log("No server available");
      alert("No server available");
    });
  };

  const cleanupSocket = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
  };

  const setupWebRTC = () => {
    const manager = new WebRTCManager(
      (candidate) => sendToPeer("candidate", candidate),
      (remoteStream, streamIndex) => {
        if (streamIndex === 1) {
          setRemoteStream(remoteStream);
        } else if (streamIndex === 2) {
          setRemoteStream2(remoteStream);
        }
      },
      (message, channelIndex) =>
        setReceivedMessages((prev) => [
          ...prev,
          `Peer ${channelIndex}: ${message}`,
        ]),
      (localStream) => setLocalStream(localStream),
      (sdp, pcIndex) => {
          sendToPeer("offerOrAnswer", sdp, pcIndex);      
      },
      () => sendEndCall(),
      targetUserID,
      secondTargetUserID
    );

    webrtcManager.current = manager;
  };

  const sendToPeer = (messageType: string, payload: any, connectionIndex: number = 1) => {
    if (!user?.id) {
      console.error("Cannot send message: User ID is undefined");
      return;
    }

    const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
    if (!targetID) {
      console.error(`Cannot send message: targetUserID is undefined for connection index ${connectionIndex}`);
      return;
    }

    console.log(`Sending message to peer (Connection ${connectionIndex}):`, targetID);
    socket.current?.emit(messageType, {
      targetUserID: targetID,
      from: user.id,
      connectionIndex,
      ...payload,
    });
  };

  const createCall = async (connectionIndex: number = 1) => {
    try {
      const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
      if (!targetID) {
        console.error("Cannot initiate call: Target user ID is undefined");
        return;
      }

      sendToPeer("calling", { targetUserID: targetID, from: user?.id }, connectionIndex);
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  };

  const createOffer = async (connectionIndex: number) => {
    try {
      const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
      if (!targetID) {
        console.error("Cannot create offer: Target user ID is undefined");
        return;
      }

      const offer = await webrtcManager.current?.createOffer(connectionIndex);
      if (offer) {
        sendToPeer("offerOrAnswer", offer, connectionIndex);
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const createAnswer = async (connectionIndex: number = 1) => {
    try {
      const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
      if (!targetID) {
        console.error("Cannot create answer: Target user ID is undefined");
        return;
      }

      const answer = await webrtcManager.current?.createAnswer(connectionIndex);
      if (answer) {
        sendToPeer("offerOrAnswer", answer, connectionIndex);
      }
    } catch (error) {
      console.error("Error creating answer:", error);
    }
  };

  const createAnswerToCalling = async (decision: "accept" | "reject", connectionIndex: number = 1) => {
    try {
      const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
      if (!targetID) {
        console.error("Cannot respond to call: Target user ID is undefined");
        return;
      }

      sendToPeer("answerToCall", { targetUserID: targetID, decision }, connectionIndex);

      if (decision === "accept") {
        await createOffer(connectionIndex);
        startCallTimer(); // Start the call timer when the call is accepted
      } else {
        console.log("Call rejected.");
      }
    } catch (error) {
      console.error("Error responding to call:", error);
    }
  };

  const startCallTimer = () => {
    const startTime = Date.now();
    setCallStartTime(startTime);
  };

  const endCall = async () => {
    await endCallTimer(); // End the call timer and update the database
    await webrtcManager.current?.endCall();
    webrtcManager.current = null;
    router.back();
  };

  const endCallTimer = async () => {
    if (callStartTime) {
      const endTime = Date.now();
      const duration = endTime - callStartTime; // Duration in milliseconds
      setCallDuration(duration);

      // Update the call history in Supabase
      try {
        await updateCallHistoryOnSupabase(duration);
      } catch (error) {
        console.error("Error updating call history on Supabase:", error);
      }
    }
  };

  const updateCallHistoryOnSupabase = async (duration: number) => {
    if (!user?.id || !targetUserID) {
      console.error("Cannot update call history: Missing user or target user ID");
      return;
    }

    const { error } = await supabase
      .from("call_history")
      .insert({
        from_user_id: user.id,
        to_user_id: targetUserID,
        duration, // Duration in milliseconds
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to update call history:", error);
    } else {
      console.log("Call history updated successfully.");
    }
  };

  const sendEndCall = async () => {
    if (!user?.id) {
      console.error("Cannot send end call: User ID is undefined");
      return;
    }
    socket.current?.emit("endCall", { targetUserIDs: [targetUserID, secondTargetUserID], from: user.id });
  };

  const sendMessage = (connectionIndex: number = 1) => {
    if (messageBuffer.trim() !== "") {
      webrtcManager.current?.sendMessage(messageBuffer, connectionIndex);
      setReceivedMessages((prev) => [
        ...prev,
        `Me (Channel ${connectionIndex}): ${messageBuffer}`,
      ]);
      setMessageBuffer("");
    }
  };

  const toggleVideo = () => {
    webrtcManager.current?.toggleVideo();
  };

  const toggleAudio = () => {
    webrtcManager.current?.toggleAudio();
  };

  const checkCallingStatus = () => {
    if (socket.current) {
      socket.current.emit("checkCalling");
    }
  };

  const resetContext = () => {
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStream2(null);
    setMessageBuffer("");
    setReceivedMessages([]);
    setTargetUserID("");
    setSecondTargetUserID("");
    if (webrtcManager.current) {
      webrtcManager.current = null;
    }
    cleanupSocket();
  };

  const requestServer = async () => {
    try {
      socket.current?.emit("requestServer", {});
    } catch (error) {
      console.error("Error requesting server:", error);
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        remoteStream,
        remoteStream2,
        messageBuffer,
        receivedMessages,
        targetUserID,
        setTargetUserID,
        secondTargetUserID,
        setSecondTargetUserID,
        setMessageBuffer,
        createOffer,
        createAnswer,
        createAnswerToCalling,
        endCall,
        sendMessage,
        toggleVideo,
        toggleAudio,
        resetContext,
        initializeWebRTC,
        createCall,
        requestServer,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

// Custom hook to use WebRTC context
export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
};

export default WebRTCProvider;