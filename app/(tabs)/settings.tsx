import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function TabSettings() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#330985', '#FF5CC7', '#FFB8EA']} // Adjust your gradient colors here
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/account')}>
            <Text style={styles.settingTitle}>חשבון</Text>
            <Text style={styles.settingDescription}>ניהול הגדרות החשבון שלך</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/notifications')}>
            <Text style={styles.settingTitle}>התראות</Text>
            <Text style={styles.settingDescription}>התאמה אישית של ההתראות שלך</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/privacy')}>
            <Text style={styles.settingTitle}>פרטיות</Text>
            <Text style={styles.settingDescription}>התאמת הגדרות הפרטיות שלך</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(settings)/help')}>
            <Text style={styles.settingTitle}>עזרה</Text>
            <Text style={styles.settingDescription}>קבלת תמיכה ועזרה</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent', // Transparent background to show the gradient
    justifyContent: 'flex-start',
  },
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: '#888', // Match the separator color with the theme
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent', // Ensure content background is transparent
  },
  settingItem: {
    paddingVertical: 15,
    backgroundColor: 'transparent', // Transparent background to show the gradient
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff', // White color for text
    textAlign: 'right', // Align text to the right for Hebrew
  },
  settingDescription: {
    fontSize: 14,
    color: '#ccc', // Light grey color for description
    marginTop: 5,
    textAlign: 'right', // Align text to the right for Hebrew
  },
});
