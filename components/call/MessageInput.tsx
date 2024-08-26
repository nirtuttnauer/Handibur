import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isDarkMode: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ value, onChangeText, onSend, isDarkMode }) => {
  return (
    <View style={[
      styles.inputContainer,
      isDarkMode ? styles.inputContainerDark : styles.inputContainerLight
    ]}>
      <TextInput
        style={[
          styles.input,
          isDarkMode ? styles.inputDark : styles.inputLight
        ]}
        placeholder="Type a message"
        placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={!value.trim()}>
        <Ionicons name="send" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%', // Ensure the container takes the full width
    alignSelf: 'stretch',
    backgroundColor: '#333', // Add a default background color for better visibility
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  inputDark: {
    backgroundColor: 'transparent',
    color: '#ffffff',
  },
  inputLight: {
    backgroundColor: 'transparent',
    color: '#000000',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007aff',
    padding: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007aff',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

export default MessageInput;