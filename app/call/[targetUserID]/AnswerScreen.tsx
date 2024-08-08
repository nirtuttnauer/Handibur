import { UserType } from '@/types/UserType';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type AnswerScreenProps = {
  targetUser: UserType | null;
  onAnswer: () => void;
  onReject: () => void;
};

const AnswerScreen: React.FC<AnswerScreenProps> = ({ targetUser, onAnswer, onReject }) => {
  return (
    <View style={styles.answerContainer}>
      <Text style={styles.answerText}>Incoming call from {targetUser?.username}...</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={onAnswer}>
          <Text style={styles.buttonText}>Answer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onReject}>
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  answerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  answerText: {
    fontSize: 22,
    color: 'white',
    marginBottom: 20,
  },
  buttonsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%',
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
});

export default AnswerScreen;