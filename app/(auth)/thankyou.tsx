import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const ThankYou = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.thankYouText}>Thank You for Signing Up!</Text>
      <Text style={styles.subText}>
        A confirmation email has been sent to your inbox. Please check your email to verify your account.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
        <Text style={styles.buttonText}>Go to Login</Text>
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
  thankYouText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E6AF3',
    marginBottom: 16,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
  },
  button: {
    width: 200,
    height: 50,
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ThankYou;
