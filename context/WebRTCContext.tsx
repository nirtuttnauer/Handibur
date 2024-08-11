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

// WebRTC provider component
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
  const translationDataChannel = useRef<any>(null); // For translation server
  const translationPC = useRef<any>(null); // PeerConnection for translation server
  const { user } = useAuth();
  const router = useRouter();
  const uri = 'https://c06c-2a0d-6fc0-747-bc00-e5a8-cebd-53c-b580.ngrok-free.app/webrtcPeer';
  const translationUri = 'https://your-translation-server-url/agents'; // Replace with your translation server URL

  useEffect(() => {
    if (!socket.current) {
      console.log('Initializing socket connection...');
      socket.current = io(uri, { path: '/io/webrtc', query: { userID: user?.id } });
      // when I connect to the app
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
      connectToTranslationServer(); // Setup translation server connection
    }

    return () => {
      if (socket.current) {
        console.log('Disconnecting socket...');
        socket.current.disconnect();
        socket.current = null;
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
      stream.getTracks().forEach((track: any) => {
        pc.current.addTrack(track, stream);
        if (translationPC.current) {
          translationPC.current.addTrack(track, stream); // Send video track to translation server
        }
      });
    } catch (error) {
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
    console.log('Creating offer...');
    await setupMediaStream();
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
      // Handle ICE candidates for translation server
      if (e.candidate) {
        sendToTranslationServer('candidate', e.candidate);
      }
    };

    translationPC.current.ondatachannel = (event: any) => {
      console.log('Translation server ondatachannel:', event);
      translationDataChannel.current = event.channel;

      translationDataChannel.current.onmessage = (msg: any) => {
        console.log('Translation server message:', msg.data);
        // Update message buffer with the translated text
        setMessageBuffer(msg.data);
      };
    };
    const translationChannel = translationPC.current.createDataChannel('translation');
    translationChannel.onopen = () => console.log('Translation data channel is open');
    translationChannel.onclose = () => console.log('Translation data channel is closed');
    translationChannel.onmessage = (msg: any) => {
      console.log('Translation server message:', msg.data);
      // Update message buffer with the translated text received from the translation server
      setMessageBuffer(msg.data);
    };

    // Create an offer to start the WebRTC connection with the translation server
    translationPC.current.createOffer()
      .then((sdpData: any) => {
        console.log('Created offer for translation server:', sdpData);
        translationPC.current.setLocalDescription(sdpData);

        // Send the offer to the translation server through your signaling mechanism
        fetch(`${translationUri}/offer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sdp: sdpData }),
        })
        .then(response => response.json())
        .then(async (data) => {
          console.log('Received answer from translation server:', data.sdp);
          const remoteSdp = new RTCSessionDescription(data.sdp);
          await translationPC.current.setRemoteDescription(remoteSdp);
        })
        .catch(error => console.error('Error receiving answer from translation server:', error));
      })
      .catch(console.error);
  };

  const sendToTranslationServer = (messageType: string, payload: any) => {
    fetch(`${translationUri}/${messageType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(console.error);
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

    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    sdp.current = null;  // Clear SDP

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