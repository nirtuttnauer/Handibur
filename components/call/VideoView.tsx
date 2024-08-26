import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { RTCView } from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

interface VideoViewProps {
  streamURL?: string;
  isLocal?: boolean;
  isDarkMode?: boolean;
  isActive?: boolean;
}

const VideoView: React.FC<VideoViewProps> = ({ streamURL, isLocal = false, isDarkMode = false, isActive = false }) => {
  if (isLocal) {
    return (
      <View style={styles.localVideoContainer}>
        {streamURL ? (
          <RTCView style={styles.localRtcView} streamURL={streamURL} objectFit="cover" mirror />
        ) : (
          <ActivityIndicator size="large" color="#007aff" />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.remoteVideoContainer,
        isDarkMode ? styles.remoteVideoDark : styles.remoteVideoLight,
        isActive ? styles.remoteVideoActive : null,
      ]}
    >
      {streamURL ? (
        <RTCView style={styles.remoteRtcView} streamURL={streamURL} objectFit="cover" mirror />
      ) : (
        <Text style={[styles.waitingText, isDarkMode ? styles.waitingTextDark : styles.waitingTextLight]}>
          Waiting for peer connection...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  localVideoContainer: {
    position: 'absolute',
    top: 20, // Changed from bottom to top to start higher on the screen
    right: 20,
    width: width * 0.25,
    height: height * 0.3, // Height remains increased to 30% of the screen height
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007aff',
    shadowColor: '#007aff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  remoteVideoContainer: {
    width: width * 0.9,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginVertical: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007aff',
    shadowColor: '#00ff99',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#1a1a1d',
  },
  remoteVideoDark: {
    backgroundColor: '#0d0d0d',
  },
  remoteVideoLight: {
    backgroundColor: '#e0e0e0',
  },
  remoteVideoActive: {
    borderColor: '#00ff99',
    shadowColor: '#00ff99',
  },
  localRtcView: {
    width: '100%',
    height: '100%',
  },
  remoteRtcView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  waitingText: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#cccccc',
  },
  waitingTextDark: {
    color: '#aaaaaa',
  },
  waitingTextLight: {
    color: '#555555',
  },
});

export default VideoView;