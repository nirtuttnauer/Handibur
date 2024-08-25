import React from 'react';
import { View, StyleSheet } from 'react-native';
import ChatMessage from './ChatMessage';

interface ChatContainerProps {
  message: string;
  isDarkMode: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ message, isDarkMode }) => {
  return (
    <View style={styles.chatContainer}>
      <ChatMessage message={message} isDarkMode={isDarkMode} />
    </View>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    padding: 10,
    marginHorizontal: 0, // Removed horizontal margin to allow full width
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3, // For Android shadow support
    width: '100%', // Ensure it takes up the full width
    alignSelf: 'stretch', // Make sure it stretches to fill its parent
  },
});

export default ChatContainer;