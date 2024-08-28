import React, { useEffect, useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, View, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useWebRTC } from '@/context/WebRTCContext';
import VideoView from '@/components/call/VideoView';
import MessageInput from '@/components/call/MessageInput';
import ChatContainer from '@/components/call/ChatContainer';
import ButtonsContainer from '@/components/call/ButtonsContainer';
import { useColorScheme } from '@/components/useColorScheme';
import { set } from 'date-fns';
import { useAuth } from '@/context/auth';
const CameraScreen: React.FC = () => {
  const {
    localStream,
    remoteStream,
    remoteStream2,
    messageBuffer,
    receivedMessages,
    targetUserID,
    secondTargetUserID,
    setTargetUserID,
    setSecondTargetUserID,
    setMessageBuffer,
    createOffer,
    endCall,
    sendMessage,
    toggleVideo,
    toggleAudio,
    resetContext,
    initializeWebRTC,
    createCall,
    createAnswerToCalling,
    requestServer
  } = useWebRTC();
  
  const [inputText, setInputText] = useState('');
  const { targetUserID: routeTargetUserID } = useLocalSearchParams();
  const { user } = useAuth();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    initializeWebRTC();
    return () => {
      resetContext();
    };
  }, []);



  useEffect(() => {
    if (routeTargetUserID) setTargetUserID(routeTargetUserID as string);
  }, [routeTargetUserID]);



  const handleCreateOffer = useCallback(async (connectionIndex: number = 1) => {
    try {
      await createOffer(connectionIndex);
    } catch (error) {
      Alert.alert('Error', 'Failed to create an offer. Please try again.');
    }
  }, [createOffer]);

  const handleRequestServer = async () => {
    try {
      if (!secondTargetUserID) {
      await requestServer()
      }
      if (secondTargetUserID) {
        handleCreateOffer(2);
      }
    }
    catch (error) {
      console.error('Error requesting server:', error);
      Alert.alert('Error', 'Failed to request server. Please try again.');
    }
  }



  const handleSendMessage = useCallback((connectionIndex: number = 1) => {
    if (messageBuffer.trim() === '') return;
    try {
      sendMessage(connectionIndex);
      setMessageBuffer(''); // Clear the input after sending the message
    } catch (error) {
      Alert.alert('Error', 'Failed to send the message. Please try again.');
    }
  }, [messageBuffer, sendMessage, setMessageBuffer]);


  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.containerDark : styles.containerLight]}>
      <StatusBar backgroundColor={isDarkMode ? '#1c1c1e' : '#f0f0f0'} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.videosContainer}>
        <VideoView 
          streamURL={remoteStream?.toURL()} 
          isDarkMode={isDarkMode} 
          isActive={!!remoteStream2} 
          style={styles.remoteVideo} 
        />
        <VideoView 
          streamURL={localStream?.toURL()} 
          isLocal={true} 
          style={styles.localVideo} 
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.messageInputContainer}
      >
        <ChatContainer 
          message={receivedMessages[receivedMessages.length - 1] || ''} 
          isDarkMode={isDarkMode} 
          style={styles.chatContainer}
        />

        <MessageInput
          value={inputText}
          onChangeText={setInputText}
          onSend={() => { handleSendMessage(1); handleSendMessage(2); }}
          isDarkMode={isDarkMode}
          style={styles.messageInput}
        />

        <ButtonsContainer
          onCreateOffer={() => { handleRequestServer(); }}
          onEndCall={endCall}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          isDarkMode={isDarkMode}
          userId={user?.id}
          style={[
            styles.buttonsContainer, 
            { 
              backgroundColor: isDarkMode ? 'rgba(31, 31, 35, 0.5)' : 'rgba(255, 255, 255, 0.5)' 
            }
          ]}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'space-between',
  },
  containerDark: { 
    backgroundColor: '#0b0b0d',
  },
  containerLight: { 
    backgroundColor: '#f5f5f7',
  },
  videosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#1a1a1d', // Darker background for a futuristic feel
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1, // Layering for the remote video
  },
  localVideo: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 120,
    height: 160,
    zIndex: 2, // Higher zIndex to overlay on top of the remote video
    borderColor: '#fff',
    borderWidth: 1,
  },
  chatContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 4, // Above all elements, for easy chat visibility
    width: '60%',
    maxHeight: '30%',
    borderRadius: 10,
    padding: 10,
  },
  messageInputContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 3, // Above the video streams
    borderRadius: 10,
    padding: 10,
  },
  messageInput: {
    width: '100%',
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 5, // Highest zIndex to make sure buttons are always clickable
    borderRadius: 10,
    padding: 10,
  },
});

export default CameraScreen;