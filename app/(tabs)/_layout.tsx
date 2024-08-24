import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Tabs, Link } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Colors from '@/constants/Colors';

import HistoryIcon from '@/assets/icons/Phone.png';
import CallIcon from '@/assets/icons/chats.png';
import SettingsIcon from '@/assets/icons/Settings.png';
import { FontAwesome5 } from '@expo/vector-icons'; // Import FontAwesome5
import PlusIcon from '@/assets/icons/plus.png'; // Adjust the path to your icon
import Contacts from '@/assets/icons/contactsbook.png';



export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E6AF3',
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',  // Set background color to white
          paddingVertical: 10,
          shadowColor: '#000',  
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.25,
          shadowRadius: 5,
          elevation: 5,
          position: 'relative',  // Set position relative for natural layout
        },
        headerTitleAlign: 'center',  // Ensure the title stays centered
        headerLeftContainerStyle: {
          paddingLeft: 15,  // Adjust padding to align with your design
        },
        headerRightContainerStyle: {
          paddingRight: 15,  // Adjust padding to align with your design
        },
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
                    source={PlusIcon} // Use your custom plus icon
                    style={{
                      width: 20, // Adjust the width as needed
                      height: 20, // Adjust the height as needed
                      tintColor: pressed ? '#2E6AF3' : '#000', // Apply tintColor for press effect
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
                  source={Contacts} // Use your custom logo image
                  style={{
                    width: 30,  // Adjust the width as needed
                    height: 30, // Adjust the height as needed
                    resizeMode: 'contain', // Ensure the logo fits well
                    tintColor: pressed ? '#2E6AF3' : '#000', // Apply tintColor for press effect
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
          title: 'היסטוריה',
          tabBarIcon: ({ color }) => (
            <Image source={HistoryIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ color }) => (
            <Image source={SettingsIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
        }}
      />
    </Tabs>
  );
}
