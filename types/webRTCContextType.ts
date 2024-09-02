// Define the WebRTCContextType with all necessary types
export type WebRTCContextType = {
  localStream: any; // MediaStream type for the local stream
  remoteStream: any; // MediaStream type for the first remote stream
  remoteStream2: any; // MediaStream type for the second remote stream
  messageBuffer: string; // The current message buffer content
  receivedMessages: string[]; // Array of received messages
  targetUserID: string; // The ID of the target user for the first connection
  secondTargetUserID: string; // The ID of the target user for the second connection
  setTargetUserID: (id: string) => void; // Function to set the first target user ID
  setSecondTargetUserID: (id: string) => void; // Function to set the second target user ID
  setMessageBuffer: (message: string) => void; // Function to set the message buffer content
  createOffer: (connectionIndex?: number) => Promise<void>; // Function to create an offer, with an optional connection index
  createAnswer: (connectionIndex?: number) => Promise<void>; // Function to create an answer, with an optional connection index
  createAnswerToCalling: (answer: 'accept' | 'reject') => Promise<void>; // Function to create an answer to a calling request
  endCall: () => Promise<void>; // Function to end the call
  sendMessage: (connectionIndex?: number) => void; // Function to send a message, with an optional connection index
  toggleVideo: () => void; // Function to toggle the local video track on/off
  toggleAudio: () => void; // Function to toggle the local audio track on/off
  resetContext: () => void; // Function to reset the WebRTC context
  initializeWebRTC: () => void; // Function to initialize WebRTC
  createCall: (connectionIndex?: number) => Promise<void>; // Function to create a call
  requestServer: () => void; // Function to request the server
  
};

// Define the props for the WebRTCProvider component
export type WebRTCProviderProps = {
  children: React.ReactNode;
};
