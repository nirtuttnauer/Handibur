import React, { useCallback, useEffect } from 'react';
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

const CallScreen: React.FC = () => {
  const {
    targetUserID,
    secondTargetUserID,
    setTargetUserID,
    setSecondTargetUserID,
    createCall,
    createAnswerToCalling,
    endCall,
    resetContext,
  } = useWebRTC();
  
  const { targetUserID: routeTargetUserID, secondTargetUserID: routeSecondTargetUserID } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  useEffect(() => {
    // Set the target user IDs from the route parameters
    if (routeTargetUserID) setTargetUserID(routeTargetUserID as string);
    if (routeSecondTargetUserID) setSecondTargetUserID(routeSecondTargetUserID as string);


    return () => {
      resetContext(); // Cleanup when the component unmounts
    };
  }, [routeTargetUserID, routeSecondTargetUserID]);

  // Handle call rejection
  const handleRejectCall = async () => {
    try {
      endCall(); // End the call locally
      if (router.canGoBack()){
        router.back(); // Navigate back after ending the call

      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject the call. Please try again.');
    }
  };

  const handleCreateCall = useCallback(async (connectionIndex: number = 1) => {
    try {
      await createCall(connectionIndex);
    } catch (error) {
      Alert.alert('Error', 'Failed to create a call. Please try again.');
    }
  }, [createCall]);

  useEffect(() => {
    if (targetUserID) {
      handleCreateCall(1);
    }
  }, [targetUserID, createCall]);
  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.darkBackground : styles.lightBackground]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.controlsContainer}>
          <Text style={styles.callingText}>Calling {targetUserID || '...'}</Text>
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
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 10,
  },
  callingText: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
    marginTop: 20,
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

export default CallScreen;