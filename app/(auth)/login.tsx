'use strict';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { TextInput, TouchableOpacity, StyleSheet,Image, ImageBackground } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { logIn } = useAuth();
  const [storedCredentials, setStoredCredentials] = useState<any | null>(null);

  const handleLogin = async () => {
    try {
      setError('');
      if (email !== null && password !== null && email !== '' && password !== '') {
        await logIn(email, password);
      }
      else {
        setError('אנא מלא את כל השדות');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.innerContainer}>
          <Stack.Screen options={{ headerShown: false }} />
          <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} />
          <Text style={styles.title}>ברוכים הבאים!</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="gray"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            placeholderTextColor="gray"
          />
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin} testID="login">
            <Text style={styles.buttonTextPrimary}>התחברות</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.push('/register')}>
            <Text style={styles.buttonTextSecondary}>הרשמה</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F8FA',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E6AF3',
    marginBottom: 40,
    marginTop: 70,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#CCCCCC',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    color: 'black',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    width: '100%',
    height: 50,
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
  },
  buttonSecondary: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Login;