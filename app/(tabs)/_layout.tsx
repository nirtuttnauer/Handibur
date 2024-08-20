import React from 'react';
import { Image, Pressable } from 'react-native';
import { Tabs, Link } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import Colors from '@/constants/Colors';

import HistoryIcon from '@/assets/icons/Phone.png';
import CallIcon from '@/assets/icons/chats.png';
import SettingsIcon from '@/assets/icons/Settings.png';

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'צ׳אטים',
          tabBarIcon: ({ color }) => (
            <Image source={CallIcon} style={{ tintColor: color, width: 24, height: 24 }} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Image
                    source={require('@/assets/icons/info.png')} 
                    style={{
                      marginRight: 15,
                      opacity: pressed ? 0.5 : 1,
                      width: 25,
                      height: 25,
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
