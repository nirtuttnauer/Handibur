import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
    message: string;
}

export const UserMessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    return (
        <View style={styles.userMessageContainer}>
            <Text style={styles.messageText}>{message}</Text>
        </View>
    );
};

export const OtherMessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    return (
        <View style={styles.otherMessageContainer}>
            <Text style={styles.messageText}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    userMessageContainer: {
        backgroundColor: '#e1ffc7',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        alignSelf: 'flex-end', // Align to the right
    },
    otherMessageContainer: {
        backgroundColor: '#add8e6',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        alignSelf: 'flex-start', // Align to the left
    },
    messageText: {
        fontWeight: 'bold',
    },
});