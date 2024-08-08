import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';

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

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>('');
  const sdp = useRef<any>(null);
  const socket = useRef<any>(null);
  const pc = useRef<any>(null);
  const dataChannel = useRef<any>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!socket.current) {
      console.log('Initializing socket connection...');
      socket.current = io('https://6402-2a0d-6fc2-49a3-2000-c9b9-78cc-590-c617.ngrok-free.app/webrtcPeer', { path: '/io/webrtc', query: {} });
      
      socket.current.on('connection-success', (success: any) => {
        console.log('Socket connection successful:', success);
        // Register user ID with the server
        socket.current.emit('register', user?.id);
      });
      
      socket.current.on('offerOrAnswer', (sdpData: any) => {
        console.log('Received offerOrAnswer:', sdpData);
        if (sdpData.from === targetUserID) {
          router.push('/callingscreen');
        }
        sdp.current = JSON.stringify(sdpData);
        pc.current.setRemoteDescription(new RTCSessionDescription(sdpData)).catch(console.error);
        
      });
      
      socket.current.on('candidate', (candidate: any) => {
        console.log('Received candidate:', candidate);
        pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      
      setupWebRTC();
    }
    
    return () => {
      // Cleanup socket connection
      if (socket.current) {
        console.log('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [user?.id, targetUserID]);

  const setupWebRTC = () => {
    console.log('Setting up WebRTC...');
    const pc_config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
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

    mediaDevices.getUserMedia({ audio: true, video: { mandatory: { minWidth: 500, minHeight: 300, minFrameRate: 30 }, facingMode: 'user' } })
      .then((stream: any) => {
        console.log('Received local stream:', stream);
        setLocalStream(stream);
        stream.getTracks().forEach((track: any) => pc.current.addTrack(track, stream));
      }).catch(console.error);

    dataChannel.current = pc.current.createDataChannel('chat');
    dataChannel.current.onopen = () => console.log('Data channel is open');
    dataChannel.current.onclose = () => console.log('Data channel is closed');
    dataChannel.current.onmessage = (msg: any) => {
      console.log('Data channel message:', msg.data);
      setReceivedMessages((prev) => [...prev, `Peer: ${msg.data}`]);
    };
  };

  const sendToPeer = (messageType: string, payload: any) => {
    console.log(`Sending ${messageType}:`, payload);
    socket.current && socket.current.emit(messageType, { targetUserID, payload });
  };

  const createOffer = () => {
    console.log('Creating offer...');
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

  const endCall = () => {
    console.log('Ending call...');
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setRemoteStream(null);
    setLocalStream(null);
    setupWebRTC();
  };

  const sendMessage = () => {
    if (dataChannel.current && messageBuffer.trim() !== '') {
      console.log('Sending message:', messageBuffer);
      dataChannel.current.send(messageBuffer);
      setReceivedMessages((prev) => [...prev, `Me: ${messageBuffer}`]);
      setMessageBuffer('');
    }
  };

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
      sendMessage
    }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export default WebRTCProvider;