import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWebRTC } from '@/context/WebRTCContext';
import { useColorScheme } from '@/components/useColorScheme';

const AnswerScreen: React.FC = () => {
  const {
    targetUserID,
    secondTargetUserID,
    setTargetUserID,
    setSecondTargetUserID,
    createAnswerToCalling,
    endCall,
    resetContext,
  } = useWebRTC();
  
  const { targetUserID: routeTargetUserID, secondTargetUserID: routeSecondTargetUserID } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    if (routeTargetUserID) setTargetUserID(routeTargetUserID as string);
    return () => {
      resetContext(); // Cleanup when the component unmounts
    };
  }, [routeTargetUserID]);

  const handleAcceptCall = async () => {
    try {
      await createAnswerToCalling('accept');
      router.replace({
        pathname: `/call/${targetUserID}`,
        params: { 
          targetUserID: targetUserID,
        },
      });
    //add some delay to allow the answer to be sent before navigating to the call screen
    } catch (error) {
      console.error('Error accepting the call:', error);
      Alert.alert("Failed to accept the call.");
    }
  };

  const handleRejectCall = async () => {
    try {
      await createAnswerToCalling('reject');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      console.error('Error rejecting the call:', error);
      Alert.alert("Failed to reject the call.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleAcceptCall}>
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleRejectCall}>
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    padding: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  darkBackground: {
    backgroundColor: '#000',
  },
  lightBackground: {
    backgroundColor: '#FFF',
  },
});

export default AnswerScreen;