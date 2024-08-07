import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Button,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; // Adjust the import path as needed

type UserProfile = {
  user_id: string;
  username: string;
};

type ChatRoom = {
  room_id: string;
  user1: UserProfile[];
  user2: UserProfile[];
  created_at: string;
};

export default function TabOneScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    const fetchChatRooms = async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          room_id,
          user1: user_profiles!chat_rooms_user1_id_fkey (
            user_id,
            username
          ),
          user2: user_profiles!chat_rooms_user2_id_fkey (
            user_id,
            username
          ),
          created_at
        `);

      if (error) {
        console.error("Error fetching chat rooms: ", error);
      } else if (data) {
        setChatRooms(data);
      }
    };

    fetchChatRooms();
  }, []);

  const sortedChatRooms = chatRooms.sort((a, b) => {
    const user1NameA = a.user1[0]?.username ?? "Unknown";
    const user1NameB = b.user1[0]?.username ?? "Unknown";
    return user1NameA.localeCompare(user1NameB);
  });

  const filteredChatRooms = sortedChatRooms.filter(
    (chatRoom) =>
      chatRoom.user1[0]?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatRoom.user2[0]?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity onPress={() => router.push(`/(chat)/chat`)}>
      <View style={styles.item} key={item.room_id}>
        <Image
          source={{ uri: "https://via.placeholder.com/50" }} // Replace with actual image URL if available
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <Text style={styles.name} accessibilityLabel={`Chat room between ${item.user1[0]?.username} and ${item.user2[0]?.username}`}>
            {`${item.user1[0]?.username ?? "Unknown"} & ${item.user2[0]?.username ?? "Unknown"}`}
          </Text>
          <Text style={styles.createdAt}>
            Created at: {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <Entypo name="chevron-right" size={24} color="#888" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={{
                  uri: "https://via.placeholder.com/40",
                }} // Replace with actual image URL
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 10,
                }}
              />
            </View>
          ),
        }}
      />
      <TextInput
        style={styles.searchInput}
        onChangeText={setSearchQuery}
        value={searchQuery}
        placeholder="Search chats..."
        placeholderTextColor="#888"
      />
      <View style={styles.listContainer}>
        <FlashList
          data={filteredChatRooms}
          renderItem={renderChatRoom}
          keyExtractor={(item) => item.room_id}
          estimatedItemSize={70}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
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
  },
});