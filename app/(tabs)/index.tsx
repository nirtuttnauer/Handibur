import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import Logo from '@/assets/images/LOGO.png';

type UserProfile = {
  user_id: string;
  username: string;
};

type ChatRoom = {
  room_id: string;
  user1?: UserProfile;
  user2?: UserProfile;
  created_at: string;
};

export default function TabOneScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true); // Loading state
  const { user } = useAuth(); // Get current user

  useEffect(() => {
    const fetchChatRooms = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
  
      try {
        // Step 1: Fetch chat rooms where the current user is involved
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
  
        // Step 2: Extract unique user IDs from the chat rooms
        const userIds = [...new Set([
          ...chatRooms.map(room => room.user1_id),
          ...chatRooms.map(room => room.user2_id),
        ])];
  
        // Step 3: Fetch user profiles based on the extracted user IDs
        const { data: userProfiles, error: userProfilesError } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .in('user_id', userIds);
  
        if (userProfilesError) {
          throw userProfilesError;
        }
  
        // Step 4: Combine chat rooms with user profile data
        const roomsWithUsernames = chatRooms.map(room => {
          return {
            ...room,
            user1: userProfiles.find(profile => profile.user_id === room.user1_id),
            user2: userProfiles.find(profile => profile.user_id === room.user2_id),
          };
        });
  
        setChatRooms(roomsWithUsernames);
      } catch (error) {
        console.error("Error fetching chat rooms: ", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchChatRooms();
  }, [user?.id]);

  const sortedChatRooms = chatRooms.sort((a, b) => {
    const user1NameA = a.user1?.username ?? "Unknown";
    const user1NameB = b.user1?.username ?? "Unknown";
    return user1NameA.localeCompare(user1NameB);
  });

  const filteredChatRooms = sortedChatRooms.filter(
    (chatRoom) =>
      chatRoom.user1?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatRoom.user2?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const targetUserName = item.user1?.user_id === user?.id ? item.user2?.username : item.user1?.username;
  
    return (
      <TouchableOpacity
        onPress={() => {
          // Determine which user's UUID to use (the one that is not the current user's ID)
          const targetUserID = item.user1?.user_id === user?.id ? item.user2?.user_id : item.user1?.user_id;
          const targetUser = targetUserID
          const targetUserName = item.user1?.user_id === user?.id ? item.user2?.username : item.user1?.username;
          console.log(`Chatting with ${targetUserName} (${targetUserID})`);
          router.push({
            pathname: `/chat/${targetUserID}`,
            params: { targetUserName , targetUser},  // Pass the target user's name as a parameter
          })
        }
        }
      >
        <View style={styles.item} key={item.room_id}>
          <Image
            source={{ uri: "https://via.placeholder.com/50" }} // Replace with actual image URL if available
            style={styles.avatar}
          />
          <View style={styles.chatInfo}>
            <Text style={styles.name} accessibilityLabel={`Chat with ${targetUserName}`}>
              {targetUserName}
            </Text>
            <Text style={styles.createdAt}>
              Created at: {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
          <Entypo name="chevron-right" size={24} color="#888" />
        </View>
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
          placeholder="חפש צ׳אט..."
          placeholderTextColor="#888"
          textAlign="right"  // Align text to the right
        />
        <View style={styles.listContainer}>
          <FlashList
            data={filteredChatRooms}
            renderItem={renderChatRoom}
            keyExtractor={(item) => item.room_id}
            estimatedItemSize={70}
            ListEmptyComponent={() => (
              <Text style={styles.emptyMessage}>לא נמצאו צ׳אטים.</Text>
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
    paddingVertical: 10, // Add vertical padding around the logo
  },
  logo: {
    width: '30%',  // Use a percentage for width to make it responsive
    height: undefined,  // Keep the aspect ratio intact
    aspectRatio: 1,  // Ensure the logo is a square
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
  searchInput: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    color: "#000",
    textAlign: "right",  // Align text to the right
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
    color: "#888",
  },
});