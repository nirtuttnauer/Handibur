import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, StatusBar, TouchableOpacity, Dimensions, TextInput, ScrollView, Alert, useColorScheme } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useLocalSearchParams } from 'expo-router';
import { useWebRTC } from '@/context/WebRTCContext';
import { Ionicons } from '@expo/vector-icons';

const dimensions = Dimensions.get('window');

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

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
  } = useWebRTC();

  const { targetUserID: routeTargetUserID, secondTargetUserID: routeSecondTargetUserID } = useLocalSearchParams();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  useEffect(() => {
    initializeWebRTC();
    return () => {
      resetContext();
    };
  }, []);
  
  useEffect(() => {
    if (routeTargetUserID) {
      setTargetUserID(routeTargetUserID as string);
    }
    if (routeSecondTargetUserID) {
      setSecondTargetUserID(routeSecondTargetUserID as string);
    }
    console.log('routeTargetUserID', routeTargetUserID);
    console.log('routeSecondTargetUserID', routeSecondTargetUserID);
  }, [routeTargetUserID, routeSecondTargetUserID]);

  const handleCreateOffer = async (connectionIndex: number = 1) => {
    try {
      await createOffer(connectionIndex);
    } catch (error) {
      Alert.alert('Error', 'Failed to create an offer. Please try again.');
      console.error('Error creating offer:', error);
    }
  };

  const handleSendMessage = (connectionIndex: number = 1) => {
    if (messageBuffer.trim() === '') return;

    try {
      sendMessage(connectionIndex);
      setMessageBuffer(''); // Clear the input after sending the message
    } catch (error) {
      Alert.alert('Error', 'Failed to send the message. Please try again.');
      console.error('Error sending message:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.containerDark : styles.containerLight]}>
      <StatusBar backgroundColor={isDarkMode ? '#1c1c1e' : '#f0f0f0'} barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.videosContainer}>
        <View style={[styles.remoteVideo, isDarkMode ? styles.remoteVideoDark : styles.remoteVideoLight]}>
          {remoteStream ? (
            <RTCView style={styles.rtcViewRemote} streamURL={remoteStream?.toURL()} objectFit="cover" mirror />
          ) : (
            <Text style={[styles.waitingText, isDarkMode ? styles.waitingTextDark : styles.waitingTextLight]}>Waiting for Peer connection...</Text>
          )}
        </View>
        <View style={[styles.remoteVideo, styles.remoteVideoSecond, isDarkMode ? styles.remoteVideoDark : styles.remoteVideoLight]}>
          {remoteStream2 ? (
            <RTCView style={styles.rtcViewRemote} streamURL={remoteStream2?.toURL()} objectFit="cover" mirror />
          ) : (
            <Text style={[styles.waitingText, isDarkMode ? styles.waitingTextDark : styles.waitingTextLight]}>Waiting for Second Peer connection...</Text>
          )}
        </View>
        <View style={styles.localVideo}>
          {localStream && (
            <>
              <RTCView style={styles.rtcView} streamURL={localStream?.toURL()} objectFit="cover" mirror />
            </>
          )}
        </View>
      </View>
      <View style={[styles.buttonsContainer, isDarkMode ? styles.buttonsContainerDark : styles.buttonsContainerLight]}>
        <TouchableOpacity style={styles.button} onPress={() => handleCreateOffer(1)} disabled={!targetUserID}>
          <Ionicons name="call-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Call User 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => handleCreateOffer(2)}>
          <Ionicons name="call-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Call User 2</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={endCall}>
          <Ionicons name="close-outline" size={24} color="white" />
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={toggleVideo}>
          <Ionicons name="videocam-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Toggle Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={toggleAudio}>
          <Ionicons name="mic-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Toggle Audio</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.inputContainer, isDarkMode ? styles.inputContainerDark : styles.inputContainerLight]}>
        <TextInput
          style={[styles.input, isDarkMode ? styles.inputDark : styles.inputLight]}
          placeholder="Type a message"
          placeholderTextColor={isDarkMode ? "#888" : "#666"}
          value={messageBuffer}
          onChangeText={setMessageBuffer}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSendMessage(1)}>
          <Ionicons name="send-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSendMessage(2)}>
          <Ionicons name="send-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.chatContainer, isDarkMode ? styles.chatContainerDark : styles.chatContainerLight]} inverted>
        {receivedMessages.map((msg, idx) => (
          <View key={idx} style={[styles.chatMessage, isDarkMode ? styles.chatMessageDark : styles.chatMessageLight]}>
            <Text style={styles.messageText}>{msg}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerDark: { backgroundColor: '#1c1c1e' },
  containerLight: { backgroundColor: '#f0f0f0' },
  videosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 120,
    height: 180,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rtcView: {
    width: '100%',
    height: '100%',
  },
  remoteVideo: {
    width: '100%',
    height: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoSecond: {
    top: '5%', // Adjust this value as needed to space the second remote video view
  },
  remoteVideoDark: { backgroundColor: '#2c2c2e' },
  remoteVideoLight: { backgroundColor: '#e0e0e0' },
  rtcViewRemote: {
    width: '100%',
    height: '100%',
  },
  waitingText: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  waitingTextDark: { color: '#a1a1a3' },
  waitingTextLight: { color: '#4a4a4c' },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
  },
  buttonsContainerDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#3a3a3c',
  },
  buttonsContainerLight: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007aff',
    borderRadius: 5,
    marginBottom: 10, // Add space between rows
    width: '45%', // Make buttons take half the width
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
  },
  inputContainerDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#3a3a3c',
  },
  inputContainerLight: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginRight: 10,
  },
  inputDark: {
    borderColor: '#4a4a4c',
    color: 'white',
  },
  inputLight: {
    borderColor: '#ccc',
    color: 'black',
  },
  sendButton: {
    padding: 10,
    backgroundColor: '#007aff',
    borderRadius: 5,
  },
  chatContainer: {
    flex: 1,
    padding: 10,
    maxHeight: 120,
  },
  chatContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  chatContainerLight: {
    backgroundColor: '#f0f0f0',
  },
  chatMessage: {
    padding: 10,
    marginTop: 5,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessageDark: {
    backgroundColor: '#2c2c2e',
    color: 'white',
  },
  chatMessageLight: {
    backgroundColor: '#e0e0e0',
    color: 'black',
  },
  messageText: {
    flex: 1,
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginLeft: 10,
  },
});

export default CameraScreen;