import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { Link, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';

type Contact = {
  id: string;
  name: string;
  phone: string;
  imageUri: string;
};

const contacts = [
  {
    id: "1",
    name: "Alice Johnson",
    phone: "123-456-7890",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "2",
    name: "Bob Smith",
    phone: "987-654-3210",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "3",
    name: "Carol White",
    phone: "456-789-0123",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "4",
    name: "David Brown",
    phone: "321-654-9870",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "5",
    name: "Eve Black",
    phone: "654-987-0123",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "6",
    name: "Frank Green",
    phone: "789-012-3456",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "7",
    name: "Grace Blue",
    phone: "012-345-6789",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "8",
    name: "Henry Orange",
    phone: "987-654-3210",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "9",
    name: "Ivy Red",
    phone: "456-789-0123",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "10",
    name: "Jack Yellow",
    phone: "321-654-9870",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "11",
    name: "Kate Purple",
    phone: "654-987-0123",
    imageUri: "https://via.placeholder.com/50",
  },
  {
    id: "12",
    name: "Larry Cyan",
    phone: "789-012-3456",
    imageUri: "https://via.placeholder.com/50",
  },
];

export default function ModalScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const sortedContacts = contacts.sort((a, b) => a.name.localeCompare(b.name));
  const filteredContacts = sortedContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity onPress={() => {
      router.push("/(chat)/chat");
      router.back();
    }}>
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: item.imageUri || "https://via.placeholder.com/50" }} // Replace with actual image URL
          style={styles.avatar}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.name} accessibilityLabel={`Name: ${item.name || "Unknown"}`}>
            {item.name || "Unknown"}
          </Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => router.push("/(chat)/chat")}
          accessibilityLabel={`Call ${item.name || "Unknown"}`}
        >
          <Entypo name="phone" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Start A Chat</Text>
            </View>
          ),
        }}
      />
      <TextInput
        style={styles.searchInput}
        onChangeText={setSearchQuery}
        value={searchQuery}
        placeholder="Search contacts..."
        placeholderTextColor="#888"
      />
      <View style={styles.listContainer}>
        <FlashList
          data={filteredContacts}
          renderItem={renderContact}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  listContainer: {
    flex: 1,
    width: "100%",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  phone: {
    fontSize: 14,
    color: "#888",
  },
  callButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 25,
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