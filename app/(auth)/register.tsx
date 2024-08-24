import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView, Platform, View, Text } from 'react-native';
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

        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')}>
           <View>
            <Image source={require('@/assets/icons/back.png')} style={styles.backIcon} />
            </View>
            </TouchableOpacity>

            <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} />
            <Text style={[styles.title, { textAlign: 'center', lineHeight: 30 }]}>
            נעים להכיר!
              {"\n"}
               קצת פרטים ונתחיל לדבר :)
               </Text>
               {error ? <Text style={styles.error}>{error}</Text> : null}
               <TextInput
          style={[styles.input, { textAlign: 'right' }]}  // Align text to the right
          value={email}
          onChangeText={setEmail}
          placeholder="אימייל"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="gray"
        />
        <TextInput
          style={[styles.input, { textAlign: 'right' }]}  // Align text to the right
          value={password}
          onChangeText={setPassword}
          placeholder="סיסמה"
          secureTextEntry
          placeholderTextColor="gray"
        />
        <TextInput
         style={[styles.input, { textAlign: 'right' }]}  // Align text to the right
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="אישור"
          secureTextEntry
          placeholderTextColor="gray"
        />
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
    backgroundColor: '#F5F5F5',
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
  input: {
    width: 358, // Matching the button's width
    height: 44, // Matching the button's height
    borderColor: '#CCCCCC',
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 5, // Matching the button's border radius
    backgroundColor: 'white',
    color: 'black',
    marginBottom: 16, // Ensure consistent margin
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    width: 358, // Matching the input's width
    height: 44, // Matching the input's height
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5, // Matching the input's border radius
    marginTop: 16,
  },
  buttonSecondary: {
    width: 358, // Matching the input's width
    height: 44, // Matching the input's height
    backgroundColor: '#2E6AF3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 16,
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  buttonTextSecondary: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 16,
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});


export default Register;