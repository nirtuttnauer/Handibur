import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { View } from '@/components/Themed';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { UserMessageBubble, OtherMessageBubble } from './MessageBubbles';
import { useColorScheme } from 'react-native';  // Import useColorScheme

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
    const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
    const { targetUserID } = useLocalSearchParams();
    const { user } = useAuth();
    const currentUserUUID = user?.id;
    const [deletedForMe, setDeletedForMe] = useState<number[]>([]);

    const colorScheme = useColorScheme();  // Detect the current color scheme
    const isDarkMode = colorScheme === 'dark';  // Determine if dark mode is active

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
        subscribeToMessages();
    
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
    
                            if (newMessage.sender_id !== currentUserUUID) {
                                await supabase
                                    .from('messages')
                                    .update({ status: 'read' })
                                    .eq('message_id', newMessage.message_id);
    
                                newMessage.status = 'read'; 
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
    
                    subscribeToMessages();
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
            const { error } = await supabase
                .from('messages')
                .update({ content: trimmedContent, status: 'sent', is_edited: true }) 
                .eq('message_id', messageID);
    
            if (error) {
                console.error('Error editing message:', error.message);
            } else {
                setMessages(messages.map(message =>
                    message.message_id === messageID 
                        ? { ...message, content: trimmedContent, status: 'sent', is_edited: true } 
                        : message
                ));
    
                setEditingMessageId(null);
                setSelectedMessageId(null);
            }
        } catch (error: any) {
            console.error('Error in handleEditMessage:', error.message);
        }
    };
    
    const handleDeleteForMe = async (messageID: number | undefined, room_id: number) => {
        if (!messageID || typeof messageID !== 'number') {
            console.error('Invalid messageID provided to handleDeleteForMe:', messageID);
            return;
        }
    
        try {
            setSelectedMessageId(null);
    
            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select('user1_id, user2_id')
                .eq('room_id', room_id)
                .single();
    
            if (roomError || !room) {
                throw roomError || new Error('Room not found');
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
            setSelectedMessageId(null);
    
            const { error } = await supabase
                .from('messages')
                .update({ content: DELETED_MESSAGE_PLACEHOLDER, status: '', is_edited: false })
                .eq('message_id', messageID);
    
            if (error) {
                throw new Error(error.message);
            }
    
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.message_id === messageID
                        ? { ...msg, content: DELETED_MESSAGE_PLACEHOLDER, status: '', is_edited: false }
                        : msg
                )
            );
    
            setSelectedMessageId(null);
        } catch (error) {
            console.error('Error deleting message for everyone:', error);
        }
    };
    
    const handleMessageSelect = (messageID: number) => {
        const selectedMessage = messages.find(message => message.message_id === messageID);
        
        if (selectedMessage && selectedMessage.content === DELETED_MESSAGE_PLACEHOLDER) {
            setSelectedMessageId(messageID);
        } else {
            setSelectedMessageId(null);
        }
    };
    
    return (
        <KeyboardAvoidingView
            style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
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
                            isSelected={selectedMessageId === item.message_id}
                            onSelect={() => handleMessageSelect(item.message_id)}
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
                            isSelected={selectedMessageId === item.message_id}
                            onSelect={() => handleMessageSelect(item.message_id)}
                        />
                    )
                )}
                estimatedItemSize={50}
                keyExtractor={(item) => item.message_id.toString()}
            />

            {editingMessageId === null && (
                <View style={[styles.inputContainer, isDarkMode ? styles.darkInputContainer : styles.lightInputContainer]}>
                    <View style={[styles.inputWrapper, isDarkMode ? styles.darkInputWrapper : styles.lightInputWrapper]}>
                        <TextInput
                            style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                            value={inputText}
                            onChangeText={(text) => setInputText(text)}
                            placeholder="הקלד הודעה.."
                            textAlign="right"
                            placeholderTextColor={isDarkMode ? 'lightgray' : 'gray'}
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
                            <Image
                                source={require('@/assets/icons/send.png')}
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
    },
    lightContainer: {
        backgroundColor: '#f0f0f5',
    },
    darkContainer: {
        backgroundColor: '#1c1c1e',
    },
    inputContainer: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        paddingVertical: 14, 
        paddingHorizontal: 20,
        borderTopColor: '#f0f0f5',
        width: '100%',
    },
    lightInputContainer: {
        backgroundColor: '#fff',
    },
    darkInputContainer: {
        backgroundColor: '#000',
    },
    inputWrapper: {
        flex: 1,
    },
    lightInputWrapper: {
        backgroundColor: '#fff',
    },
    darkInputWrapper: {
        backgroundColor: '#000',
    },
    input: {
        height: 40,
        borderColor: '#f0f0f5',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 20,
    },
    lightInput: {
        backgroundColor: '#fff',
        color: '#000',
    },
    darkInput: {
        backgroundColor: '#000',
        color: '#fff',
    },
    buttonWrapper: {
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 10,
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
