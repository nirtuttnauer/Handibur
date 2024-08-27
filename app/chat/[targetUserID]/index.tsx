import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { View } from '@/components/Themed';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router'; // Added this to extract parameters
import { UserMessageBubble, OtherMessageBubble } from './MessageBubbles';

interface Message {
    message_id: number;
    content: string;
    sender_id: string;
    sent_at: string;
    status: string;
    is_edited: boolean;
    room_id: number;
}

const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const { targetUserID } = useLocalSearchParams();  // Extracting targetUserID from route params
    const { user } = useAuth(); 
    const currentUserUUID = user?.id;
    const [deletedForMe, setDeletedForMe] = useState<number[]>([]);

    let subscription: RealtimeChannel | null = null;

    useEffect(() => {
        if (!targetUserID || !currentUserUUID) {
            console.error('targetUserID or currentUserUUID is missing');
            return;
        }

        const loadMessages = async () => {
            try {
                const { data: room, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select('room_id, user1_id, user2_id')
                    .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                    .single();
    
                if (roomError || !room) {
                    return;
                }
    
                const roomID = room.room_id;
                const currentUserIsUser1 = room.user1_id === currentUserUUID;
                const filterDeleted = currentUserIsUser1 ? 'deletedfor1' : 'deletedfor2';
    
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('room_id', roomID)
                    .eq(filterDeleted, false)
                    .order('sent_at', { ascending: true });
    
                if (messagesError) {
                    if (messagesError.code !== 'PGRST116') { // Ignore the "no rows returned" error
                        throw messagesError;
                    }
                }
    
                setMessages(messagesData || []);
    
                // Mark all messages as read when the user enters the chat screen
                const unreadMessageIds = messagesData?.filter(message => message.sender_id !== currentUserUUID && message.status !== 'read')
                    .map(message => message.message_id) || [];
    
                if (unreadMessageIds.length > 0) {
                    await supabase
                        .from('messages')
                        .update({ status: 'read' })
                        .in('message_id', unreadMessageIds);
    
                    setMessages(prevMessages =>
                        prevMessages.map(message =>
                            unreadMessageIds.includes(message.message_id)
                                ? { ...message, status: 'read' }
                                : message
                        )
                    );
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };
    
        loadMessages();
        subscribeToMessages(); // Set up the real-time subscription
    
        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [targetUserID, currentUserUUID]);
    
    const subscribeToMessages = async () => {
        if (!targetUserID || !currentUserUUID) {
            console.error('targetUserID or currentUserUUID is missing');
            return;
        }

        try {
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select('room_id')
                .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                .maybeSingle();
    
            if (roomError || !room) {
                return;
            }
    
            const roomID = room.room_id;
    
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
                    async (payload) => {
                        if (payload.eventType === 'INSERT') {
                            const newMessage = payload.new as Message;
    
                            // If the message is not sent by the current user, mark it as read
                            if (newMessage.sender_id !== currentUserUUID) {
                                await supabase
                                    .from('messages')
                                    .update({ status: 'read' })
                                    .eq('message_id', newMessage.message_id);
    
                                newMessage.status = 'read'; // Update status in the local state
                            }
    
                            setMessages((currentMessages) => {
                                const messageExists = currentMessages.some(msg => msg.message_id === newMessage.message_id);
                                if (!messageExists) {
                                    return [...currentMessages, newMessage];
                                }
                                return currentMessages;
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            setMessages((currentMessages) =>
                                currentMessages.map((message) =>
                                    message.message_id === payload.new.message_id ? { ...message, ...payload.new } : message
                                )
                            );
                        }
                    }
                )
                .subscribe();
        } catch (error) {
            console.error('Error in subscribeToMessages:', error);
        }
    };
    
    
    const handleSendMessage = async () => {
        if (!targetUserID || !currentUserUUID) {
            console.error('targetUserID or currentUserUUID is missing');
            return;
        }

        if (inputText.trim() !== '') {
            try {
                let roomID;
    
                const { data: existingRoom, error: roomError } = await supabase
                    .from('chat_rooms')
                    .select('room_id')
                    .or(`and(user1_id.eq.${currentUserUUID},user2_id.eq.${targetUserID}),and(user1_id.eq.${targetUserID},user2_id.eq.${currentUserUUID})`)
                    .maybeSingle();
    
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
    
                    // Immediately subscribe to the messages channel for the new room
                    subscribeToMessages(); // Subscribe to the messages after room creation
                }
    
                const newMessage = {
                    room_id: roomID,
                    sender_id: currentUserUUID,
                    receiver_id: targetUserID,
                    content: inputText,
                    status: 'sent',
                    is_edited: false,
                    deletedfor1: false,
                    deletedfor2: false,
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
    
                setMessages((currentMessages) => [...currentMessages, insertedMessage]);
                setInputText('');
    
                // Notify the home screen to refresh chat rooms
                await AsyncStorage.setItem('refreshChatRooms', 'true');
    
            } catch (error: any) {
                console.error('Error in handleSendMessage:', error.message);
            }
        }
    };
    
    const handleEditMessage = async (messageID: number, newContent: string) => {
        const trimmedContent = newContent.trim();
    
        if (trimmedContent.length === 0) {
            Alert.alert('Error', 'Message cannot be empty.');
            return;
        }
    
        try {
            // Update the message content, set is_edited to true, and revert status to 'sent'
            const { error } = await supabase
                .from('messages')
                .update({ content: trimmedContent, status: 'sent', is_edited: true }) 
                .eq('message_id', messageID);
    
            if (error) {
                console.error('Error editing message:', error.message);
            } else {
                // Update the message in the local state with the new content, status, and edited flag
                setMessages(messages.map(message =>
                    message.message_id === messageID 
                        ? { ...message, content: trimmedContent, status: 'sent', is_edited: true } 
                        : message
                ));
    
                setEditingMessageId(null);
            }
        } catch (error: any) {
            console.error('Error in handleEditMessage:', error.message);
        }
    };
    
    const handleDeleteForMe = async (messageID: number | undefined, room_id: number) => {
        try {
    
            if (typeof messageID !== 'number' || isNaN(messageID)) {
                console.error('Invalid messageID provided to handleDeleteForMe:', messageID);
                return;
            }
    
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select('user1_id, user2_id')
                .eq('room_id', room_id)
                .single();
    
            if (roomError || !room) {
                throw roomError || new Error("Room not found");
            }
    
            const currentUserIsUser1 = room.user1_id === currentUserUUID;
            const updateField = currentUserIsUser1 ? 'deletedfor1' : 'deletedfor2';
    
            const { error } = await supabase
                .from('messages')
                .update({ [updateField]: true })
                .eq('message_id', messageID);
    
            if (error) {
                throw error;
            }
    
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.message_id !== messageID));
        } catch (error) {
            console.error('Error deleting message for me:', error);
        }
    };
    
    const handleDeleteForEveryone = async (messageID: number) => {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ content: DELETED_MESSAGE_PLACEHOLDER, status: '', is_edited: false })
                .eq('message_id', messageID);

            if (error) {
                console.error('Error deleting message for everyone:', error.message);
            } else {
                setMessages(messages.map(message =>
                    message.message_id === messageID ? { ...message, content: DELETED_MESSAGE_PLACEHOLDER, status: '', is_edited: false } : message
                ));
            }
        } catch (error: any) {
            console.error('Error in handleDeleteForEveryone:', error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
        >
            <FlashList
                data={messages.filter(message => !deletedForMe.includes(message.message_id))}
                renderItem={({ item }) => (
                    item.sender_id === currentUserUUID ? (
                        <UserMessageBubble
                            key={item.message_id.toString()}
                            message={item.content}
                            status={item.status}
                            isEdited={item.is_edited}
                            onEdit={(newContent) => handleEditMessage(item.message_id, newContent)}
                            onDeleteForMe={() => handleDeleteForMe(item.message_id, item.room_id)}
                            onDeleteForEveryone={() => handleDeleteForEveryone(item.message_id)}
                        />
                    ) : (
                        <OtherMessageBubble
                            key={item.message_id.toString()}
                            message={item.content}
                            status={item.status}
                            isEdited={item.is_edited}
                            onEdit={() => {}}
                            onDeleteForMe={() => handleDeleteForMe(item.message_id, item.room_id)}
                            onDeleteForEveryone={() => handleDeleteForEveryone(item.message_id)}
                        />
                    )
                )}
                estimatedItemSize={50}
                keyExtractor={(item) => item.message_id.toString()}
            />

{editingMessageId === null && (
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={(text) => setInputText(text)}
                            placeholder="הקלד הודעה.."
                            textAlign="right"
                            placeholderTextColor="gray"
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                            <Image
                                source={require('@/assets/icons/send.png')}  // Adjust the path to your PNG image
                                style={styles.sendButtonImage}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f5',
    },
    inputContainer: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        paddingVertical: 10, 
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f5',
        width: '100%',
        
    },
    inputWrapper: {
        flex: 1, 
        backgroundColor: 'transparent',  // Make the background transparent
    },
    input: {
        height: 40,
        borderColor: '#E5E5EA',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        backgroundColor: '#f9f9f9',
    },
    buttonWrapper: {
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'transparent',  // Make the background transparent
                padding: 15,

    },
    sendButton: {
        backgroundColor: '#2E6AF3',
        borderRadius: 25, 
        padding: 8, 
        width: 30, 
        height: 30,
        justifyContent: 'center', 
        alignItems: 'center', 
    },
    sendButtonImage: {
        width: 12, 
        height: 14,
        
    },
});

export default Chat;