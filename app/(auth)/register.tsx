import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { View, Text } from '@/components/Themed';
import { useAuth } from '@/context/auth';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import logoImage from '@/assets/images/logo1.png';
import { Image } from 'react-native';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('אנא מלא את כל השדות');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
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
    <LinearGradient
      colors={['#330985', '#FF5CC7' , '#FFB8EA' ]}
      style={styles.background}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Image source={logoImage} style={styles.logo} />
      <View style={styles.container}>
        <Text style={styles.title}>הרשמה</Text>
        <Text style={styles.subtitle}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="שם משתמש"
          autoCapitalize="none"
          placeholderTextColor="gray"
        />
        <Text style={styles.subtitle}>אימייל</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="אימייל"
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
        <Text style={styles.subtitle}>אשר סיסמה</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="אשר סיסמה"
          secureTextEntry
          placeholderTextColor="gray"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>הרשמה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => router.back()}>
          <Text style={styles.buttonTextSecondary}>חזור</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    padding: 16,
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

export default Register;