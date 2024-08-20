import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Text, View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';

type CallHistory = {
  call_id: number;
  caller_id: string;
  receiver_id: string;
  call_start: string;
  call_end: string;
  call_status: string;
};

type UserProfile = {
  user_id: string;
  username: string;
};

export default function TabHistory() {
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false); // Added state to manage profile loading
  const { user } = useAuth();

  useEffect(() => {
    const fetchCallHistory = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('call_history')
            .select('*')
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('call_start', { ascending: false });

          if (error) {
            throw error;
          }

          console.log('Call History Data:', data); // Debug log

          setCallHistory(data || []);
        }
      } catch (error) {
        console.error('Error fetching call history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallHistory();
  }, [user?.id]);

  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (callHistory.length === 0) {
        setProfilesLoading(false);
        return;
      }

      setProfilesLoading(true);
      
      const uniqueUserIds = new Set<string>();
      callHistory.forEach(call => {
        if (call.caller_id !== user?.id) uniqueUserIds.add(call.caller_id);
        if (call.receiver_id !== user?.id) uniqueUserIds.add(call.receiver_id);
      });

      console.log('Unique User IDs:', Array.from(uniqueUserIds)); // Debug log

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .in('user_id', Array.from(uniqueUserIds));

        if (error) {
          throw error;
        }

        console.log('Fetched User Profiles:', data); // Debug log

        const profilesMap = new Map<string, string>();
        data?.forEach((profile: UserProfile) => profilesMap.set(profile.user_id, profile.username));
        console.log('Profiles Map:', Array.from(profilesMap.entries())); // Debug log
        setUserProfiles(profilesMap);
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchUserProfiles();
  }, [callHistory, user?.id]);

  const renderCallHistoryItem = ({ item }: { item: CallHistory }) => {
    const isCaller = item.caller_id === user?.id;
    const otherUserId = isCaller ? item.receiver_id : item.caller_id;

    const userProfilePic = "https://via.placeholder.com/50"; // Replace with actual profile pic URL
    const userName = userProfiles.get(otherUserId) || "Unknown";

    console.log('Rendering Call Item:', {
      item,
      otherUserId,
      userName,
    }); // Debug log

    if (isCaller && otherUserId === user?.id) {
      return null;
    }

    const callIcon = isCaller ? "arrow-circle-right" : "arrow-circle-left";
    const callColor = isCaller ? "#34b7f1" : "#25D366"; // WhatsApp colors

    return (
      <TouchableOpacity style={styles.item}>
        <Image source={{ uri: userProfilePic }} style={styles.avatar} />
        <View style={styles.callInfo}>
          <Text style={styles.name}>{userName}</Text>
          <View style={styles.callDetails}>
            <FontAwesome name={callIcon} size={14} color={callColor} />
            <Text style={styles.callStatus}>{isCaller ? 'Outgoing' : 'Incoming'}</Text>
            <Text style={styles.callTime}>{new Date(item.call_start).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.callOptions}>
          <Text style={styles.callDate}>{new Date(item.call_start).toLocaleDateString()}</Text>
          <FontAwesome name="info-circle" size={20} color="#888" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || profilesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Calls</Text>
      <FlashList
        data={callHistory}
        renderItem={renderCallHistoryItem}
        keyExtractor={(item) => item.call_id.toString()}
        estimatedItemSize={70}
        ListEmptyComponent={() => <Text style={styles.emptyMessage}>No call history found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  callInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  callStatus: {
    fontSize: 14,
    color: '#888',
    marginLeft: 5,
  },
  callTime: {
    fontSize: 14,
    color: '#888',
    marginLeft: 5,
  },
  callOptions: {
    alignItems: 'flex-end',
  },
  callDate: {
    fontSize: 12,
    color: '#888',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    color: '#888',
  },
});