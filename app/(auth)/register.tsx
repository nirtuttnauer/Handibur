import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView, Platform, View, Text } from 'react-native';
import { useAuth } from '@/context/auth';
import { Stack, useRouter } from 'expo-router';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false); // State for toggling password visibility
  const router = useRouter();
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('סיסמאות לא תואמות');
      return;
    }
    try {
      await signUp(email, password);
      router.push('/thankyou'); // Redirect to the "Thank You" page
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
                <View style={styles.inputContainer}>    
                <TextInput
                style={[styles.input, { textAlign: 'right' }]}  // Align text to the right
                value={email}
                onChangeText={setEmail}
                placeholder="אימייל"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="gray"
                />
               </View>
        {/* Password Container */}
        <View style={styles.passwordContainer}>
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setPasswordVisible(!passwordVisible)}>
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
            style={[styles.input, { textAlign: 'right', flex: 1 }]} // Flex to ensure it takes up available space
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה"
            secureTextEntry={!passwordVisible} // Toggles secureTextEntry based on state
            placeholderTextColor="gray"
          />
          </View>
          
          <View 
          style={styles.passwordContainer}>
            <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setPasswordVisible(!passwordVisible)}>
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
          style={[styles.input, { textAlign: 'right', flex: 1 }]} // Flex to ensure it takes up available space
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="אישור"
          secureTextEntry={!passwordVisible} // Toggles secureTextEntry based on state
          placeholderTextColor="gray"
          textContentType="none" // Prevents password autofill
          autoComplete="off"        />
        </View>

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
  inputContainer: {
    width: 358,
    borderColor: 'rgba(190, 190, 190, 0.8)',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    color: 'black',
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
  eyeIcon: {
    resizeMode: 'contain', 
  },
});

export default Register;