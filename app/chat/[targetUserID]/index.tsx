import React, { useState, useEffect } from 'react';
import { TextInput, Button, StyleSheet, Alert } from 'react-native';
import { View } from '@/components/Themed';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FlashList } from '@shopify/flash-list';
import { UserMessageBubble, OtherMessageBubble } from './MessageBubbles';
import AsyncStorage from '@react-native-async-storage/async-storage';  // Updated import

interface Message {
    message_id: number;
    content: string;
    sender_id: string;
    sent_at: string;
    status?: string; // Added status field
}

const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";  // Consistent placeholder

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);  // Track which message is being edited
    const { targetUserID } = useLocalSearchParams();
    const { user } = useAuth(); 
    const currentUserUUID = user?.id;
    const [deletedForMe, setDeletedForMe] = useState<number[]>([]);

    useEffect(() => {
        const loadDeletedMessages = async () => {
            try {
                const storedDeletedMessages = await AsyncStorage.getItem(`deletedMessages_${currentUserUUID}_${targetUserID}`);
                if (storedDeletedMessages) {
                    setDeletedForMe(JSON.parse(storedDeletedMessages));
                }
            } catch (error) {
                console.error('Error loading deleted messages:', error);
            }
        };
    
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
    
                // Set up the real-time subscription
                subscription = supabase
                    .channel(`public:messages:room_id=eq.${roomID}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'messages',
                            filter: `room_id=eq.${roomID}`
                        },
                        (payload) => {
                            if (payload.eventType === 'INSERT') {
                                setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
                            } else if (payload.eventType === 'UPDATE') {
                                setMessages((currentMessages) => 
                                    currentMessages.map(message =>
                                        message.message_id === payload.new.message_id ? payload.new as Message : message
                                    )
                                );
                            }
                        }
                    )
                    .subscribe();

                // Load initial message statuses
                const { data: statusData, error: statusError } = await supabase
                    .from('message_status')
                    .select('*')
                    .in('message_id', messagesData.map((msg) => msg.message_id));

                if (statusError) {
                    console.error('Error loading message statuses:', statusError.message);
                } else {
                    setMessages((currentMessages) => currentMessages.map(message => {
                        const status = statusData.find(status => status.message_id === message.message_id)?.status;
                        return { ...message, status };
                    }));
                }

            } catch (error: any) {
                console.error('Error loading messages:', error.message);
            }
        };
    
        loadDeletedMessages();
        loadMessages();
    
        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [targetUserID, currentUserUUID]);

    useEffect(() => {
        const markMessagesAsRead = async () => {
            const roomID = (await supabase
                .from('chat_rooms')
                .select('room_id')
                .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                .single()).data.room_id;

            const { data: messagesToUpdate } = await supabase
                .from('message_status')
                .select('message_id')
                .eq('status', 'received')
                .in('message_id', messages.map((message) => message.message_id));

            if (messagesToUpdate.length > 0) {
                await supabase
                    .from('message_status')
                    .update({ status: 'read', status_timestamp: new Date().toISOString() })
                    .in('message_id', messagesToUpdate.map((msg) => msg.message_id));
            }
        };

        markMessagesAsRead();
    }, [messages, currentUserUUID, targetUserID]);

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

                // Set initial status as "sent"
                const statusData = {
                    message_id: insertedMessage.message_id,
                    status: 'sent',
                    status_timestamp: new Date().toISOString(),
                };

                const { error: statusError } = await supabase
                    .from('message_status')
                    .insert([statusData]);

                if (statusError) {
                    console.error('Error setting message status:', statusError.message);
                }

                setInputText('');
            } catch (error: any) {
                console.error('Error in handleSendMessage:', error.message);
            }
        }
    };

    const handleEditMessage = async (messageID: number, newContent: string) => {
        // Trim the content to remove any leading or trailing whitespace
        const trimmedContent = newContent.trim();
    
        // Check if the trimmed content is empty
        if (trimmedContent.length === 0) {
            Alert.alert('Error', 'Message cannot be empty.');
            return; // Exit the function without saving
        }
    
        try {
            const { error } = await supabase
                .from('messages')
                .update({ content: trimmedContent })
                .eq('message_id', messageID);
    
            if (error) {
                console.error('Error editing message:', error.message);
            } else {
                setMessages(messages.map(message =>
                    message.message_id === messageID ? { ...message, content: trimmedContent } : message
                ));
                setEditingMessageId(null);  // Stop editing mode after saving
            }
        } catch (error: any) {
            console.error('Error in handleEditMessage:', error.message);
        }
    };
    
    const handleDeleteForMe = async (messageID: number) => {
        try {
            // Add message ID to deletedForMe state
            const updatedDeletedForMe = [...deletedForMe, messageID];
            setDeletedForMe(updatedDeletedForMe);

            // Store the updated deleted message IDs in AsyncStorage
            await AsyncStorage.setItem(`deletedMessages_${currentUserUUID}_${targetUserID}`, JSON.stringify(updatedDeletedForMe));
        } catch (error) {
            console.error('Error deleting message for me:', error);
        }
    };

    const handleDeleteForEveryone = async (messageID: number) => {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ content: DELETED_MESSAGE_PLACEHOLDER })
                .eq('message_id', messageID);

            if (error) {
                console.error('Error deleting message for everyone:', error.message);
            } else {
                setMessages(messages.map(message =>
                    message.message_id === messageID ? { ...message, content: DELETED_MESSAGE_PLACEHOLDER } : message
                ));
            }
        } catch (error: any) {
            console.error('Error in handleDeleteForEveryone:', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <FlashList
                data={messages.filter(message => !deletedForMe.includes(message.message_id))}
                renderItem={({ item }) => (
                    item.sender_id === currentUserUUID ? (
                        <UserMessageBubble 
                            key={item.message_id} 
                            message={item.content} 
                            status={item.status} // Pass the status to the bubble
                            onEdit={(newContent) => handleEditMessage(item.message_id, newContent)}
                            onDeleteForMe={() => handleDeleteForMe(item.message_id)}
                            onDeleteForEveryone={() => handleDeleteForEveryone(item.message_id)}
                        />
                    ) : (
                        <OtherMessageBubble 
                            key={item.message_id} 
                            message={item.content} 
                            status={item.status} // Pass the status to the bubble
                            onEdit={() => {}}
                            onDeleteForMe={() => handleDeleteForMe(item.message_id)}
                            onDeleteForEveryone={() => {}}
                        />
                    )
                )}
                estimatedItemSize={50}
                keyExtractor={(item) => item.message_id.toString()}
            />
            {editingMessageId === null && ( // Hide the input when editing a message
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
            )}
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
