import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { Entypo } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';

type UserSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string;
  imageUri: string; // Optional if you decide to include images in future
  isFriend: boolean; // New field to track if user is already a friend
};

export default function AddFriendsModal() {
  const { user } = useAuth(); // Get current user
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResult, setUserSearchResult] = useState<UserSearchResult | null>(null);
  
  // Move the `handleSearch` function after `user` is assigned
  const handleSearch = async () => {
    if (!user) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, phone, email') // Adjust based on actual schema
      .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

    if (error) {
      console.error("Error searching user: ", error);
      Alert.alert("Error", "Error searching for user.");
    } else if (data && data.length === 1) {
      // Single result
      const foundUserId = data[0].user_id;
      
      // Check if the user is already a friend
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('friend_id', foundUserId);

      if (friendsError) {
        console.error("Error checking friends list: ", friendsError);
        Alert.alert("Error", "Error checking friends list.");
        return;
      }

      const isFriend = friendsData && friendsData.length > 0;

      const userResult: UserSearchResult = {
        id: foundUserId,
        name: data[0].username || "Unknown",
        phone: data[0].phone || 'N/A',
        email: data[0].email || 'N/A',
        imageUri: 'https://via.placeholder.com/50', // Placeholder, update as needed
        isFriend
      };
      setUserSearchResult(userResult);
    } else if (data && data.length > 1) {
      // Handle multiple results
      Alert.alert("Multiple Users Found", "More than one user matched your search. Please refine your query.");
      setUserSearchResult(null);
    } else {
      // No results found
      Alert.alert("No User Found", "No user found with the provided information.");
      setUserSearchResult(null);
    }
  };

  const handleAddFriend = async () => {
    if (userSearchResult && user) {
      if (userSearchResult.isFriend) {
        Alert.alert("Already Friends", "You are already friends with this user.");
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert([
          { user_id: user.id, friend_id: userSearchResult.id } // Adjust based on your schema
        ]);

      if (error) {
        console.error("Error adding friend: ", error);
        Alert.alert("Error", "Error adding friend.");
      } else {
        Alert.alert("Success", "User added to friends list.");
        setSearchQuery(""); // Clear search
        setUserSearchResult(null); // Clear search result
      }
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Add a Friend</Text>
            </View>
          ),
        }}
      />
      <TextInput
        style={styles.searchInput}
        onChangeText={setSearchQuery}
        value={searchQuery}
        placeholder="Search by email, username, or phone..."
        placeholderTextColor="#888"
        onSubmitEditing={handleSearch}
      />
      {userSearchResult && (
        <View style={styles.resultContainer}>
          <View style={styles.item} key={userSearchResult.id}>
            <TouchableOpacity style={styles.avatarContainer}>
              <Image
                source={{ uri: userSearchResult.imageUri || "https://via.placeholder.com/50" }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.contactInfo}>
              <Text style={styles.name} accessibilityLabel={`Name: ${userSearchResult.name}`}>
                {userSearchResult.name}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.addButton,
                userSearchResult.isFriend && styles.addButtonGreen // Apply green style if already a friend
              ]}
              onPress={handleAddFriend}
              accessibilityLabel={`Add ${userSearchResult.name} as friend`}
              disabled={userSearchResult.isFriend} // Disable button if already a friend
            >
              <Entypo name="add-user" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  resultContainer: {
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
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 25,
  },
  addButtonGreen: {
    backgroundColor: "#28a745", // Green color for already friends
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