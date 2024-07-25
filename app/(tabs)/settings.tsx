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
          <Text style={styles.settingTitle}>Account</Text>
          <Text style={styles.settingDescription}>Manage your account settings</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/notifications')}>
          <Text style={styles.settingTitle}>Notifications</Text>
          <Text style={styles.settingDescription}>Customize your notifications</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/privacy')}>
          <Text style={styles.settingTitle}>Privacy</Text>
          <Text style={styles.settingDescription}>Adjust your privacy settings</Text>
        </TouchableOpacity>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/help')}>
          <Text style={styles.settingTitle}>Help</Text>
          <Text style={styles.settingDescription}>Get support and help</Text>
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
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
});