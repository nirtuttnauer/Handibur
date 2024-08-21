import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert, View } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';
import { Menu, MenuItem } from 'react-native-material-menu';

type Contact = {
  id: string;
  name: string;
  phone: string;
  imageUri: string;
};

type FriendRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  requester_name?: string;
  recipient_name?: string;
  requester_imageUri?: string;
  recipient_imageUri?: string;
};

export default function FriendsModal() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [friends, setFriends] = useState<Contact[]>([]); // Store friend contacts
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]); // Store pending friend requests
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]); // Store sent friend requests
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]); // Store received friend requests
  const [visibleMenu, setVisibleMenu] = useState<string | null>(null); // Track which menu is open
  const { user } = useAuth(); // Get current user

  const defaultImageUri = 'https://via.placeholder.com/50'; // Placeholder image URL

  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      const userId = user?.id;

      const fetchFriends = supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);

      const fetchRequests = supabase
        .from('friend_requests')
        .select('id, requester_id, recipient_id, status')
        .or(`recipient_id.eq.${userId},requester_id.eq.${userId}`)
        .eq('status', 'pending');

      const [{ data: friendsData }, { data: requestsData }] = await Promise.all([fetchFriends, fetchRequests]);

      if (friendsData) {
        // Fetch contact details for each friend
        const friendDetails = await Promise.all(
          friendsData.map(async (friend) => {
            const { data: userData, error } = await supabase
              .from('user_profiles')
              .select('user_id, username, phone, profile_image') // Select the profile_image
              .eq('user_id', friend.friend_id)
              .single();

            if (error) {
              console.error("Error fetching friend details: ", error);
              return null;
            }

            return {
              id: userData.user_id,
              name: userData.username || "Unknown",
              phone: userData.phone || 'N/A',
              imageUri: userData.profile_image || defaultImageUri, // Use profile image or fallback to default
            };
          })
        );

        setFriends(friendDetails.filter(Boolean) as Contact[]);
      }

      if (requestsData) {
        const sent = requestsData.filter(request => request.requester_id === userId);
        const received = requestsData.filter(request => request.recipient_id === userId);

        // Fetch user details for the requester and recipient if not already in contacts
        const fetchUserDetails = async (userId: string) => {
          const contact = contacts.find(contact => contact.id === userId);
          if (!contact) {
            const { data: userData, error } = await supabase
              .from('user_profiles')
              .select('user_id, username, phone, profile_image') // Select the profile_image
              .eq('user_id', userId)
              .single();

            if (error) {
              console.error("Error fetching user details: ", error);
              return null;
            }

            return {
              id: userData.user_id,
              name: userData.username || "Unknown",
              imageUri: userData.profile_image || defaultImageUri, // Use profile image or fallback to default
            };
          }
          return contact;
        };

        const detailedRequests = await Promise.all(requestsData.map(async request => {
          const requesterDetails = await fetchUserDetails(request.requester_id);
          const recipientDetails = await fetchUserDetails(request.recipient_id);

          return {
            ...request,
            requester_name: requesterDetails?.name,
            requester_imageUri: requesterDetails?.imageUri,
            recipient_name: recipientDetails?.name,
            recipient_imageUri: recipientDetails?.imageUri,
          };
        }));

        setPendingRequests(detailedRequests);
        setSentRequests(detailedRequests.filter(request => request.requester_id === userId));
        setReceivedRequests(detailedRequests.filter(request => request.recipient_id === userId));
      }
    };

    fetchFriendsAndRequests();
  }, [user]);

  const handleChat = (item: Contact) => {
    router.back();
    router.push({
      pathname: `/chat/${item.id}`,
      params: { targetUserName: item.name },  // Pass additional params like the username if needed
    });
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user?.id)
        .eq('friend_id', friendId);

      if (error) {
        Alert.alert("Error", "Could not unfriend the user. Please try again.");
      } else {
        setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));
        Alert.alert("Success", "User has been unfriended.");
      }
    } catch (error) {
      console.error("Error unfriending user: ", error);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
        // Add the requester to the friends table
        const { error: friendError } = await supabase
            .from('friends')
            .insert([
                { user_id: user.id, friend_id: requesterId },
                { user_id: requesterId, friend_id: user.id } // Add both sides of the friendship
            ]);

        if (friendError) {
            Alert.alert("Error", "Could not accept the friend request.");
            return;
        }

        // Delete the friend request after accepting
        const { error: requestError } = await supabase
            .from('friend_requests')
            .delete()
            .eq('requester_id', requesterId)
            .eq('recipient_id', user.id);

        if (requestError) {
            Alert.alert("Error", "Could not delete the friend request.");
            return;
        }

        // Fetch the newly added friend details
        const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('user_id, username, phone, profile_image')
            .eq('user_id', requesterId)
            .single();

        if (userError) {
            console.error("Error fetching user details: ", userError);
        } else {
            const newFriend = {
                id: userData.user_id,
                name: userData.username || "Unknown",
                phone: userData.phone || 'N/A',
                imageUri: userData.profile_image || defaultImageUri, // Use profile image or fallback to default
            };
            setFriends(prevFriends => [...prevFriends, newFriend]);
            setReceivedRequests(prevRequests => prevRequests.filter(request => request.requester_id !== requesterId));
            Alert.alert("Success", "Friend request accepted.");
        }
    } catch (error) {
        console.error("Error accepting friend request: ", error);
    }
};

  const handleDeclineRequest = async (requesterId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete() // Delete the request if declined
        .eq('requester_id', requesterId)
        .eq('recipient_id', user.id);

      if (error) {
        Alert.alert("Error", "Could not decline the friend request.");
      } else {
        setReceivedRequests(receivedRequests.filter(request => request.requester_id !== requesterId));
        Alert.alert("Declined", "Friend request declined.");
      }
    } catch (error) {
      console.error("Error declining friend request: ", error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete() // Delete the request if canceled
        .eq('id', requestId);

      if (error) {
        Alert.alert("Error", "Could not cancel the friend request.");
      } else {
        setSentRequests(sentRequests.filter(request => request.id !== requestId));
        Alert.alert("Canceled", "Friend request canceled.");
      }
    } catch (error) {
      console.error("Error canceling friend request: ", error);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      onPress={() => handleChat(item)}
      onLongPress={() => setVisibleMenu(item.id)}  // Open menu on long press
    >
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: item.imageUri || defaultImageUri }} // Use profile image or fallback to default
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
          onPress={() => handleChat(item)}
          accessibilityLabel={`Chat with ${item.name}`}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="white" />
        </TouchableOpacity>

        {/* Render menu for the contact */}
        {visibleMenu === item.id && (
          <Menu
            visible={true}
            anchor={<View />}  // Invisible anchor
            onRequestClose={() => setVisibleMenu(null)}
          >
            <MenuItem onPress={() => {
              handleUnfriend(item.id);
              setVisibleMenu(null);
            }}>
              Unfriend
            </MenuItem>
          </Menu>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPendingRequest = ({ item }: { item: FriendRequest }) => {
    const isRecipient = item.recipient_id === user.id;
    const otherUserId = isRecipient ? item.requester_id : item.recipient_id;
    const otherUserName = isRecipient ? item.requester_name : item.recipient_name;
    const otherUserImageUri = isRecipient ? item.requester_imageUri : item.recipient_imageUri;

    return (
      <View style={styles.item} key={item.id}>
        <Image
          source={{ uri: otherUserImageUri || defaultImageUri }} // Use profile image or fallback to default
          style={styles.avatar}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.name} accessibilityLabel={`Name: ${otherUserName || 'Unknown'}`}>
            {otherUserName || 'Unknown'}
          </Text>
        </View>
        {isRecipient ? (
          <>
            <TouchableOpacity
              style={[styles.requestButton, styles.acceptButton]}
              onPress={() => handleAcceptRequest(item.requester_id)}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.requestButton, styles.declineButton]}
              onPress={() => handleDeclineRequest(item.requester_id)}
            >
              <Ionicons name="close-circle" size={24} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.requestButton, styles.cancelButton]}
            onPress={() => handleCancelRequest(item.id)}
          >
            <Ionicons name="close-circle" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,  // Ensure the header is shown
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Manage Friends</Text>
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
      <Text style={styles.sectionTitle}>Pending Received Requests</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={receivedRequests}
          renderItem={renderPendingRequest}
          keyExtractor={(item) => item.id}
          estimatedItemSize={70}
        />
      </View>
      <Text style={styles.sectionTitle}>Pending Sent Requests</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={sentRequests}
          renderItem={renderPendingRequest}
          keyExtractor={(item) => item.id}
          estimatedItemSize={70}
        />
      </View>
      <Text style={styles.sectionTitle}>Friends List</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={friends}
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
  requestButton: {
    padding: 10,
    borderRadius: 25,
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  declineButton: {
    backgroundColor: "#dc3545",
  },
  cancelButton: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
});
