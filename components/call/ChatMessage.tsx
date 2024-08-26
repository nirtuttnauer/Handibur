import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatMessageProps {
  message: string;
  isDarkMode: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isDarkMode }) => {
  return (
    <View style={[styles.chatMessage]}>
      <Text style={[styles.messageText, isDarkMode ? styles.messageTextDark : styles.messageTextLight]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chatMessage: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%', // Ensure the container takes the full width
    alignSelf: 'stretch',
    backgroundColor: '#333', // Add a default background color for better visibility
  },
  chatMessageDark: {
    // backgroundColor: '#333',
  },
  chatMessageLight: {
    // backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white', // Ensure the text is visible against the background
  },
  messageTextDark: {
    color: '#ffffff',
  },
  messageTextLight: {
    color: '#000000',
  },
});

export default ChatMessage;