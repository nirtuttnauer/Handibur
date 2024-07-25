import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ChatRoom = {
  id: string;
  name: string;
  lastMessage: string;
  imageUri: string;
};

const chatRooms = [
  {
    id: "1",
    name: "המורה למתמטיקה",
    lastMessage: "זכרו לסיים את שיעורי הבית!",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "2",
    name: "אווה",
    lastMessage: "תוכלי לשלוח לי את קבצי הפרויקט?",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "3",
    name: "אופק",
    lastMessage: "רוצה לשחק כדורגל בסוף השבוע?",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "4",
    name: "אמא",
    lastMessage: "אל תשכח להתקשר לסבתא.",
    imageUri: "https://via.placeholder.com/50",
  }, 
  {
    id: "5",
    name: "ניר",
    lastMessage: "עדיין נפגשים לארוחת ערב היום?",
    imageUri: "https://via.placeholder.com/50",
  },
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
    <LinearGradient
      colors={['#330985', '#FF5CC7' , '#FFB8EA' ]} // Adjust your gradient colors here
      style={styles.background}
    >
    <View style={styles.container}>
      <Stack.Screen
        options={{
        }}
      />
      <TextInput
        style={styles.searchInput}
        onChangeText={setSearchQuery}
        value={searchQuery}
        placeholder="חיפוש בשיחות"
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#888", // Changed to fit dark theme
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
    color: "#fff",
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
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  lastMessage: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  searchInput: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 10,
    backgroundColor: "#444", // Changed to fit dark theme
    marginBottom: 10,
    color: "#fff",
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
});