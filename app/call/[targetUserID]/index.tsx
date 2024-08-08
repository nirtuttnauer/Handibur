import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useWebRTC } from '@/context/WebRTCContext';
import CallingScreen from './CallingScreen';
import InCallScreen from './InCallScreen';
import AnswerScreen from './AnswerScreen';
import { supabase } from '@/context/supabaseClient'; // Make sure to import your Supabase client
import { UserType } from '@/types/UserType';

const CameraScreen: React.FC = () => {
  const { remoteStream, targetUserID, setTargetUserID, createOffer, createAnswer, endCall } = useWebRTC();
  const { targetUserID: routeTargetUserID } = useLocalSearchParams();
  const [calling, setCalling] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false); // State to handle incoming calls
  const [targetUser, setTargetUser] = useState<UserType | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (routeTargetUserID) {
      setTargetUserID(routeTargetUserID as string);
      fetchUserDetails(routeTargetUserID as string);
    }
  }, [routeTargetUserID]);

  useEffect(() => {
    if (remoteStream) {
      setInCall(true);
      setCalling(false);
    }
  }, [remoteStream]);

  const fetchUserDetails = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user details:', error);
    } else {
      setTargetUser({
        ...data,
      });
    }
  };

  const handleCall = () => {
    setCalling(true);
    createOffer();
  };

  const handleAnswer = () => {
    setIncomingCall(false);
    setCalling(false);
    createAnswer();
  };

  const handleEndCall = () => {
    setInCall(false);
    setCalling(false);
    setIncomingCall(false);
    endCall();
  };

  useEffect(() => {
    // Listen for incoming calls and navigate to AnswerScreen
    const handleIncomingCall = () => {
      setIncomingCall(true);
    };

    // Assuming you have a way to listen for incoming calls, like a socket event
    // socket.on('incoming-call', handleIncomingCall);

    return () => {
      // Clean up the event listener
      // socket.off('incoming-call', handleIncomingCall);
    };
  }, [router]);

  useEffect(() => {
    if (!calling && !inCall && !incomingCall) {
      router.back(); // Change '/home' to the desired route
    }
  }, [calling, inCall, incomingCall, router]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar backgroundColor="blue" barStyle="light-content" />
      {incomingCall ? (
        <AnswerScreen targetUser={targetUser} onAnswer={handleAnswer} onReject={handleEndCall} />
      ) : calling ? (
        <CallingScreen targetUser={targetUser} onCancel={handleEndCall} />
      ) : inCall ? (
        <InCallScreen targetUser={targetUser} onEndCall={handleEndCall} />
      ) : (
        // No need for placeholder here as it will navigate to '/home'
        null
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  initialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  initialText: {
    fontSize: 18,
    color: '#333',
  },
});

export default CameraScreen;