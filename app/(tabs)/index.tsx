import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, MenuItem } from 'react-native-material-menu';
import Logo from '@/assets/images/LOGO.png';
import AntDesign from '@expo/vector-icons/AntDesign';

const avatars = [
  require('../../assets/avatars/IMG_3882.png'),
  require('../../assets/avatars/IMG_3883.png'),
  require('../../assets/avatars/IMG_3884.png'),
  require('../../assets/avatars/IMG_3885.png'),
];

type UserProfile = {
  user_id: string;
  username: string;
  profile_image: number | null;  // profile_image is stored as an index to the avatars array
};

type ChatRoom = {
  room_id: string;
  user1?: UserProfile;
  user2?: UserProfile;
  last_message_time: string;
};

export default function TabOneScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  type ChatRoom = {
    unread_count: number;
    room_id: string;
    user1_id: string;
    user2_id: string;
    created_at: string;
    shown1: boolean;
    shown2: boolean;
    isempty: boolean;
    user1?: UserProfile;
    user2?: UserProfile; // Add the 'user2' property
    last_message_time: string; // Add the 'last_message_time' property
  };
  
  type UserProfile = {
    user_id: string;
    username: string;
    profile_image: string;
  };

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [deletedChats, setDeletedChats] = useState<string[]>([]);
  const [pinnedChats, setPinnedChats] = useState<{ [key: string]: string }>({});
  const [visibleMenu, setVisibleMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new;

        if ((newMessage as { sender_id: string }) && (newMessage as { sender_id: string }).sender_id !== user?.id) {
          fetchChatRooms();
        }
      })
      .subscribe();

    fetchChatRooms();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user?.id]);

  const fetchChatRooms = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: chatRooms, error: chatRoomsError } = await supabase
        .from('chat_rooms')
        .select('room_id, user1_id, user2_id, created_at, shown1, shown2, isempty')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (chatRoomsError) {
        throw chatRoomsError;
      }

      if (chatRooms.length === 0) {
        setChatRooms([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set([
        ...chatRooms.map(room => room.user1_id),
        ...chatRooms.map(room => room.user2_id),
      ])];

      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, profile_image')
        .in('user_id', userIds);

      if (userProfilesError) {
        throw userProfilesError;
      }

      const roomIds = chatRooms.map(room => room.room_id);

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('room_id, sent_at, status, sender_id')
        .in('room_id', roomIds)
        .order('sent_at', { ascending: false });

      if (messagesError) {
        throw messagesError;
      }

      const unreadCounts: { [key: string]: number } = messages.reduce((acc, message) => {
        const currentUserIsSender = message.sender_id === user?.id;
        if (message.status === 'sent' && !currentUserIsSender) {
          acc[message.room_id] = (acc[message.room_id] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number });

      const lastMessageTimes = messages.reduce((acc: { [key: string]: string }, message) => {
        if (!acc[message.room_id]) {
          acc[message.room_id] = message.sent_at;
        }
        return acc;
      }, {});

      const roomsWithUsernames = chatRooms.map(room => {
        return {
          ...room,
          user1: userProfiles.find(profile => profile.user_id === room.user1_id),
          user2: userProfiles.find(profile => profile.user_id === room.user2_id),
          last_message_time: lastMessageTimes[room.room_id] || room.created_at,
          unread_count: unreadCounts[room.room_id] || 0,
        };
      });

      const filteredRooms = roomsWithUsernames.filter(room => {
        const currentUserIsUser1 = room.user1?.user_id === user?.id;
        const lastMessageInRoom = messages.find(msg => msg.room_id === room.room_id);

        if (lastMessageInRoom) {
          return true;
        }

        return !(currentUserIsUser1 ? deletedChats.includes(room.room_id) && !room.shown1 : deletedChats.includes(room.room_id) && !room.shown2);
      });

      setChatRooms(filteredRooms);
    } catch (error) {
      console.error("Error fetching chat rooms: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (roomID: string) => {
    try {
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .select('user1_id, user2_id')
        .eq('room_id', roomID)
        .single();

      if (roomError || !room) {
        throw roomError || new Error("Room not found");
      }

      const currentUserIsUser1 = room.user1_id === user?.id;
      const updateField = currentUserIsUser1 ? 'deletedfor1' : 'deletedfor2';

      const { error: updateError } = await supabase
        .from('messages')
        .update({ [updateField]: true })
        .eq('room_id', roomID);

      if (updateError) {
        throw updateError;
      }

      const updatedDeletedChats = [...deletedChats, roomID];
      setDeletedChats(updatedDeletedChats);
      setChatRooms(prevChatRooms => prevChatRooms.filter(chatRoom => chatRoom.room_id !== roomID));
      await AsyncStorage.setItem(`deletedChats_${user?.id}`, JSON.stringify(updatedDeletedChats));

      Alert.alert("Success", "Chat deleted for you.");
    } catch (error) {
      console.error("Error deleting chat for me:", error);
      Alert.alert("Error", "Could not delete chat.");
    }
  };

  const handlePinChat = async (roomID: string) => {
    try {
      const updatedPinnedChats = { ...pinnedChats, [roomID]: new Date().toISOString() };
      setPinnedChats(updatedPinnedChats);
      await AsyncStorage.setItem(`pinnedChats_${user?.id}`, JSON.stringify(updatedPinnedChats));
      Alert.alert("Success", "Chat pinned.");
    } catch (error) {
      console.error("Error pinning chat:", error);
      Alert.alert("Error", "Could not pin chat.");
    }
  };

  const handleUnpinChat = async (roomID: string) => {
    try {
      const { [roomID]: _, ...updatedPinnedChats } = pinnedChats;
      setPinnedChats(updatedPinnedChats);
      await AsyncStorage.setItem(`pinnedChats_${user?.id}`, JSON.stringify(updatedPinnedChats));
      Alert.alert("Success", "Chat unpinned.");
    } catch (error) {
      console.error("Error unpinning chat:", error);
      Alert.alert("Error", "Could not unpin chat.");
    }
  };

  const filteredChatRooms = chatRooms
    .filter(chatRoom => {
      const currentUserIsUser1 = chatRoom.user1?.user_id === user?.id;
      const isDeletedForCurrentUser = currentUserIsUser1
        ? deletedChats.includes(chatRoom.room_id) && !chatRoom.shown1
        : deletedChats.includes(chatRoom.room_id) && !chatRoom.shown2;

      return !isDeletedForCurrentUser;
    })
    .sort((a, b) => {
      const isAPinned = pinnedChats.hasOwnProperty(a.room_id);
      const isBPinned = pinnedChats.hasOwnProperty(b.room_id);

      if (isAPinned && isBPinned) {
        return new Date(pinnedChats[b.room_id]).getTime() - new Date(pinnedChats[a.room_id]).getTime();
      }

      if (isAPinned) return -1;
      if (isBPinned) return 1;

      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const targetUser = item.user1?.user_id === user?.id ? item.user2 : item.user1;
    const targetUserName = targetUser?.username || "Unknown";
    const targetUserImage = avatars[Number(targetUser?.profile_image) || 0];

    const formatLastMessageDate = (dateString: string) => {
      const date = new Date(dateString);
      const currentYear = new Date().getFullYear();
      const messageYear = date.getFullYear();

      const dateOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };

      if (messageYear !== currentYear) {
        dateOptions.year = 'numeric';
      }

      return date.toLocaleDateString('he-IL', dateOptions);
    };

    return (
      <TouchableOpacity
        onPress={() => {
          const targetUserID = targetUser?.user_id;
          router.push({
            pathname: `/chat/${targetUserID}`,
            params: { targetUserName, targetUserID, roomID: item.room_id },
          });
        }}
        onLongPress={() => setVisibleMenu(item.room_id)}
      >
        <View style={styles.item} key={item.room_id}>
          <Image
            source={targetUserImage}
            style={styles.avatar}
          />
          <View style={styles.chatInfo}>
            <Text style={styles.name} accessibilityLabel={`Chat with ${targetUserName}`}>
              {targetUserName}
            </Text>
            <Text style={styles.createdAt}>
              הודעה אחרונה: {formatLastMessageDate(item.last_message_time)}
            </Text>
            {pinnedChats.hasOwnProperty(item.room_id) && (
              <AntDesign name="pushpino" size={12} color="black" style={styles.pinIcon} />
            )}
          </View>
          {item.unread_count > 0 && (
            <View style={styles.unreadBubble}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
          <Entypo name="chevron-left" size={20} color="black" />
        </View>

        {visibleMenu === item.room_id && (
          <Menu
            visible={true}
            anchor={<View />}
            onRequestClose={() => setVisibleMenu(null)}
          >
            <MenuItem
              onPress={() => {
                setVisibleMenu(null);
                handleDeleteChat(item.room_id);
              }}
            >
              Delete
            </MenuItem>
            {!pinnedChats.hasOwnProperty(item.room_id) ? (
              <MenuItem
                onPress={() => {
                  setVisibleMenu(null);
                  handlePinChat(item.room_id);
                }}
              >
                Pin Chat
              </MenuItem>
            ) : (
              <MenuItem
                onPress={() => {
                  setVisibleMenu(null);
                  handleUnpinChat(item.room_id);
                }}
              >
                Unpin Chat
              </MenuItem>
            )}
          </Menu>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerTitle: () => null,
          }}
        />
        <TextInput
          style={styles.searchInput}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="חפש צ׳אט..."
          placeholderTextColor="#888"
          textAlign="right"
        />
        <View style={styles.listContainer}>
          <FlashList
            data={filteredChatRooms}
            renderItem={renderChatRoom}
            keyExtractor={(item) => item.room_id}
            estimatedItemSize={70}
            ListEmptyComponent={() => (
              <Text style={styles.emptyMessage}>No chats found.</Text>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 10,
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  item: {
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 15,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "right",
    width: '100%',
  },
  createdAt: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "right",
    width: '100%',
  },
  pinIcon: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  unreadBubble: {
    backgroundColor: 'red',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 30,
    top: 15,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  searchInput: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    color: "#000",
    textAlign: "right",
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
    color: "#888",
  },
});
