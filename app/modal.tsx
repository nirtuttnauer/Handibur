import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useWebRTC } from '@/context/WebRTCContext';

type Contact = {
  id: string;
  name: string;
  phone: string;
  imageUri: string;
};

export default function ModalScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { targetUserID } = useWebRTC();

  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username');

      if (error) {
        console.error("Error fetching contacts: ", error);
      } else if (data) {
        const fetchedContacts = data.map((user: any) => ({
          id: user.user_id,
          name: user.username || "Unknown", // Provide a fallback value for username
          phone: 'N/A', // Replace with actual phone data if available
          imageUri: 'https://via.placeholder.com/50' // Replace with actual image URL if available
        }));
        setContacts(fetchedContacts);
      }
    };

    fetchContacts();
  }, []);

  const sortedContacts = contacts.sort((a, b) => a.name.localeCompare(b.name));
  const filteredContacts = sortedContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
  );

  const handleChat = (item: Contact) => {
      router.back();
      router.push(`/chat/${item.id}`);
  }

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity onPress={()=>handleChat(item)}>
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: item.imageUri || "https://via.placeholder.com/50" }}
          style={styles.avatar}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.name} accessibilityLabel={`Name: ${item.name}`}>
            {item.name}
          </Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={()=>handleChat(item)}
          accessibilityLabel={`Call ${item.name}`}
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