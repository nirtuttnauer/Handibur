import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';

type Contact = {
  id: string;
  name: string;
  phone: string;
  imageUri: string;
};

export default function FriendsModal() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [friends, setFriends] = useState<Set<string>>(new Set()); // Store friend IDs
  const { user } = useAuth(); // Get current user

  useEffect(() => {
    const fetchFriends = async () => {
      const userId = user?.id; // Replace with the actual user ID from context or auth state
      const { data, error } = await supabase
        .from('friends') // Assuming the friends table has 'user_id' and 'friend_id'
        .select('friend_id')
        .eq('user_id', userId);

      if (error) {
        console.error("Error fetching friends: ", error);
      } else if (data) {
        const friendIds = new Set(data.map((friend: any) => friend.friend_id));
        setFriends(friendIds);
      }
    };

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

    fetchFriends();
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(
    (contact) =>
      friends.has(contact.id) &&
      (contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       contact.phone.includes(searchQuery))
  );

  const handleChat = (item: Contact) => {
    router.back();
    router.push({
      pathname: `/chat/${item.id}`,
      params: { targetUserName: item.name },  // Pass additional params like the username if needed
    });
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