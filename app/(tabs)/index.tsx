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
import { Menu, MenuItem } from 'react-native-material-menu'; // Import Menu components
import Logo from '@/assets/images/LOGO.png';
import AntDesign from '@expo/vector-icons/AntDesign';


type UserProfile = {
  user_id: string;
  username: string;
  profile_image: string | null;
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
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const defaultProfileImage = "https://via.placeholder.com/50";
  const [deletedChats, setDeletedChats] = useState<string[]>([]);
  const [pinnedChats, setPinnedChats] = useState<{ [key: string]: string }>(
    {}
  ); // Store pinned chats with timestamps
  const [visibleMenu, setVisibleMenu] = useState<string | null>(null); // Track which menu is open

  useEffect(() => {
    const fetchDeletedChats = async () => {
      try {
        const storedDeletedChats = await AsyncStorage.getItem(`deletedChats_${user?.id}`);
        if (storedDeletedChats) {
          setDeletedChats(JSON.parse(storedDeletedChats));
        }
      } catch (error) {
        console.error('Error loading deleted chats:', error);
      }
    };

    const fetchPinnedChats = async () => {
      try {
        const storedPinnedChats = await AsyncStorage.getItem(`pinnedChats_${user?.id}`);
        if (storedPinnedChats) {
          setPinnedChats(JSON.parse(storedPinnedChats));
        }
      } catch (error) {
        console.error('Error loading pinned chats:', error);
      }
    };

    const fetchChatRooms = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: chatRooms, error: chatRoomsError } = await supabase
          .from('chat_rooms')
          .select('room_id, user1_id, user2_id, created_at')
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
        const { data: lastMessages, error: lastMessagesError } = await supabase
          .from('messages')
          .select('room_id, sent_at')
          .in('room_id', roomIds)
          .order('sent_at', { ascending: false });

        if (lastMessagesError) {
          throw lastMessagesError;
        }

        const lastMessageTimes = lastMessages.reduce((acc, message) => {
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
          };
        });

        setChatRooms(roomsWithUsernames);
      } catch (error) {
        console.error("Error fetching chat rooms: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedChats();
    fetchPinnedChats();
    fetchChatRooms();
  }, [user?.id]);

  const handleDeleteChat = async (roomID: string) => {
    try {
      const updatedDeletedChats = [...deletedChats, roomID];
      setDeletedChats(updatedDeletedChats);
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
    .filter(chatRoom => !deletedChats.includes(chatRoom.room_id))
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
    const targetUserImage = targetUser?.profile_image || defaultProfileImage;

    return (
      <TouchableOpacity
        onPress={() => {
          const targetUserID = targetUser?.user_id;
          router.push({
            pathname: `/chat/${targetUserID}`,
            params: { targetUserName, targetUserID },
          });
        }}
        onLongPress={() => setVisibleMenu(item.room_id)}  // Open menu on long press
      >
        <View style={styles.item} key={item.room_id}>
          <Image
            source={{ uri: targetUserImage }}
            style={styles.avatar}
          />
          <View style={styles.chatInfo}>
            <Text style={styles.name} accessibilityLabel={`Chat with ${targetUserName}`}>
              {targetUserName}
            </Text>
            <Text style={styles.createdAt}>
              Last message: {new Date(item.last_message_time).toLocaleString()}
            </Text>
            {pinnedChats.hasOwnProperty(item.room_id) && (
             <AntDesign name="pushpino" size={12} color="black" style={styles.pinIcon}/>
             )}
          </View>
          <Entypo name="chevron-right" size={24} color="#888" />
        </View>

        {visibleMenu === item.room_id && (
          <Menu
            visible={true}
            anchor={<View />}  // Invisible anchor
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
            headerTitle: () => (
              <View style={styles.logoContainer}>
                <Image source={Logo} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            ),
          }}
        />
        <TextInput
          style={styles.searchInput}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="Search chat..."
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
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logo: {
    width: '30%',
    height: undefined,
    aspectRatio: 1,
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  createdAt: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  pinIcon: {
    position: "absolute",
    right: 0,
    top: 0,
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

