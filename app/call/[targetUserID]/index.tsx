// /app/chat/[targetUserID]/index.tsx
import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, StatusBar, TouchableOpacity, Dimensions, TextInput, ScrollView } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useLocalSearchParams } from 'expo-router';
import { useWebRTC } from '@/context/WebRTCContext';

const dimensions = Dimensions.get('window');

const CameraScreen: React.FC = () => {
  const { localStream, remoteStream, messageBuffer, receivedMessages, targetUserID, setTargetUserID, setMessageBuffer, createOffer, createAnswer, endCall, sendMessage } = useWebRTC();
  const { targetUserID: routeTargetUserID } = useLocalSearchParams();

  useEffect(() => {
    if (routeTargetUserID) {
      setTargetUserID(routeTargetUserID as string);
    }
  }, [routeTargetUserID]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="blue" barStyle="light-content" />
      <View style={styles.videosContainer}>
        <View style={styles.remoteVideo}>
          {remoteStream ? (
            <RTCView style={styles.rtcViewRemote} streamURL={remoteStream.toURL()} objectFit="cover" mirror />
          ) : (
            <Text style={styles.waitingText}>Waiting for Peer connection...</Text>
          )}
        </View>
        <View style={styles.localVideo}>
          {localStream && (
            <RTCView style={styles.rtcView} streamURL={localStream.toURL()} objectFit="cover" mirror />
          )}
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={createOffer}>
          <Text style={styles.buttonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={createAnswer}>
          <Text style={styles.buttonText}>Answer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={endCall}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Target User ID" placeholderTextColor="#888" value={targetUserID} onChangeText={setTargetUserID} />
        <TextInput style={styles.input} placeholder="Type a message" placeholderTextColor="#888" value={messageBuffer} onChangeText={setMessageBuffer} />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.chatContainer}>
        {receivedMessages.map((msg, idx) => (
          <Text key={idx} style={styles.chatMessage}>{msg}</Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  videosContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative', // Allow positioning of the local video
  },
  localVideo: { 
    position: 'absolute', 
    bottom: 20, 
    right: 20, 
    width: 120, 
    height: 180, 
    backgroundColor: 'black', 
    borderRadius: 10, 
    overflow: 'hidden' 
  },
  rtcView: { 
    width: '100%', 
    height: '100%' 
  },
  remoteVideo: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'black' 
  },
  rtcViewRemote: { 
    width: '100%', 
    height: '100%' 
  },
  waitingText: { 
    fontSize: 22, 
    textAlign: 'center', 
    color: 'white' 
  },
  buttonsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    padding: 15, 
    backgroundColor: 'white' 
  },
  button: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    backgroundColor: '#007AFF', 
    borderRadius: 5 
  },
  buttonText: { 
    fontSize: 18, 
    color: 'white', 
    textAlign: 'center' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderColor: '#ddd' 
  },
  input: { 
    flex: 1, 
    height: 40, 
    borderColor: 'gray', 
    borderWidth: 1, 
    borderRadius: 5, 
    paddingLeft: 10, 
    marginRight: 10 
  },
  sendButton: { 
    padding: 10, 
    backgroundColor: '#007AFF', 
    borderRadius: 5 
  },
  chatContainer: { 
    flex: 1, 
    padding: 10 
  },
  chatMessage: { 
    padding: 10, 
    backgroundColor: '#f1f1f1', 
    marginTop: 5, 
    borderRadius: 5 
  },
});

export default CameraScreen;