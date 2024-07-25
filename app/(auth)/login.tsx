'use strict';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, ImageBackground } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useAuth } from '@/context/auth';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import logoImage from '@/assets/images/logo1.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { logIn } = useAuth();

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
    <LinearGradient
      colors={['#330985', '#FF5CC7' , '#FFB8EA' ]} // Adjust your gradient colors here
      style={styles.background}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.title}>בואו נדבר :)</Text>
        <Text style={styles.subtitle}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="שם משתמש"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="gray"
        />
        <Text style={styles.subtitle}>סיסמה</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="סיסמה"
          secureTextEntry
          placeholderTextColor="gray"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPassword}>שכחת את הסיסמה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogin} testID="login">
          <Text style={styles.buttonText}>התחברות</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.push('/register')}>
          <Text style={styles.buttonTextSecondary}>הרשמה</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient> 
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
  },
  logo: {
    width: 120,
    height: 120,
    padding: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    color: 'black',
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  forgotPassword: {
    color: 'white',
    // width: '100%',
    marginBottom: 2,
    textAlign: 'right', // Align text to the right
    alignSelf: 'flex-end', // Align the subtitle to the end of the container
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2C3E50',
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
    borderColor: '#2C3E50',
    borderWidth: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Login;