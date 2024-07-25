import React, { useState } from "react";
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

type ChatRoom = {
  id: string;
  name: string;
  lastMessage: string;
  imageUri: string;
};

const chatRooms = [
  {
    id: "1",
    name: "Family Group",
    lastMessage: "See you all tonight!",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "2",
    name: "Work Project",
    lastMessage: "Please review the latest documents.",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "3",
    name: "Friends",
    lastMessage: "Let's catch up this weekend.",
    imageUri: "https://via.placeholder.com/50",
  },
  // Add more chat rooms as needed
];

export default function TabOneScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const sortedChatRooms = chatRooms.sort((a, b) => a.name.localeCompare(b.name));
  const filteredChatRooms = sortedChatRooms.filter(
    (chatRoom) =>
      chatRoom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chatRoom.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity onPress={() => router.push(`/(chat)/chat`)}>
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: item.imageUri || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <Text style={styles.name} accessibilityLabel={`Chat room: ${item.name}`}>
            {item.name}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
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
          keyExtractor={(item) => item.id}
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
  lastMessage: {
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