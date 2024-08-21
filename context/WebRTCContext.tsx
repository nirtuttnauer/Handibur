import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useAuth } from '@/context/auth';
import { supabase } from '@/context/supabaseClient';
import { useRouter } from 'expo-router';

// Define the context type
type WebRTCContextType = {
  localStream: any;
  remoteStream: any;
  messageBuffer: string;
  receivedMessages: string[];
  targetUserID: string;
  setTargetUserID: (id: string) => void;
  setMessageBuffer: (message: string) => void;
  createOffer: () => void;
  createAnswer: () => void;
  endCall: () => void;
  sendMessage: () => void;
};

// Create the context
const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

// WebRTC provider component
export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>('');
  const [callStartTime, setCallStartTime] = useState<string | null>(null);
  const [callEndTime, setCallEndTime] = useState<string | null>(null);
  const [callId, setCallId] = useState<number | null>(null); // Call ID managed by the database
  const sdp = useRef<any>(null);
  const socket = useRef<any>(null);
  const pc = useRef<any>(null);
  const dataChannel = useRef<any>(null);
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://44bd-2a0d-6fc0-747-bc00-818b-8d9c-4405-d21.ngrok-free.app/webrtcPeer';

  useEffect(() => {
    if (!socket.current) {
      console.log('Initializing socket connection...');
      socket.current = io(uri, { path: '/io/webrtc', query: { userID: user?.id } });
      socket.current.on('connection-success', (success: any) => {
        console.log('Socket connection successful:', success);
        socket.current.emit('register', user?.id);
      });

      socket.current.on('offerOrAnswer', (sdpData: any) => {
        console.log('Received offerOrAnswer:', sdpData);
        handleRemoteSDP(sdpData);
      });

      socket.current.on('candidate', (candidate: any) => {
        console.log('Received candidate:', candidate);
        if (pc.current) {
          pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      });

      socket.current.on('endCall', () => {
        console.log('Received endCall signal');
        endCall();
      });

      setupWebRTC();
    }

    return () => {
      if (socket.current) {
        console.log('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [user?.id, targetUserID]);

  const setupWebRTC = () => {
    console.log('Setting up WebRTC...');
    const pc_config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    };
    pc.current = new RTCPeerConnection(pc_config);

    pc.current.onicecandidate = (e: any) => {
      console.log('onicecandidate:', e);
      e.candidate && sendToPeer('candidate', e.candidate);
    };

    pc.current.oniceconnectionstatechange = (e: any) => {
      console.log('oniceconnectionstatechange:', e);
    };

    pc.current.ontrack = (e: any) => {
      console.log('ontrack:', e);
      e.streams && e.streams[0] && setRemoteStream(e.streams[0]);
    };

    pc.current.ondatachannel = (event: any) => {
      console.log('ondatachannel:', event);
      event.channel.onmessage = (msg: any) => {
        console.log('Data channel message:', msg.data);
        setReceivedMessages((prev) => [...prev, `Peer: ${msg.data}`]);
      };
    };

    dataChannel.current = pc.current.createDataChannel('chat');
    dataChannel.current.onopen = () => console.log('Data channel is open');
    dataChannel.current.onclose = () => console.log('Data channel is closed');
    dataChannel.current.onmessage = (msg: any) => {
      console.log('Data channel message:', msg.data);
      setReceivedMessages((prev) => [...prev, `Peer: ${msg.data}`]);
    };
  };

  const setupMediaStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: { mandatory: { minWidth: 500, minHeight: 300, minFrameRate: 30 }, facingMode: 'user' } });
      console.log('Received local stream:', stream);
      setLocalStream(stream);
      stream.getTracks().forEach((track: any) => pc.current.addTrack(track, stream));
    } catch (error: any) {
      console.error('Error getting user media:', error);
    }
  };

  const sendToPeer = (messageType: string, payload: any) => {
    console.log(`Sending ${messageType}:`, payload);
    socket.current && socket.current.emit(messageType, { targetUserID, payload });
  };

  const handleRemoteSDP = async (sdpData: any) => {
    try {
      if (pc.current.signalingState === "stable" && sdpData.type === "offer") {
        setCallStartTime(new Date().toISOString()); // Set call start time
        await setupMediaStream();
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
        createAnswer();
      } else if (pc.current.signalingState === "have-local-offer" && sdpData.type === "answer") {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
      }
    } catch (error: any) {
      console.error('Error setting remote SDP:', error);
    }
  };

  const createOffer = async () => {
    console.log('Creating offer...');
    setCallStartTime(new Date().toISOString()); // Set call start time
    await setupMediaStream();
    if (targetUserID){
      try {
        const { data, error } = await supabase
          .from('call_history')
          .insert({
            caller_id: user?.id,
            receiver_id: targetUserID,
            call_start: callStartTime,
          })
          .select('call_id') // Return the call_id
          .single();
  
        if (error) {
          throw error;
        }
  
        // Save the call_id to state
        setCallId(data.call_id);
        console.log('Call initiated with call_id:', data.call_id);
      } catch (error: any) {
        console.error('Error initiating call:', error.message);
      }
    }
    
    pc.current.createOffer({ offerToReceiveVideo: 1 })
      .then((sdpData: any) => {
        console.log('Created offer:', sdpData);
        pc.current.setLocalDescription(sdpData);
        sendToPeer('offerOrAnswer', sdpData);
      }).catch(console.error);
  };

  const createAnswer = () => {
    console.log('Creating answer...');
    pc.current.createAnswer({ offerToReceiveVideo: 1 })
      .then((sdpData: any) => {
        console.log('Created answer:', sdpData);
        pc.current.setLocalDescription(sdpData);
        sendToPeer('offerOrAnswer', sdpData);
      }).catch(console.error);
  };

  const endCall = async () => {
    console.log('Ending call...');
    setCallEndTime(new Date().toISOString()); // Set call end time

    if (callId) {
      try {
        const { error } = await supabase
          .from('call_history')
          .update({
            call_end: callEndTime,
            call_status: 'completed',  // or 'missed' if appropriate
          })
          .eq('call_id', callId);

        if (error) {
          throw error;
        }

        console.log('Call history updated successfully.');
      } catch (error: any) {
        console.error('Error ending call:', error.message);
      }
    }

    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    if (socket.current) {
      socket.current.emit('endCall', { targetUserID });
      socket.current.disconnect();
      socket.current = null;
      router.back();
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    sdp.current = null;  // Clear SDP

    setupWebRTC();  // Reinitialize WebRTC for the next call
  };

  const sendMessage = () => {
    if (dataChannel.current && messageBuffer.trim() !== '') {
      console.log('Sending message:', messageBuffer);
      dataChannel.current.send(messageBuffer);
      setReceivedMessages((prev) => [...prev, `Me: ${messageBuffer}`]);
      setMessageBuffer('');
    }
  };

  // Function to update the call history when the call ends
  const updateCallHistory = async () => {
    if (callStartTime && callEndTime) {
      try {
        const { error } = await supabase
          .from('call_history')
          .insert({
            caller_id: user?.id,
            receiver_id: targetUserID,
            call_start: callStartTime,
            call_end: callEndTime,
            call_status: 'completed', // Set call status to 'completed' (or 'missed', if appropriate)
          });

        if (error) {
          throw error;
        }

        console.log('Call history saved successfully.');
      } catch (error: any) {
        console.error('Error saving call history:', error.message);
      }
    }
  };

  useEffect(() => {
    // When the call ends, update the call history
    if (callEndTime) {
      updateCallHistory();
    }
  }, [callEndTime]);

  return (
    <WebRTCContext.Provider value={{
      localStream,
      remoteStream,
      messageBuffer,
      receivedMessages,
      targetUserID,
      setTargetUserID,
      setMessageBuffer,
      createOffer,
      createAnswer,
      endCall,
      sendMessage,
    }}>
      {children}
    </WebRTCContext.Provider>
  );
};

// Custom hook to use WebRTC context
export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export default WebRTCProvider;