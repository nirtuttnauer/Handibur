import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/context/supabaseClient';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme'; // Import the hook for detecting color scheme

// Import your custom icons
import IncomingIcon from '../../assets/icons/incoming.png';
import OutgoingIcon from '../../assets/icons/outgoing.png';

const avatars = [
  require('../../assets/avatars/avatar1.png'),
  require('../../assets/avatars/avatar2.png'),
  require('../../assets/avatars/avatar3.png'),
  require('../../assets/avatars/avatar4.png'),
  require('../../assets/avatars/avatar5.png'),
  require('../../assets/avatars/avatar6.png'),
];

export default function TabHistory() {
  const [callHistory, setCallHistory] = useState([]);
  const [userProfiles, setUserProfiles] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme(); // Detect system color scheme
  const isDarkMode = colorScheme === 'dark'; // Determine if dark mode is active

  useEffect(() => {
    const fetchCallHistory = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('call_history')
          .select('*')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('call_start', { ascending: false });

        if (error) throw error;

        setCallHistory(data || []);
      } catch (error) {
        console.error('Error fetching call history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallHistory();
  }, [user?.id]);

  useEffect(() => {
    if (callHistory.length === 0) return;

    const fetchUserProfiles = async () => {
      setProfilesLoading(true);

      const uniqueUserIds = new Set();
      callHistory.forEach(call => {
        uniqueUserIds.add(call.caller_id);
        uniqueUserIds.add(call.receiver_id);
      });

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, username, profile_image')
          .in('user_id', Array.from(uniqueUserIds));

        if (error) throw error;

        const profilesMap = new Map();
        data.forEach(profile => profilesMap.set(profile.user_id, profile));
        setUserProfiles(profilesMap);
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchUserProfiles();
  }, [callHistory]);

  const renderCallHistoryItem = ({ item }) => {
    const isCaller = item.caller_id === user?.id;
    const otherUserId = isCaller ? item.receiver_id : item.caller_id;
    const userProfile = userProfiles.get(otherUserId);
    const userName = userProfile?.username || "Unknown";
    const userAvatarIndex = userProfile?.profile_image || 0;
    const userProfilePic = avatars[userAvatarIndex];
    const callIcon = isCaller ? OutgoingIcon : IncomingIcon;
    const callStart = new Date(item.call_start);

    const callDateFormatter = new Intl.DateTimeFormat('he-IL', {
      day: 'numeric',
      month: 'short',
    });
    const callDate = callDateFormatter.format(callStart);
    const callTime = callStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={[
          styles.item,
          isDarkMode ? styles.darkItem : styles.lightItem,
        ]}
      >
        <Image source={userProfilePic} style={styles.avatar} />
        <View style={[styles.callInfo, isDarkMode ? styles.darkCallInfo : styles.lightCallInfo]}>
          <Text style={[styles.name, isDarkMode ? styles.darkText : styles.lightText]}>{userName}</Text>
          <View style={styles.callDetails}>
            <Image source={callIcon} style={{ width: 20, height: 20 }} />
            <Text style={[styles.callStatus, isDarkMode ? styles.darkSubText : styles.lightSubText]}>{isCaller ? 'שיחה יוצאת' : 'שיחה נכנסת'}</Text>
          </View>
        </View>
        <View style={styles.callOptions}>
          <Text style={[styles.callDateTime, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
            {callDate} {callTime}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || profilesLoading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkLoadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>שיחות אחרונות</Text>
      <FlashList
        data={callHistory}
        renderItem={renderCallHistoryItem}
        keyExtractor={(item) => item.call_id.toString()}
        estimatedItemSize={70}
        ListEmptyComponent={() => <Text style={[styles.emptyMessage, isDarkMode ? styles.darkText : styles.lightText]}>No call history found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  lightContainer: {
    backgroundColor: '#fff', // White background for light mode
  },
  darkContainer: {
    backgroundColor: '#000', // Black background for dark mode
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkLoadingContainer: {
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'right',
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  lightItem: {
    borderBottomColor: '#eee',
    backgroundColor: '#fff', // Set light background for light mode
  },
  darkItem: {
    borderBottomColor: '#444',
    backgroundColor: '#000', // Set dark background for dark mode
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 15,
  },
  callInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  lightCallInfo: {
    backgroundColor: '#fff', // Ensure white background for call info in light mode
  },
  darkCallInfo: {
    backgroundColor: '#000', // Ensure black background for call info in dark mode
  },
  name: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'right',
  },
  callDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 5,
  },
  callStatus: {
    fontSize: 14,
    marginRight: 5,
  },
  lightSubText: {
    color: '#888',
  },
  darkSubText: {
    color: '#aaa',
  },
  callOptions: {
    alignItems: 'flex-start',
  },
  callDateTime: {
    fontSize: 12,
    textAlign: 'right',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
});
