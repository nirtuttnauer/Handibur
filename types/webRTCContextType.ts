export type WebRTCContextType = {
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
  
  export type WebRTCProviderProps = {
    children: React.ReactNode;
  };