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

type Contact = {
  id: string;
  name: string;
  phone: string;
  imageUri: string;
  connected: boolean;
};

const contacts: Contact[] = [
  {
    id: "1",
    name: "Alice Johnson",
    phone: "123-456-7890",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "2",
    name: "Bob Smith",
    phone: "987-654-3210",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
  },
  {
    id: "3",
    name: "Carol White",
    phone: "456-789-0123",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "4",
    name: "David Brown",
    phone: "321-654-9870",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
  },
  {
    id: "5",
    name: "Eve Black",
    phone: "654-987-0123",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "6",
    name: "Frank Green",
    phone: "789-012-3456",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
  },
  {
    id: "7",
    name: "Grace Blue",
    phone: "012-345-6789",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "8",
    name: "Henry Orange",
    phone: "987-654-3210",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
  },
  {
    id: "9",
    name: "Ivy Red",
    phone: "456-789-0123",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "10",
    name: "Jack Yellow",
    phone: "321-654-9870",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
  },
  {
    id: "11",
    name: "Kate Purple",
    phone: "654-987-0123",
    imageUri: "https://via.placeholder.com/50",
    connected: true,
  },
  {
    id: "12",
    name: "Larry Cyan",
    phone: "789-012-3456",
    imageUri: "https://via.placeholder.com/50",
    connected: false,
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
          source={{ uri: item.imageUri || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.name} accessibilityLabel={`Name: ${item.name || "Unknown"}`}>
            {item.name || "Unknown"}
          </Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View
          style={[
            styles.statusCircle,
            { backgroundColor: item.connected ? "green" : "grey" },
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (<View>
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
    backgroundColor: "#f0f0f5",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
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
    color: "#333",
  },
  phone: {
    fontSize: 14,
    color: "#888",
  },
  statusCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  searchInput: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 10,
    color: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});