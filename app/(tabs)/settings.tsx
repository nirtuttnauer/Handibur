import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme'; // Import the hook for detecting color scheme

export default function TabSettings() {
  const router = useRouter();
  const colorScheme = useColorScheme(); // Detect system color scheme
  const isDarkMode = colorScheme === 'dark'; // Determine if dark mode is active

  return (
    <ScrollView style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/account')}>
          <Text style={[styles.settingTitle, isDarkMode ? styles.darkText : styles.lightText]}>הגדרות משתמש</Text>
          <Text style={[styles.settingDescription, isDarkMode ? styles.darkSubText : styles.lightSubText]}>נהל את הגדרות המשתמש שלך</Text>
        </TouchableOpacity>
        <View style={[styles.separator, isDarkMode ? styles.darkSeparator : styles.lightSeparator]} />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/notifications')}>
          <Text style={[styles.settingTitle, isDarkMode ? styles.darkText : styles.lightText]}>התראות</Text>
          <Text style={[styles.settingDescription, isDarkMode ? styles.darkSubText : styles.lightSubText]}>נהל את ההתראות שלך</Text>
        </TouchableOpacity>
        <View style={[styles.separator, isDarkMode ? styles.darkSeparator : styles.lightSeparator]} />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/privacy')}>
          <Text style={[styles.settingTitle, isDarkMode ? styles.darkText : styles.lightText]}>פרטיות</Text>
          <Text style={[styles.settingDescription, isDarkMode ? styles.darkSubText : styles.lightSubText]}>נהל את הגדרות הפרטיות שלך</Text>
        </TouchableOpacity>
        <View style={[styles.separator, isDarkMode ? styles.darkSeparator : styles.lightSeparator]} />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/help')}>
          <Text style={[styles.settingTitle, isDarkMode ? styles.darkText : styles.lightText]}>עזרה</Text>
          <Text style={[styles.settingDescription, isDarkMode ? styles.darkSubText : styles.lightSubText]}>קבל עזרה ותמיכה טכנית</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lightContainer: {
    backgroundColor: '#fff', // White background for light mode
  },
  darkContainer: {
    backgroundColor: '#000', // Black background for dark mode
  },
  separator: {
    height: 1,
    width: '100%',
  },
  lightSeparator: {
    backgroundColor: '#eee',
  },
  darkSeparator: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 20,
  },
  settingItem: {
    paddingVertical: 15,
    alignItems: 'flex-end', // Aligns the text to the right
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'right', // Aligns the title text to the right
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'right', // Aligns the description text to the right
  },
  lightText: {
    color: '#000', // Black text for light mode
  },
  darkText: {
    color: '#fff', // White text for dark mode
  },
  lightSubText: {
    color: '#888', // Gray text for light mode
  },
  darkSubText: {
    color: '#aaa', // Light gray text for dark mode
  },
});
