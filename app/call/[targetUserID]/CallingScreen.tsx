import { UserType } from '@/types/UserType';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type CallingScreenProps = {
  targetUser: UserType | null;
  onCancel: () => void;
};

const CallingScreen: React.FC<CallingScreenProps> = ({ targetUser, onCancel }) => {
  return (
    <View style={styles.callingContainer}>
      <Text style={styles.callingText}>
        Calling {targetUser ? targetUser.username : 'User'}...
      </Text>
      <TouchableOpacity style={styles.button} onPress={onCancel}>
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  callingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  callingText: {
    fontSize: 22,
    color: 'white',
  },
  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
});

export default CallingScreen;