import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useAuth } from '@/context/auth';
import { Stack, useRouter } from 'expo-router';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await signUp(email, password);
      router.push('/'); // Redirect to home or desired page
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80} // Adjust based on your layout
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} />
        <Text style={styles.title}>נעים להכיר! קצת פרטים ונתחיל לדבר :)</Text>
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
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor="gray"
        />
        <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister}>
          <Text style={styles.buttonTextPrimary}>התחברות</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.push('/login')}>
          <Text style={styles.buttonTextSecondary}>הרשמה</Text>
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
    backgroundColor: '#F7F8FA',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E6AF3',
    marginBottom: 40,
    textAlign: 'center',
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

export default Register;