import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  messageBuffer: string;
  receivedMessages: string[];
  targetUserID: string;
  hasOffer: boolean;
  setTargetUserID: (id: string) => void;
  setMessageBuffer: (message: string) => void;
  createOffer: () => void;
  createAnswer: () => void;
  endCall: () => void;
  sendMessage: () => void;
  checkForOffer: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>('');
  const [hasOffer, setHasOffer] = useState<boolean>(false);
  const socket = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://6402-2a0d-6fc2-49a3-2000-c9b9-78cc-590-c617.ngrok-free.app/webrtcPeer';

  useEffect(() => {
    socket.current = io(uri, { path: '/io/webrtc', query: { userID: user?.id } });
    socket.current.on('connection-success', checkForOffer);
    socket.current.on('offerOrAnswer', (sdpData: RTCSessionDescriptionInit) => {
      handleRemoteSDP(sdpData);
      setHasOffer(false);
    });
    socket.current.on('candidate', (candidate: RTCIceCandidateInit) => {
      pc.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    });
    socket.current.on('endCall', endCall);
    socket.current.on('disconnect', () => socket.current?.connect());
    setupWebRTC();
    return () => {
      socket.current?.disconnect();
      socket.current = null;
    };
  }, [user?.id, targetUserID]);

  useEffect(() => {
    const interval = setInterval(checkForOffer, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasOffer && targetUserID) router.push(`/call/${targetUserID}`);
  }, [hasOffer, targetUserID]);

  const setupWebRTC = () => {
    pc.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.current.onicecandidate = (e) => e.candidate && sendToPeer('candidate', e.candidate);
    pc.current.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.current.ondatachannel = (event) => {
      event.channel.onmessage = (msg) => setReceivedMessages((prev) => [...prev, `Peer: ${msg.data}`]);
    };
    dataChannel.current = pc.current.createDataChannel('chat');
    dataChannel.current.onmessage = (msg) => setReceivedMessages((prev) => [...prev, `Peer: ${msg.data}`]);
  };

  const setupMediaStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: { mandatory: { minWidth: 500, minHeight: 300, minFrameRate: 30 }, facingMode: 'user' } });
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  };

  const sendToPeer = (messageType: string, payload: any) => {
    if (targetUserID) socket.current?.emit(messageType, { targetUserID, payload });
    else console.error('Target User ID is not set');
  };

  const handleRemoteSDP = async (sdpData: RTCSessionDescriptionInit) => {
    try {
      if (pc.current?.signalingState === 'stable' && sdpData.type === 'offer') {
        await setupMediaStream();
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
        createAnswer();
      } else if (pc.current?.signalingState === 'have-local-offer' && sdpData.type === 'answer') {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
      }
    } catch (error) {
      console.error('Error setting remote SDP:', error);
    }
  };

  const createOffer = async () => {
    if (!targetUserID) return console.error('Target User ID is not set');
    await setupMediaStream();
    const sdpData = await pc.current?.createOffer({ offerToReceiveVideo: 1 });
    if (sdpData) {
      await pc.current?.setLocalDescription(sdpData);
      sendToPeer('offerOrAnswer', sdpData);
    }
  };

  const createAnswer = async () => {
    if (!targetUserID) return console.error('Target User ID is not set');
    const sdpData = await pc.current?.createAnswer({ offerToReceiveVideo: 1 });
    if (sdpData) {
      await pc.current?.setLocalDescription(sdpData);
      sendToPeer('offerOrAnswer', sdpData);
    }
  };

  const endCall = () => {
    pc.current?.close();
    dataChannel.current?.close();
    socket.current?.emit('endCall', { targetUserID });
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setHasOffer(false);
    setReceivedMessages([]);
    setMessageBuffer('');
    setTargetUserID(''); // Reset targetUserID
    router.back();
    setupWebRTC();
  };

  const checkForOffer = () => {
    socket.current?.emit('check-offer');
    socket.current?.on('pending-offer', ({ senderID }: { senderID: string }) => {
      setTargetUserID(senderID);
      setHasOffer(true);
    });
    socket.current?.on('no-offer', () => setHasOffer(false));
  };

  const sendMessage = () => {
    if (dataChannel.current && messageBuffer.trim()) {
      dataChannel.current.send(messageBuffer);
      setReceivedMessages((prev) => [...prev, `Me: ${messageBuffer}`]);
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