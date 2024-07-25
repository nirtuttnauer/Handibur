import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
interface Message {
    id: number;
    text: string;
    sender: string;
}

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');

    const handleSendMessage = () => {
        if (inputText.trim() !== '') {
            const newMessage: Message = {
                id: messages.length + 1,
                text: inputText,
                sender: 'User',
            };

            setMessages([...messages, newMessage]);
            setInputText('');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: true, title: 'Chat', headerBackTitle: 'Back'}}/>
            <ScrollView style={styles.messageContainer}>
                {messages.map((message) => (
                    <View key={message.id} style={styles.message}>
                        <Text>
                            <Text style={styles.sender}>{message.sender}: </Text>
                            {message.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={(text) => setInputText(text)}
                    placeholder="Type your message..."
                    placeholderTextColor="gray"
                />
                <Button title="Send" onPress={handleSendMessage} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 30,
        backgroundColor: '#f5f5f5',
    },
    messageContainer: {
        flex: 1,
        marginBottom: 10,
    },
    message: {
        backgroundColor: '#e1ffc7',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    sender: {
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginRight: 10,
        backgroundColor: 'white',
    },
});

export default Chat;