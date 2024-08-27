import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "@/context/auth";
import { usePathname, useRouter } from "expo-router";
import { WebRTCContextType } from "@/types/webRTCContextType";
import { WebRTCManager } from "./webrtcManager";
import { MediaStream } from "react-native-webrtc";

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
  const socket = useRef<Socket | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const uri = "https://4f61fabc665a.ngrok.app";

  useEffect(() => {
    initializeWebRTC();
    const callCheckInterval = setInterval(() => {
      checkCallingStatus();
    }, 3000);

    return () => {
      cleanupSocket();
      clearInterval(callCheckInterval);
    };
  }, [user?.id, targetUserID, secondTargetUserID]);

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
        if (webrtcManager.current) {
          await webrtcManager.current.handleRemoteSDP(
            sdpData,
            sdpData.from === targetUserID ? 1 : 2
          );
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

    socket.current?.on(
      "callingStatus",
      (data: { isBeingCalled: boolean; from?: string }) => {
        if (data.isBeingCalled && data.from) {
          const isOnCallScreen = pathname.startsWith("/call");

          if (!isOnCallScreen) {
            setTargetUserID(data.from);
            router.push({
              pathname: "/call/[targetUserID]/answering",
              params: { 
                targetUserID: data.from,
                secondTargetUserID: "123",
               },
            });
          }
        }
      }
    );

    socket.current.on(
      "callResponse",
      async (data: { decision: "accept" | "reject"; from: string }) => {
        if (data.decision === "accept") {
          router.replace({
            pathname: `/call/${data.from}`,
            params: { 
              targetUserID: data.from,
              answer: "true",
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
          createOffer(1);
        } else {
          console.log(`User ${data.from} rejected the call.`);
          endCall();
          resetContext();
        }
      }
    );
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
      (sdp, pcIndex) => sendToPeer("offerOrAnswer", sdp, pcIndex),
      () => sendEndCall(),
      targetUserID,
      secondTargetUserID
    );

    webrtcManager.current = manager;
  };

  const sendToPeer = (
    messageType: string,
    payload: any,
    connectionIndex: number = 1
  ) => {
    if (!user?.id) {
      console.error("Cannot send message: User ID is undefined");
      return;
    }
    const targetID = connectionIndex === 1 ? targetUserID : secondTargetUserID;
    socket.current?.emit(messageType, {
      targetUserID: targetID,
      from: user.id,
      connectionIndex,
      ...payload,
    });
  };

  const createCall = async (connectionIndex: number = 1) => {
    try {
      let targetID;
      if (connectionIndex === 1) {
        targetID = targetUserID;
      } else if (connectionIndex === 2) {
        targetID = secondTargetUserID;
      }

      if (!targetID) {
        console.error("Cannot initiate call: Target user ID is undefined");
        return;
      }

      const payload = {
        targetUserID: targetID,
        from: user?.id,
      };

      sendToPeer("calling", payload, connectionIndex);
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  };

  const createOffer = async (connectionIndex: number = 1) => {
    setSecondTargetUserID("123");
    // if (
    //   (!targetUserID && connectionIndex === 1) ||
    //   (!secondTargetUserID && connectionIndex === 2)
    // ) {
    //   console.error(
    //     "Cannot initiate call: targetUserID or secondTargetUserID is undefined"
    //   );
    //   return;
    // }
    try {
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
      const answer = await webrtcManager.current?.createAnswer(connectionIndex);
      if (answer) {
        sendToPeer("offerOrAnswer", answer, connectionIndex);
      }
    } catch (error) {
      console.error("Error creating answer:", error);
    }
  };

  const createAnswerToCalling = async (
    decision: "accept" | "reject",
    connectionIndex: number = 1
  ) => {
    try {
      let targetID;
      if (connectionIndex === 1) {
        targetID = targetUserID;
      } else if (connectionIndex === 2) {
        targetID = secondTargetUserID;
      }

      if (!targetID) {
        console.error("Cannot respond to call: Target user ID is undefined");
        return;
      }

      sendToPeer("answerToCall", { targetUserID: targetID, decision }, connectionIndex);

      if (decision === "accept") {
        await createOffer(connectionIndex);
      } else {
        console.log("Call rejected.");
      }
    } catch (error) {
      console.error("Error responding to call:", error);
    }
  };

  const endCall = async () => {
    await webrtcManager.current?.endCall();
    webrtcManager.current = null;
    router.back();
  };

  const sendEndCall = async () => {
    if (!user?.id) {
      console.error("Cannot send end call: User ID is undefined");
      return;
    }
    socket.current?.emit("endCall", { targetUserID, from: user.id });
    socket.current?.emit("endCall", { targetUserID: secondTargetUserID, from: user.id });
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