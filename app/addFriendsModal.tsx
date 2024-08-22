import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';

type UserSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string;
  imageUri: string;
  isFriend: boolean;
  isRequestSent: boolean; // New field to check if a request is already sent
};

export default function AddFriendsModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResult, setUserSearchResult] = useState<UserSearchResult | null>(null);

  const handleSearch = async () => {
    if (!user) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, phone, email')
      .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

    if (error) {
      console.error("Error searching user: ", error);
      Alert.alert("Error", "Error searching for user.");
    } else if (data && data.length === 1) {
      const foundUserId = data[0].user_id;

      // Check if already friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('friend_id', foundUserId);

      // Check if a friend request is already sent
      const { data: requestData, error: requestError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('recipient_id', foundUserId)
        .eq('status', 'pending');

      if (friendsError || requestError) {
        console.error("Error checking friends or requests list: ", friendsError || requestError);
        Alert.alert("Error", "Error checking friends or requests list.");
        return;
      }

      const isFriend = friendsData && friendsData.length > 0;
      const isRequestSent = requestData && requestData.length > 0;

      const userResult: UserSearchResult = {
        id: foundUserId,
        name: data[0].username || "Unknown",
        phone: data[0].phone || 'N/A',
        email: data[0].email || 'N/A',
        imageUri: 'https://via.placeholder.com/50',
        isFriend,
        isRequestSent
      };
      setUserSearchResult(userResult);
    } else if (data && data.length > 1) {
      Alert.alert("Multiple Users Found", "More than one user matched your search. Please refine your query.");
      setUserSearchResult(null);
    } else {
      Alert.alert("No User Found", "No user found with the provided information.");
      setUserSearchResult(null);
    }
  };

  const handleSendFriendRequest = async () => {
    if (userSearchResult && user) {
      if (userSearchResult.isFriend) {
        Alert.alert("Already Friends", "This person is already your friend.");
        router.back(); // Navigate back to the previous screen
        return;
      }

      if (userSearchResult.isRequestSent) {
        Alert.alert("Request Already Sent", "You have already sent a friend request to this user.");
        return;
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert([
          { requester_id: user.id, recipient_id: userSearchResult.id }
        ]);

      if (error) {
        console.error("Error sending friend request: ", error);
        Alert.alert("Error", "Error sending friend request.");
        return;
      }

      Alert.alert("Success", "Friend request sent.");
      router.back(); // Navigate back to the previous screen
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Search for Friends</Text>
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
                userSearchResult.isFriend || userSearchResult.isRequestSent ? styles.addButtonGreen : styles.addButtonBlue
              ]}
              onPress={handleSendFriendRequest}
              accessibilityLabel={`Send friend request to ${userSearchResult.name}`}
              disabled={userSearchResult.isFriend || userSearchResult.isRequestSent} // Disable if already a friend or request sent
            >
              <FontAwesome5 name={userSearchResult.isFriend ? "user-check" : userSearchResult.isRequestSent ? "clock" : "user-plus"} size={24} color="white" />
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
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: 'black',
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
    padding: 10,
    borderRadius: 25,
  },
  addButtonBlue: {
    backgroundColor: "#007BFF",
  },
  addButtonGreen: {
    backgroundColor: "#28a745",
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
