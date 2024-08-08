import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useWebRTC } from '@/context/WebRTCContext';
import { UserType } from '@/types/UserType';

type InCallScreenProps = {
    targetUser: UserType | null;
  onEndCall: () => void;
};

const InCallScreen: React.FC<InCallScreenProps> = ({ targetUser, onEndCall }) => {
  const { localStream, remoteStream } = useWebRTC();

  return (
    <View style={styles.container}>
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
        <Text style={styles.callingText}>In call with {targetUser?.username}</Text>
        <TouchableOpacity style={styles.button} onPress={onEndCall}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
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
  callingText: {
    fontSize: 22,
    color: '#333',
    marginBottom: 10,
  },
});

export default InCallScreen;