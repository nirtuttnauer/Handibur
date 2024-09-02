import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

const ThankYou = () => {
  const router = useRouter();
  const colorScheme = useColorScheme(); // Detect system color scheme
  const isDarkMode = colorScheme === 'dark';

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.thankYouText, isDarkMode && styles.darkThankYouText]}>תודה על ההרשמה!</Text>
      <Text style={[styles.subText, isDarkMode && styles.darkSubText]}>
        מייל לאישור ההרשמה נשלח אליכם כעת. 
      </Text>
      <TouchableOpacity style={[styles.button, isDarkMode && styles.darkButton]} onPress={() => router.push('/login')}>
        <Text style={[styles.buttonText, isDarkMode && styles.darkButtonText]}>להתחברות</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  thankYouText: {
    fontSize: 26,
    fontWeight: '500',
    color: '#2E6AF3',
    marginBottom: 16,
    textAlign: 'center',
  },
  darkThankYouText: {
    color: '#ffffff',
  },
  subText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
  },
  darkSubText: {
    color: '#cccccc',
  },
  button: {
    width: 200,
    height: 50,
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  darkButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  darkButtonText: {
    color: '#dddddd',
  },
});

export default ThankYou;
