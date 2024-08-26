import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, TouchableOpacity, Image, Alert, View } from "react-native";
import { Text } from "@/components/Themed";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient'; 
import { useAuth } from '@/context/auth';

const avatars = [
  require('../assets/avatars/avatar1.png'),
  require('../assets/avatars/avatar2.png'),
  require('../assets/avatars/avatar3.png'),
  require('../assets/avatars/avatar4.png'),
  require('../assets/avatars/avatar5.png'),
  require('../assets/avatars/avatar6.png'),
];

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
  const [friends, setFriends] = useState<Contact[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [visibleMenu, setVisibleMenu] = useState<string | null>(null);
  const { user } = useAuth();

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
        const friendDetails = await Promise.all(
          friendsData.map(async (friend) => {
            const { data: userData, error } = await supabase
              .from('user_profiles')
              .select('user_id, username, phone, profile_image')
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
              imageUri: userData.profile_image !== null ? avatars[userData.profile_image] : avatars[0],
            };
          })
        );

        setFriends(friendDetails.filter(Boolean) as Contact[]);
      }

      if (requestsData) {
        const sent = requestsData.filter(request => request.requester_id === userId);
        const received = requestsData.filter(request => request.recipient_id === userId);

        const fetchUserDetails = async (userId: string) => {
          const contact = contacts.find(contact => contact.id === userId);
          if (!contact) {
            const { data: userData, error } = await supabase
              .from('user_profiles')
              .select('user_id, username, phone, profile_image')
              .eq('user_id', userId)
              .single();

            if (error) {
              console.error("Error fetching user details: ", error);
              return null;
            }

            return {
              id: userData.user_id,
              name: userData.username || "Unknown",
              imageUri: userData.profile_image !== null ? avatars[userData.profile_image] : avatars[0],
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
      params: { targetUserName: item.name },
    });
  };

  const handleUnfriend = async (friendId: string) => {
    try {
      Alert.alert(
        "Unfriend",
        "This will unfriend this person and delete all of your chats. Are you sure?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Unfriend",
            style: "destructive",
            onPress: async () => {
              const { error: unfriendError } = await supabase
                .from('friends')
                .delete()
                .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`);

              if (unfriendError) {
                Alert.alert("Error", "Could not unfriend the user. Please try again.");
                return;
              }

              const { data: chatRoom, error: chatRoomError } = await supabase
                .from('chat_rooms')
                .select('room_id')
                .or(`and(user1_id.eq.${user?.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user?.id})`)
                .single();

              if (chatRoomError) {
                Alert.alert("Error", "Could not find the chat room to delete.");
                return;
              }

              const roomId = chatRoom.room_id;

              const { error: deleteMessagesError } = await supabase
                .from('messages')
                .delete()
                .eq('room_id', roomId);

              if (deleteMessagesError) {
                Alert.alert("Error", "Could not delete the chat messages.");
                return;
              }

              const { error: deleteChatRoomError } = await supabase
                .from('chat_rooms')
                .delete()
                .eq('room_id', roomId);

              if (deleteChatRoomError) {
                Alert.alert("Error", "Could not delete the chat room.");
                return;
              }

              setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));

              Alert.alert("Success", "User has been unfriended and the chat has been deleted.");
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Error unfriending user: ", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    try {
      const { error: friendError } = await supabase
        .from('friends')
        .insert([
          { user_id: user.id, friend_id: requesterId },
          { user_id: requesterId, friend_id: user.id }
        ]);

      if (friendError) {
        Alert.alert("Error", "Could not accept the friend request.");
        return;
      }

      const { error: requestError } = await supabase
        .from('friend_requests')
        .delete()
        .eq('requester_id', requesterId)
        .eq('recipient_id', user.id);

      if (requestError) {
        Alert.alert("Error", "Could not delete the friend request.");
        return;
      }

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
          imageUri: userData.profile_image !== null ? avatars[userData.profile_image] : avatars[0],
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
        .delete()
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
        .delete()
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

  const renderContact = ({ item }: { item: Contact }) => {
    const imageSource = typeof item.imageUri === 'number'
      ? item.imageUri // This is a local image resource from the avatars array
      : { uri: item.imageUri }; // This is a URI string
  
    return (
      <TouchableOpacity 
        onPress={() => handleChat(item)}
        onLongPress={() => setVisibleMenu(item.id)}
      >
        <View style={styles.item} key={item.id}>
          <Image
            source={imageSource}
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
  
          <TouchableOpacity
            style={styles.unfriendButton}
            onPress={() => handleUnfriend(item.id)}
            accessibilityLabel={`Unfriend ${item.name}`}
          >
            <Ionicons name="person-remove" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPendingRequest = ({ item }: { item: FriendRequest }) => {
    const isRecipient = item.recipient_id === user.id;
    const otherUserName = isRecipient ? item.requester_name : item.recipient_name;
    const otherUserImageUri = isRecipient ? item.requester_imageUri : item.recipient_imageUri;

    const imageSource = typeof otherUserImageUri === 'number' 
      ? otherUserImageUri // This is a local image resource from the avatars array
      : { uri: otherUserImageUri }; // This is a URI string
    return (
      <View style={styles.item} key={item.id}>
        <Image
          source={imageSource}
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
          headerShown: true,
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
  callButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 25,
    marginLeft: 10,
  },
  unfriendButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 25,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
});
