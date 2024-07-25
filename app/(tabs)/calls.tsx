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
import { LinearGradient } from 'expo-linear-gradient';

type Call = {
  id: string;
  name: string;
  date: string;
  type: string; // e.g., "missed", "incoming", "outgoing"
  imageUri: string;
};

const callHistory = [
  {
    id: "1",
    name: "המורה למתמטיקה",
    date: "היום ב-10:30",
    type: "incoming",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "2",
    name: "אווה",
    date: "אתמול ב-14:00",
    type: "missed",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "3",
    name: "אופק",
    date: "שלשום ב-16:15",
    type: "outgoing",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "4",
    name: "אמא",
    date: "לפני שבוע",
    type: "missed",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "5",
    name: "ניר",
    date: "לפני חודש",
    type: "incoming",
    imageUri: "https://via.placeholder.com/50",
  },
];

export default function CallHistoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const sortedCallHistory = callHistory.sort((a, b) => a.name.localeCompare(b.name));
  const filteredCallHistory = sortedCallHistory.filter(
    (call) =>
      call.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCall = ({ item }: { item: Call }) => (
    <TouchableOpacity onPress={() => router.push(`/(calls)/call`)}>
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: item.imageUri || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        <View style={styles.callInfo}>
          <Text style={styles.name} accessibilityLabel={`Call: ${item.name}`}>
            {item.name}
          </Text>
          <Text style={styles.date} numberOfLines={1}>
            {item.date}
          </Text>
        </View>
        <Entypo
          name="phone"
          size={24}
          color={item.type === "missed" ? "#ff0000" : "#888"}
        />
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
          placeholder="חיפוש באנשי קשר"
          placeholderTextColor="#888"
        />
        <View style={styles.listContainer}>
          <FlashList
            data={filteredCallHistory}
            renderItem={renderCall}
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
  callInfo: {
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
  date: {
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