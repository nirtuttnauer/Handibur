import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';

const avatars = [
  require('../assets/avatars/IMG_3882.png'),
  require('../assets/avatars/IMG_3883.png'),
  require('../assets/avatars/IMG_3884.png'),
  require('../assets/avatars/IMG_3885.png'),
];

type UserSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string;
  imageUri: number | null; // Update this to use local images
  isFriend: boolean;
  isRequestSent: boolean;
  isRequestReceived: boolean;
  requestId: string | null;
};

export default function AddFriendsModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchResult, setUserSearchResult] = useState<UserSearchResult | null>(null);

  const handleSearch = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, phone, email, profile_image')
      .or(`username.ilike.%${searchQuery.toLowerCase()}%,email.ilike.%${searchQuery.toLowerCase()}%,phone.ilike.%${searchQuery.toLowerCase()}%`);

    if (error || !data || data.length !== 1) {
      setUserSearchResult(null);
      return;
    }

    const foundUserId = data[0].user_id;
    const avatarIndex = data[0].profile_image; // Assuming profile_image is stored as an index

    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('friend_id', foundUserId);

    const { data: requestData, error: requestError } = await supabase
      .from('friend_requests')
      .select('id, requester_id, recipient_id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${foundUserId}),and(requester_id.eq.${foundUserId},recipient_id.eq.${user.id})`)
      .eq('status', 'pending');

    if (friendsError || requestError) return;

    const isFriend = friendsData && friendsData.length > 0;
    let isRequestSent = false;
    let isRequestReceived = false;
    let requestId = null;

    if (requestData && requestData.length > 0) {
      isRequestSent = requestData[0].requester_id === user.id;
      isRequestReceived = requestData[0].recipient_id === user.id;
      requestId = requestData[0].id;
    }

    const userResult: UserSearchResult = {
      id: foundUserId,
      name: data[0].username || "Unknown",
      phone: data[0].phone || 'N/A',
      email: data[0].email || 'N/A',
      imageUri: avatarIndex !== null && avatarIndex >= 0 && avatarIndex < avatars.length ? avatars[avatarIndex] : null, // Use local image
      isFriend,
      isRequestSent,
      isRequestReceived,
      requestId,
    };
    setUserSearchResult(userResult);
  };

  const handleSendFriendRequest = async () => {
    if (userSearchResult && user) {
      if (userSearchResult.id === user.id) {
        Alert.alert("Error", "You cannot send a friend request to yourself.");
        return;
      }
  
      if (!userSearchResult.isFriend && !userSearchResult.isRequestSent) {
        const { error } = await supabase
          .from('friend_requests')
          .insert([{ requester_id: user.id, recipient_id: userSearchResult.id }]);
  
        if (!error) {
          setUserSearchResult(prev => prev ? { ...prev, isRequestSent: true } : prev);
        }
      }
    }
  };
  

  const handleCancelFriendRequest = async () => {
    if (userSearchResult && userSearchResult.requestId) {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', userSearchResult.requestId);

      if (!error) {
        setUserSearchResult(prev => prev ? { ...prev, isRequestSent: false, requestId: null } : prev);
      }
    }
  };

  const handleApproveFriendRequest = async () => {
    if (userSearchResult && userSearchResult.isRequestReceived && user) {
      const { error: friendError } = await supabase
        .from('friends')
        .insert([
          { user_id: user.id, friend_id: userSearchResult.id },
          { user_id: userSearchResult.id, friend_id: user.id }
        ]);

      if (!friendError) {
        await supabase
          .from('friend_requests')
          .delete()
          .eq('id', userSearchResult.requestId);

        setUserSearchResult(prev => prev ? { ...prev, isFriend: true, isRequestReceived: false, requestId: null } : prev);
      }
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (userSearchResult && userSearchResult.isRequestReceived && user) {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', userSearchResult.requestId);

      if (!error) {
        setUserSearchResult(prev => prev ? { ...prev, isRequestReceived: false, requestId: null } : prev);
      }
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
              {userSearchResult.imageUri !== null ? (
                <Image
                  source={userSearchResult.imageUri}
                  style={styles.avatar}
                />
              ) : (
                <FontAwesome5 name="user-circle" size={50} color="gray" />
              )}
            </TouchableOpacity>
            <View style={styles.contactInfo}>
              <Text style={styles.name} accessibilityLabel={`Name: ${userSearchResult.name}`}>
                {userSearchResult.name}
              </Text>
            </View>
            {userSearchResult.isFriend ? (
              <FontAwesome5 name="user-check" size={24} color="green" />
            ) : userSearchResult.isRequestReceived ? (
              <>
                <TouchableOpacity
                  style={[styles.addButton, styles.addButtonGreen]}
                  onPress={handleApproveFriendRequest}
                  accessibilityLabel={`Approve friend request from ${userSearchResult.name}`}
                >
                  <FontAwesome5 name="check-circle" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, styles.addButtonRed]}
                  onPress={handleDeclineFriendRequest}
                  accessibilityLabel={`Decline friend request from ${userSearchResult.name}`}
                >
                  <FontAwesome5 name="times-circle" size={24} color="white" />
                </TouchableOpacity>
              </>
            ) : userSearchResult.isRequestSent ? (
              <TouchableOpacity
                style={[styles.addButton, styles.addButtonYellow]}
                onPress={handleCancelFriendRequest}
                accessibilityLabel={`Cancel friend request to ${userSearchResult.name}`}
              >
                <FontAwesome5 name="clock" size={24} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, styles.addButtonBlue]}
                onPress={handleSendFriendRequest}
                accessibilityLabel={`Send friend request to ${userSearchResult.name}`}
              >
                <FontAwesome5 name="user-plus" size={24} color="white" />
              </TouchableOpacity>
            )}
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
    marginLeft: 5,
  },
  addButtonBlue: {
    backgroundColor: "#007BFF",
  },
  addButtonGreen: {
    backgroundColor: "#28a745",
  },
  addButtonRed: {
    backgroundColor: "#dc3545",
  },
  addButtonYellow: {
    backgroundColor: "#ffc107",
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
