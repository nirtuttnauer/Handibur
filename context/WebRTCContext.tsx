import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';
import { WebRTCContextType } from '@/types/webRTCContextType';
import { WebRTCManager } from './webrtcManager';
import { MediaStream } from 'react-native-webrtc';

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messageBuffer, setMessageBuffer] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [targetUserID, setTargetUserID] = useState<string>('');
  const socket = useRef<Socket | null>(null);
  const agentSocket = useRef<Socket | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://44bd-2a0d-6fc0-747-bc00-818b-8d9c-4405-d21.ngrok-free.app';

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(uri + "/webrtcPeer", { path: '/io/webrtc', query: { userID: user?.id } });

      socket.current.on('connection-success', (success: any) => {
        socket.current?.emit('register', user?.id);
      });

      socket.current.on('offerOrAnswer', async (sdpData: any) => {
        try {
          const answer = await webrtcManager.current?.handleRemoteSDP(sdpData);
          if (answer) {
            sendToPeer('offerOrAnswer', answer);
          }
        } catch (error) {
          console.error('Error handling SDP:', error);
        }
      });

      socket.current.on('candidate', (candidate: any) => {
        webrtcManager.current?.handleIceCandidate(candidate);
      });

      socket.current.on('endCall', () => {
        endCall();
      });

      setupWebRTC(targetUserID);
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [user?.id, targetUserID]);

  const setupWebRTC = (targetUserID: string) => {
    webrtcManager.current = new WebRTCManager(
      (candidate) => sendToPeer('candidate', candidate),
      (remoteStream) => setRemoteStream(remoteStream),
      (message) => setReceivedMessages((prev) => [...prev, `Peer: ${message}`]),
      (localStream) => setLocalStream(localStream), // Callback for setting the local stream
      (sdp) => sendToPeer('offerOrAnswer', sdp), // Callback for handling SDP offer/answer
      targetUserID, // Pass the target user ID
    );
  };

  const sendToPeer = (messageType: string, payload: any) => {
    socket.current?.emit(messageType, { targetUserID, ...payload });
  };

  const createOffer = async () => {
    if (!targetUserID) {
      console.error('Cannot initiate call: targetUserID is undefined');
      return;
    }
    
    try {
      const offer = await webrtcManager.current?.createOffer();
      if (offer) {
        sendToPeer('offerOrAnswer', offer);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const createAnswer = async () => {
    try {
      const answer = await webrtcManager.current?.createAnswer();
      if (answer) {
        sendToPeer('offerOrAnswer', answer);
      }
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  };

  const endCall = () => {
    webrtcManager.current?.endCall();
    router.back();
  };

  const sendMessage = () => {
    if (messageBuffer.trim() !== '') {
      webrtcManager.current?.sendMessage(messageBuffer);
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