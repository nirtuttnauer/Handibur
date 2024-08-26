import React from 'react';
import { Image, Pressable } from 'react-native';
import { Tabs, Link } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

import HistoryIcon from '../../assets/icons/Phone.png';
import CallIcon from '../../assets/icons/chats.png';
import SettingsIcon from '../../assets/icons/Settings.png';
import PlusIcon from '../../assets/icons/plus.png';
import Contacts from '../../assets/icons/contactsbook.png';

// Import your GIF
import BlueHandsGif from '../../assets/images/blueHands.gif';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E6AF3',
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.25,
          shadowRadius: 5,
          elevation: 5,
          position: 'relative',
        },
        headerTitleAlign: 'center',
        headerLeftContainerStyle: { paddingLeft: 15 },
        headerRightContainerStyle: { paddingRight: 15 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'צ׳אטים',
          tabBarIcon: ({ color }) => (
            <Image source={CallIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
          headerLeft: () => (
            <Link href="/addFriendsModal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Image
                    source={PlusIcon}
                    style={{
                      width: 20,
                      height: 20,
                      tintColor: pressed ? '#2E6AF3' : '#000',
                    }}
                  />
                )}
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Link href="/friendsModal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Image
                    source={Contacts}
                    style={{
                      width: 30,
                      height: 30,
                      resizeMode: 'contain',
                      tintColor: pressed ? '#2E6AF3' : '#000',
                    }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'היסטוריה', // Title shown in the tab bar
          headerTitle: () => (
            <Image 
              source={BlueHandsGif} 
              style={{ width: 170, height: 170 }} 
            />
          ),
          tabBarIcon: ({ color }) => (
            <Image source={HistoryIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות', // Title shown in the tab bar
          headerTitle: () => (
            <Image 
              source={BlueHandsGif} 
              style={{ width: 170, height: 170 }}
            />
          ),
          tabBarIcon: ({ color }) => (
            <Image source={SettingsIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
        }}
      />
    </Tabs>
  );
}
