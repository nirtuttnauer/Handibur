import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useAuth } from '@/context/auth';
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
  const translationDataChannel = useRef<any>(null);
  const translationPC = useRef<any>(null);
  const translationSocket = useRef<any>(null);
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://44bd-2a0d-6fc0-747-bc00-818b-8d9c-4405-d21.ngrok-free.app/webrtcPeer';
  const translationUri = 'https://3c63-109-186-158-191.ngrok-free.app/agents';
  const candidateQueue = useRef<any[]>([]); // Store candidates temporarily
  useEffect(() => {
    console.log('Target User ID:', targetUserID);
    // Your existing setup code
  }, [targetUserID]);

  useEffect(() => {
    const userId = user?.id;

    if (!socket.current) {
      console.log('Initializing socket connection...');
      socket.current = io(uri, { path: '/io/webrtc', query: { userID: userId } });

      socket.current.on('connection-success', (success: any) => {
        console.log('Socket connection successful:', success);
        socket.current.emit('register', userId);
      });

      socket.current.on('offerOrAnswer', (sdpData: any) => {
        console.log('Received offerOrAnswer:', sdpData);
        handleRemoteSDP(sdpData);
      });

      socket.current.on('candidate', (candidate: any) => {
        console.log('Received candidate:', candidate);
        addIceCandidate(candidate);
      });

      socket.current.on('endCall', () => {
        console.log('Received endCall signal');
        endCall();
      });

      setupWebRTC();
    }

    if (!translationSocket.current) {
      console.log('Initializing translation socket connection...');
      translationSocket.current = io(translationUri, {
        path: '/io/webrtc',
        auth: {
          userID: userId,
          role: 'user'
        }
      });

      translationSocket.current.on('connection-success', (success: any) => {
        console.log('Translation server connection successful:', success);
      });

      translationSocket.current.on('translation-offerOrAnswer', async (data: any) => {
        console.log('Received offerOrAnswer from translation server:', data.sdp);
        const remoteSdp = new RTCSessionDescription(data.sdp);
        await translationPC.current.setRemoteDescription(remoteSdp);
      });

      translationSocket.current.on('translation-candidate', (candidate: any) => {
        console.log('Received candidate from translation server:', candidate);
        if (translationPC.current) {
          translationPC.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      });

      translationSocket.current.on('endTranslationCall', () => {
        console.log('Received end call signal from translation server');
        endCall();
      });

      connectToTranslationServer();
    }

    return () => {
      if (socket.current) {
        console.log('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
      }

      if (translationSocket.current) {
        console.log('Disconnecting translation socket...');
        translationSocket.current.disconnect();
        translationSocket.current = null;
      }

      if (translationPC.current) {
        console.log('Closing translation connection...');
        translationPC.current.close();
        translationPC.current = null;
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
      if (e.candidate) {
        sendToPeer('candidate', e.candidate);
      }
    };

    pc.current.oniceconnectionstatechange = (e: any) => {
      console.log('oniceconnectionstatechange:', e);
    };

    pc.current.ontrack = (e: any) => {
      console.log('ontrack:', e);
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
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
      if (!pc.current) {
        console.error('RTCPeerConnection is not initialized');
        return;
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500,
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: 'user',
        },
      });

      console.log('Received local stream:', stream);
      setLocalStream(stream);

      stream.getTracks().forEach((track: any) => {
        if (pc.current) {
          pc.current.addTrack(track, stream);
        }

        if (translationPC.current) {
          translationPC.current.addTrack(track, stream);
        }
      });
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  };

  const sendToPeer = (messageType: string, payload: any) => {
    if (!targetUserID || targetUserID.trim() === '') {
      console.warn('targetUserID is not set. Cannot send message.');
      return;
    }
  
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload:', payload);
      return;
    }
  
    console.log(`Sending ${messageType} to ${targetUserID}:`, payload);
    if (socket.current) {
      socket.current.emit(messageType, { targetUserID, ...payload });
    }
  };

  const handleRemoteSDP = async (sdpData: any) => {
    try {
      if (pc.current.signalingState === "stable" && sdpData.type === "offer") {
        await setupMediaStream();
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));
        createAnswer();

        // Process any queued candidates
        candidateQueue.current.forEach(candidate => pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error));
        candidateQueue.current = []; // Clear the queue after processing
      } else if (pc.current.signalingState === "have-local-offer" && sdpData.type === "answer") {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdpData));

        // Process any queued candidates
        candidateQueue.current.forEach(candidate => pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error));
        candidateQueue.current = []; // Clear the queue after processing
      }
    } catch (error) {
      console.error('Error setting remote SDP:', error);
    }
  };

  const addIceCandidate = (candidate: any) => {
    if (pc.current?.remoteDescription && pc.current.remoteDescription.type) {
      // If the remote description is set, immediately add the ICE candidate
      pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    } else {
      // Otherwise, queue the candidate for later processing
      console.log('Queuing ICE candidate:', candidate);
      candidateQueue.current.push(candidate);
    }
  };

  const createOffer = async () => {
    await createPeerOffer();
    
    const translationSdpData = await createTranslationOffer();
    if (translationSdpData) {
      await sendToTranslation(translationSdpData);
    }
  };
  
  const createAnswer = async () => {
    await createPeerAnswer();
    
    const translationSdpData = await createTranslationAnswer();
    if (translationSdpData) {
      await sendToTranslation(translationSdpData);
    }
  };

  const createPeerOffer = async () => {
    console.log('Creating offer for peer connection...');
    
    try {
      // Ensure WebRTC and media stream are set up
      setupWebRTC();
      await setupMediaStream();
  
      // Create the WebRTC offer for the main peer connection
      const sdpData = await pc.current.createOffer({ offerToReceiveVideo: 1 });
      console.log('Created offer:', sdpData);
      
      // Set the local description with the created offer
      await pc.current.setLocalDescription(sdpData);
  
      // Send the offer to the peer via signaling server
      sendToPeer('offerOrAnswer', { sdp: sdpData.sdp, type: sdpData.type });
    } catch (error) {
      console.error('Error creating peer offer:', error);
    }
  };

  const createTranslationOffer = async () => {
    console.log('Creating offer for translation server...');
    
    try {
      // Check if translation peer connection is initialized
      if (translationPC.current) {
        // Create the WebRTC offer for the translation server
        const translationSdpData = await translationPC.current.createOffer({ offerToReceiveVideo: 1 });
        console.log('Created translation offer:', translationSdpData);
        
        // Set the local description with the created offer
        await translationPC.current.setLocalDescription(translationSdpData);
  
        return translationSdpData;
      } else {
        console.warn('Translation peer connection is not initialized.');
      }
    } catch (error) {
      console.error('Error creating translation offer:', error);
    }
    return null;
  };

  const sendToTranslation = async (translationSdpData: any) => {
    console.log('Sending SDP to translation server...');
    
    try {
      // Check if translation socket is initialized
      if (translationSocket.current && translationSdpData) {
        // Emit the SDP data to the translation server via the signaling server
        translationSocket.current.emit('offerOrAnswer', {
          sdp: translationSdpData.sdp,
          type: translationSdpData.type,
          from: user.id,  // Include user ID or other relevant information if needed
        });
      } else {
        console.warn('Translation socket is not initialized or no SDP data provided.');
      }
    } catch (error) {
      console.error('Error sending SDP to translation server:', error);
    }
  };

  const createTranslationAnswer = async () => {
    console.log('Creating answer for translation server...');
    
    try {
      // Check if translation peer connection is initialized
      if (translationPC.current) {
        // Create the WebRTC answer for the translation server
        const translationSdpData = await translationPC.current.createAnswer({ offerToReceiveVideo: 1 });
        console.log('Created translation answer:', translationSdpData);
        
        // Set the local description with the created answer
        await translationPC.current.setLocalDescription(translationSdpData);
  
        return translationSdpData;
      } else {
        console.warn('Translation peer connection is not initialized.');
      }
    } catch (error) {
      console.error('Error creating translation answer:', error);
    }
    return null;
  };


  const createPeerAnswer = async () => {
    console.log('Creating answer for peer connection...');
    
    try {
      // Create the WebRTC answer for the main peer connection
      const sdpData = await pc.current.createAnswer({ offerToReceiveVideo: 1 });
      console.log('Created answer:', sdpData);
      
      // Set the local description with the created answer
      await pc.current.setLocalDescription(sdpData);
  
      // Send the answer to the peer via signaling server
      sendToPeer('offerOrAnswer', { sdp: sdpData.sdp, type: sdpData.type });
    } catch (error) {
      console.error('Error creating peer answer:', error);
    }
  };

  const connectToTranslationServer = () => {
    console.log('Connecting to translation server...');
    const pc_config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    };

    translationPC.current = new RTCPeerConnection(pc_config);

    translationPC.current.onicecandidate = (e: any) => {
      console.log('Translation server onicecandidate:', e);
      if (e.candidate && translationDataChannel.current?.readyState === 'open') {
        translationDataChannel.current.send(JSON.stringify({ candidate: e.candidate }));
      }
    };

    translationPC.current.ondatachannel = (event: any) => {
      console.log('Translation server ondatachannel:', event);
      translationDataChannel.current = event.channel;

      translationDataChannel.current.onmessage = async (msg: any) => {
        const data = JSON.parse(msg.data);
        if (data.sdp) {
          console.log('Received SDP from translation server:', data.sdp);
          const remoteSdp = new RTCSessionDescription(data.sdp);
          await translationPC.current.setRemoteDescription(remoteSdp);
        } else if (data.candidate) {
          console.log('Received ICE candidate from translation server:', data.candidate);
          await translationPC.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
    };

    const translationChannel = translationPC.current.createDataChannel('signaling');

    translationChannel.onopen = () => {
      console.log('Translation signaling data channel is open');
      translationPC.current.createOffer()
        .then(async (sdpData: RTCSessionDescriptionInit) => {
          console.log('Created offer for translation server:', sdpData);
          await translationPC.current.setLocalDescription(sdpData);
          translationChannel.send(JSON.stringify({ sdp: sdpData.sdp, type: sdpData.type }));
        })
        .catch(console.error);
    };

    translationChannel.onclose = () => console.log('Translation signaling data channel is closed');
  };

  const endCall = () => {
    console.log('Ending call...');
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

    if (translationPC.current) {
      translationPC.current.close();
      translationPC.current = null;
    }
    if (translationDataChannel.current) {
      translationDataChannel.current.close();
      translationDataChannel.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    sdp.current = null;

    setTargetUserID('');

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