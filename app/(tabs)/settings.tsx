import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';

export default function TabSettings() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/account')}>
          <Text style={styles.settingTitle}>הגדרות משתמש</Text>
          <Text style={styles.settingDescription}>נהל את הגדרות המשתמש שלך</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/notifications')}>
          <Text style={styles.settingTitle}>התראות</Text>
          <Text style={styles.settingDescription}>נהל את ההתראות שלך</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/privacy')}>
          <Text style={styles.settingTitle}>פרטיות</Text>
          <Text style={styles.settingDescription}>נהל את הגדרות הפרטיות שלך</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/help')}>
          <Text style={styles.settingTitle}>עזרה</Text>
          <Text style={styles.settingDescription}>קבל עזרה ותמיכה טכנית</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: '#eee',
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
    color: '#888',
    marginTop: 5,
    textAlign: 'right', // Aligns the description text to the right
  },
});
