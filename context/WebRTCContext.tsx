import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';

type WebRTCContextType = {
  localStream: any, remoteStream: any, messageBuffer: string, receivedMessages: string[],
  targetUserID: string, hasOffer: boolean, setTargetUserID: (id: string) => void,
  setMessageBuffer: (message: string) => void, createOffer: () => void,
  createAnswer: () => void, endCall: () => void, sendMessage: () => void,
  checkForOffer: () => void
};

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>('');
  const [hasOffer, setHasOffer] = useState<boolean>(false);
  const socket = useRef<any>(null);
  const pc = useRef<any>(null);
  const dataChannel = useRef<any>(null);
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://6402-2a0d-6fc2-49a3-2000-c9b9-78cc-590-c617.ngrok-free.app/webrtcPeer';

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(uri, { path: '/io/webrtc', query: { userID: user?.id } });
      socket.current.on('connection-success', checkForOffer);
      socket.current.on('offerOrAnswer', (sdpData: any) => {
        handleRemoteSDP(sdpData);
        setHasOffer(false);
      });
      socket.current.on('candidate', (candidate: any) => pc.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error));
      socket.current.on('endCall', endCall);
      socket.current.on('disconnect', () => socket.current.connect());
      setupWebRTC();
    }
    return () => {
      socket.current?.disconnect();
      socket.current = null;
    };
  }, [user?.id, targetUserID]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkForOffer();
    }, 10000); // Check for offers every 10 seconds
    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  useEffect(() => {
    if (hasOffer) {
      router.push(`/call/${targetUserID}`);
    }
  }, [hasOffer, router, targetUserID]);

  const setupWebRTC = () => {
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pc.current.onicecandidate = (e: any) => e.candidate && sendToPeer('candidate', e.candidate);
    pc.current.ontrack = (e: any) => e.streams && setRemoteStream(e.streams[0]);
    pc.current.ondatachannel = (event: any) => {
      event.channel.onmessage = (msg: any) => setReceivedMessages(prev => [...prev, `Peer: ${msg.data}`]);
    };
    dataChannel.current = pc.current.createDataChannel('chat');
    dataChannel.current.onmessage = (msg: any) => setReceivedMessages(prev => [...prev, `Peer: ${msg.data}`]);
  };

  const setupMediaStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: { mandatory: { minWidth: 500, minHeight: 300, minFrameRate: 30 }, facingMode: 'user' } });
      setLocalStream(stream);
      stream.getTracks().forEach((track: any) => pc.current.addTrack(track, stream));
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  };

  const sendToPeer = (messageType: string, payload: any) => {
    if (targetUserID) socket.current?.emit(messageType, { targetUserID, payload });
    else console.error('Target User ID is not set');
  };

  const handleRemoteSDP = async (sdpData: any) => {
    try {
      if (pc.current.signalingState === "stable" && sdpData.type === "offer") {
        await setupMediaStream();
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
        createAnswer();
      } else if (pc.current.signalingState === "have-local-offer" && sdpData.type === "answer") {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
      }
    } catch (error) {
      console.error('Error setting remote SDP:', error);
    }
  };

  const createOffer = async () => {
    if (!targetUserID) return console.error('Target User ID is not set');
    await setupMediaStream();
    const sdpData = await pc.current.createOffer({ offerToReceiveVideo: 1 });
    await pc.current.setLocalDescription(sdpData);
    sendToPeer('offerOrAnswer', sdpData);
  };

  const createAnswer = async () => {
    if (!targetUserID) return console.error('Target User ID is not set');
    const sdpData = await pc.current.createAnswer({ offerToReceiveVideo: 1 });
    await pc.current.setLocalDescription(sdpData);
    sendToPeer('offerOrAnswer', sdpData);
  };

  const endCall = () => {
    // Close peer connection and data channel
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
  
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
  
    // Emit an end call signal to the server
    if (socket.current) {
      socket.current.emit('endCall', { targetUserID });
    }
  
    // Stop the local media stream
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
  
    // Reset local state
    setLocalStream(null);
    setRemoteStream(null);
    setHasOffer(false);
    setReceivedMessages([]);
    setMessageBuffer('');
  
    // Navigate back to the previous screen or a different screen
    router.back();
  
    // Reinitialize WebRTC setup for future calls
    setupWebRTC();
  };

  const checkForOffer = () => {
    socket.current?.emit('check-offer');
    socket.current?.on('pending-offer', () => setHasOffer(true));
    socket.current?.on('no-offer', () => setHasOffer(false));
  };

  const sendMessage = () => {
    if (dataChannel.current && messageBuffer.trim() !== '') {
      dataChannel.current.send(messageBuffer);
      setReceivedMessages(prev => [...prev, `Me: ${messageBuffer}`]);
      setMessageBuffer('');
    }
  };

  return (
    <WebRTCContext.Provider value={{
      localStream, remoteStream, messageBuffer, receivedMessages, targetUserID, hasOffer,
      setTargetUserID, setMessageBuffer, createOffer, createAnswer, endCall, sendMessage, checkForOffer
    }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error('useWebRTC must be used within a WebRTCProvider');
  return context;
};

export default WebRTCProvider;