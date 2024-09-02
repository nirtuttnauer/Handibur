'use strict';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView, Platform, useColorScheme } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false); // State for toggling password visibility
  const router = useRouter();
  const { logIn } = useAuth();
  const colorScheme = useColorScheme(); // Detect system color scheme

  const isDarkMode = colorScheme === 'dark';

  const handleLogin = async () => {
    try {
      setError('');
      if (email && password) {
        await logIn(email, password);
      } else {
        setError('אנא מלא את כל השדות');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={[styles.container, isDarkMode && styles.darkContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image
          source={isDarkMode ? require('@/assets/images/darkLOGO.png') : require('@/assets/images/LOGO.png')}
          style={styles.logo}
        />
        <Text style={[styles.title, isDarkMode && styles.darkText]}>ברוכים הבאים!</Text>
        {error ? <Text style={[styles.error, isDarkMode && styles.darkText]}>{error}</Text> : null}

        {/* Email Container */}
        <View style={[styles.inputContainer, isDarkMode && styles.darkInputContainer]}>
          <TextInput
            style={[styles.input, { textAlign: 'right' }, isDarkMode && styles.darkInput]}
            value={email}
            onChangeText={setEmail}
            placeholder="אימייל"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={isDarkMode ? 'lightgray' : 'gray'}
          />
        </View>

        {/* Password Container */}
        <View style={[styles.passwordContainer, isDarkMode && styles.darkInputContainer]}>
          <TouchableOpacity style={[styles.eyeIconContainer, isDarkMode && styles.darkEyeIconContainer]} onPress={() => setPasswordVisible(!passwordVisible)}>
            <Image
              source={
                passwordVisible
                  ? require('@/assets/icons/openeye.png') // Replace with your open eye icon path
                  : require('@/assets/icons/closedeye.png') // Replace with your closed eye icon path
              }
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { textAlign: 'right', flex: 1 }, isDarkMode && styles.darkInput]} // Flex to ensure it takes up available space
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה"
            secureTextEntry={!passwordVisible} // Toggles secureTextEntry based on state
            placeholderTextColor={isDarkMode ? 'lightgray' : 'gray'}
          />
        </View>

        <TouchableOpacity style={[styles.buttonPrimary, isDarkMode && styles.darkButtonPrimary]} onPress={handleLogin} testID="login">
          <Text style={[styles.buttonTextPrimary, isDarkMode && styles.darkButtonTextPrimary]}>התחברות</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.push('/register')}>
          <Text style={[styles.buttonTextSecondary, isDarkMode && styles.darkButtonTextSecondary]}>אין לך חשבון? לחץ כאן!</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    fontFamily: 'Helvetica',
    color: '#2E6AF3',
    marginBottom: 24,
    marginTop: 24,
  },
  darkText: {
    color: '#ffffff',
  },
  inputContainer: {
    width: 358,
    borderColor: 'rgba(190, 190, 190, 0.8)',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  darkInputContainer: {
    borderColor: '#444',
    backgroundColor: '#333',
  },
  input: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    color: 'black',
  },
  darkInput: {
    backgroundColor: '#333',
    color: 'white',
  },
  passwordContainer: {
    flexDirection: 'row', // Arrange items horizontally
    alignItems: 'center',
    width: 358,
    borderColor: 'rgba(190, 190, 190, 0.8)',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  eyeIconContainer: {
    width: 44, // Fixed width for the icon container
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Same background as input
    borderTopLeftRadius: 5, // Match the overall container's border radius
    borderBottomLeftRadius: 5,
    borderRightWidth: 1, // Add a border to separate the icon from the input
    borderColor: 'rgba(190, 190, 190, 0.8)',
  },
  darkEyeIconContainer: {
    backgroundColor: '#333',
    borderColor: '#444',
  },
  eyeIcon: {
    resizeMode: 'contain', 
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    width: 358,
    height: 44,
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 16,
  },
  darkButtonPrimary: {
    backgroundColor: '#555',
  },
  buttonSecondary: {
    marginTop: 16,
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Helvetica',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  darkButtonTextPrimary: {
    color: '#dddddd',
  },
  buttonTextSecondary: {
    color: 'black',
    fontSize: 14,
    fontWeight: '400',
  },
  darkButtonTextSecondary: {
    color: '#ffffff',
  },
});

export default Login;
