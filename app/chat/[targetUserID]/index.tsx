import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/context/supabaseClient'; // Adjust the import path accordingly

interface Message {
    id: number;
    text: string;
    sender: string;
}

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [targetUserName, setTargetUserName] = useState<string | null>(null);
    const { targetUserID } = useLocalSearchParams();

    useEffect(() => {
        const fetchTargetUserName = async () => {
            if (targetUserID) {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('username')
                    .eq('user_id', targetUserID) // Adjust the column name to match your schema
                    .single();

                if (error) {
                    console.error('Error fetching target user name:', error);
                } else if (data) {
                    setTargetUserName(data.username);
                }
            }
        };

        fetchTargetUserName();
    }, [targetUserID]);

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

    const handleCall = () => {
        console.log('Call button pressed');
        router.replace(`/call/${targetUserID}`);
    };

    return (
        <View style={styles.container}>
       
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
                <Button onPress={handleCall} title="Call" />

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