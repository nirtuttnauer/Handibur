import React, { useState, useEffect } from 'react';
import { TextInput, Button, StyleSheet } from 'react-native';
import { View } from '@/components/Themed';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FlashList } from '@shopify/flash-list';
import { UserMessageBubble, OtherMessageBubble } from './MessageBubbles'; // Import the new components

interface Message {
    message_id: number;
    content: string;
    sender_id: string;
    sent_at: string;
}

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const { targetUserID } = useLocalSearchParams();
    const { user } = useAuth(); 
    const currentUserUUID = user?.id;

    useEffect(() => {
        let subscription: RealtimeChannel | null = null;

        const loadMessages = async () => {
            try {
                const { data: room, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select('room_id')
                    .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                    .single();

                if (roomError) {
                    if (roomError.code !== 'PGRST116') {
                        console.error('Error finding chat room:', roomError.message);
                    }
                    return;
                }

                const roomID = room.room_id;

                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('room_id', roomID)
                    .order('sent_at', { ascending: true });

                if (messagesError) {
                    console.error('Error loading messages:', messagesError.message);
                } else {
                    setMessages(messagesData || []);
                }

                subscription = supabase
                    .channel('public:messages')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'messages',
                            filter: `room_id=eq.${roomID}`
                        },
                        (payload) => {
                            setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
                        }
                    )
                    .subscribe();

            } catch (error: any) {
                console.error('Error loading messages:', error.message);
            }
        };

        loadMessages();

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [targetUserID, currentUserUUID]);

    const handleSendMessage = async () => {
        if (inputText.trim() !== '') {
            try {
                let roomID;

                const { data: existingRoom, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select('room_id')
                    .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                    .single();

                if (roomError && roomError.code !== 'PGRST116') {
                    console.error('Error checking chat room:', roomError.message);
                    return;
                }

                if (existingRoom) {
                    roomID = existingRoom.room_id;
                } else {
                    const { data: newRoom, error: newRoomError } = await supabase
                        .from('chat_rooms')
                        .insert([
                            {
                                user1_id: currentUserUUID,
                                user2_id: targetUserID,
                            },
                        ])
                        .select('room_id')
                        .single();

                    if (newRoomError) {
                        console.error('Error creating chat room:', newRoomError.message);
                        return;
                    }

                    roomID = newRoom.room_id;
                }

                const newMessage = {
                    room_id: roomID,
                    sender_id: currentUserUUID,
                    receiver_id: targetUserID,
                    content: inputText,
                };

                const { data: insertedMessage, error: messageError } = await supabase
                    .from('messages')
                    .insert([newMessage])
                    .select()
                    .single();

                if (messageError) {
                    console.error('Error sending message:', messageError.message);
                    return;
                }

                setInputText('');
            } catch (error: any) {
                console.error('Error in handleSendMessage:', error.message);
            }
        }
    };

    return (
        <View style={styles.container}>
            <FlashList
                data={messages}
                renderItem={({ item }) => (
                    item.sender_id === currentUserUUID ? (
                        <UserMessageBubble key={item.message_id} message={item.content} />
                    ) : (
                        <OtherMessageBubble key={item.message_id} message={item.content} />
                    )
                )}
                estimatedItemSize={50}
                keyExtractor={(item) => item.message_id.toString()}
            />
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