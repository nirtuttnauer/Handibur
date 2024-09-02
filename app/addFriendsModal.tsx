import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';
import { useColorScheme } from 'react-native';  // Import useColorScheme

const avatars = [
  require('../assets/avatars/avatar1.png'),
  require('../assets/avatars/avatar2.png'),
  require('../assets/avatars/avatar3.png'),
  require('../assets/avatars/avatar4.png'),
  require('../assets/avatars/avatar5.png'),
  require('../assets/avatars/avatar6.png'),
];

const clockIcon = require('../assets/icons/clock.png');
const userCheckIcon = require('../assets/icons/user-check.png');
const userPlusIcon = require('../assets/icons/user-plus.png'); // Added the user-plus icon

type UserSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string;
  imageUri: number | null;
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
  
  const colorScheme = useColorScheme();  // Detect the current color scheme
  const isDarkMode = colorScheme === 'dark';  // Determine if dark mode is active

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
    const avatarIndex = data[0].profile_image;

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
      imageUri: avatarIndex !== null && avatarIndex >= 0 && avatarIndex < avatars.length ? avatars[avatarIndex] : null,
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
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={[styles.headerTitle, isDarkMode ? styles.darkHeaderTitle : styles.lightHeaderTitle]}>חפש חברים</Text>
            </View>
          ),
        }}
      />
      <TextInput
        style={[styles.searchInput, isDarkMode ? styles.darkSearchInput : styles.lightSearchInput]}
        onChangeText={setSearchQuery}
        value={searchQuery}
        placeholder="חיפוש לפי אימייל, שם משתמש או מספר טלפון..."
        placeholderTextColor={isDarkMode ? "#ccc" : "#888"}
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
                <Image
                  source={require('../assets/icons/clock.png')}
                  style={styles.avatar}
                />
              )}
            </TouchableOpacity>
            <View style={styles.contactInfo}>
              <Text style={[styles.name, isDarkMode ? styles.darkText : styles.lightText]} accessibilityLabel={`Name: ${userSearchResult.name}`}>
                {userSearchResult.name}
              </Text>
            </View>
            {userSearchResult.isFriend ? (
              <Image source={userCheckIcon} style={styles.statusIcon} />
            ) : userSearchResult.isRequestReceived ? (
              <>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleApproveFriendRequest}
                  accessibilityLabel={`Approve friend request from ${userSearchResult.name}`}
                >
                  <Image
                    source={require('../assets/icons/user-plus.png')}
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleDeclineFriendRequest}
                  accessibilityLabel={`Decline friend request from ${userSearchResult.name}`}
                >
                  <Image
                    source={require('../assets/icons/clock.png')}
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
              </>
            ) : userSearchResult.isRequestSent ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCancelFriendRequest}
                accessibilityLabel={`Cancel friend request to ${userSearchResult.name}`}
              >
                <Image source={clockIcon} style={styles.statusIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSendFriendRequest}
                accessibilityLabel={`Send friend request to ${userSearchResult.name}`}
              >
                <Image source={userPlusIcon} style={styles.statusIcon} />
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
    padding: 10,
  },
  lightContainer: {
    backgroundColor: "#fff",
  },
  darkContainer: {
    backgroundColor: "#1c1c1e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "400",
  },
  lightHeaderTitle: {
    color: 'black',
  },
  darkHeaderTitle: {
    color: 'white',
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
  },
  lightText: {
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  lightBorderColor: {
    borderBottomColor: "#eee",
  },
  darkBorderColor: {
    borderBottomColor: "#555",
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
    fontWeight: "400",
  },
  addButton: {
    padding: 10,
    borderRadius: 25,
  },
  searchInput: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderRadius: 10,
    marginBottom: 10,
    textAlign: 'right', // Align text from right to left
  },
  lightSearchInput: {
    backgroundColor: "#f0f0f0",
    color: "#000",
  },
  darkSearchInput: {
    backgroundColor: "#2c2c2e",
    color: "#fff",
  },
  statusIcon: {
    width: 30,
    height: 30,
  },
  actionIcon: {
    width: 30,
    height: 30,
  },
});

