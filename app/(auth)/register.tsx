import React, { useState } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView, Platform, View, Text } from 'react-native';
import { useAuth } from '@/context/auth';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/context/supabaseClient';

const avatars = [
  require('../../assets/avatars/avatar1.png'),
  require('../../assets/avatars/avatar2.png'),
  require('../../assets/avatars/avatar3.png'),
  require('../../assets/avatars/avatar4.png'),
  require('../../assets/avatars/avatar5.png'),
  require('../../assets/avatars/avatar6.png'),
];

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]); // Default avatar
  const [signLanguage, setSignLanguage] = useState(false); // Sign Language Speaker option
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const checkUsernameUnique = async (username: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();

    return !data;
  };

  const checkEmailUnique = async (email: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single();

    return !data;
  };

  const checkPhoneUnique = async (phone: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('phone', phone)
      .single();

    return !data;
  };

  const isStrongPassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  };

  const handleRegister = async () => {
    setError('');
  
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
  
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters long, and include uppercase, lowercase, numbers, and special characters.');
      return;
    }
  
    // Convert the username to lowercase before checking for uniqueness and saving
    const normalizedUsername = username.trim().toLowerCase();
  
    // Check uniqueness for email, username, and phone
    const [isUsernameUnique, isEmailUnique, isPhoneUnique] = await Promise.all([
      checkUsernameUnique(normalizedUsername),
      checkEmailUnique(email),
      checkPhoneUnique(phone),
    ]);
  
    if (!isUsernameUnique) {
      setError('Username already exists');
      return;
    }
  
    if (!isEmailUnique) {
      setError('Email already exists');
      return;
    }
  
    if (!isPhoneUnique) {
      setError('Phone number already exists');
      return;
    }
  
    try {
      // Sign up without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
  
      if (error) throw error;
  
      // Insert user details into the user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user?.id,
          username: normalizedUsername, // Store username in lowercase
          phone: phone,
          email: email,
          sign: signLanguage,
          profile_image: avatar, // Assuming avatar is a URL or relative path to the image
        });
  
      if (profileError) throw profileError;
  
      // If sign-up and profile insertion are successful, navigate to the thank you page
      router.push('/thankyou');
    } catch (err: any) {
      setError(`An error occurred during signup: ${err.message}`);
    }
  };
  

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/login')}>
          <Image source={require('@/assets/icons/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        <Image source={require('@/assets/images/LOGO.png')} style={styles.logo} />
        <Text style={[styles.title, { textAlign: 'center', lineHeight: 30 }]}>
          נעים להכיר!{"\n"}קצת פרטים ונתחיל לדבר :)
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { textAlign: 'right' }]}
            value={email}
            onChangeText={setEmail}
            placeholder="אימייל"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="gray"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { textAlign: 'right' }]}
            value={username}
            onChangeText={setUsername}
            placeholder="שם משתמש"
            autoCapitalize="none"
            placeholderTextColor="gray"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { textAlign: 'right' }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="מספר טלפון"
            keyboardType="phone-pad"
            placeholderTextColor="gray"
          />
        </View>

        {/* Avatar selection */}
        <View style={styles.avatarContainer}>
          {avatars.map((src, index) => (
            <TouchableOpacity key={index} onPress={() => setAvatar(src)}>
              <Image
                source={src}
                style={[
                  styles.avatar,
                  avatar === src && styles.selectedAvatar, // Highlight selected avatar
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Language Speaker Option */}
        <View style={styles.signLanguageContainer}>
          <Text style={styles.signLanguageLabel}>דובר שפת הסימנים</Text>
          <View style={styles.signLanguageOptions}>
            <TouchableOpacity onPress={() => setSignLanguage(true)}>
              <Text style={[styles.signLanguageOption, signLanguage === true && styles.selectedOption]}>כן</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSignLanguage(false)}>
              <Text style={[styles.signLanguageOption, signLanguage === false && styles.selectedOption]}>לא</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.passwordContainer}>
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setPasswordVisible(!passwordVisible)}>
            <Image
              source={
                passwordVisible
                  ? require('@/assets/icons/openeye.png')
                  : require('@/assets/icons/closedeye.png')
              }
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { textAlign: 'right', flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה"
            secureTextEntry={!passwordVisible}
            placeholderTextColor="gray"
          />
        </View>

        <View style={styles.passwordContainer}>
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setPasswordVisible(!passwordVisible)}>
            <Image
              source={
                passwordVisible
                  ? require('@/assets/icons/openeye.png')
                  : require('@/assets/icons/closedeye.png')
              }
              style={styles.eyeIcon}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { textAlign: 'right', flex: 1 }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="אישור"
            secureTextEntry={!passwordVisible}
            placeholderTextColor="gray"
            textContentType="none"
            autoComplete="off"
          />
        </View>

        <TouchableOpacity style={styles.buttonSecondary} onPress={handleRegister}>
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
  avatarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#2E6AF3',
  },
  signLanguageContainer: {
    width: 358,
    marginBottom: 16,
    padding: 16,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(190, 190, 190, 0.8)',
  },
  signLanguageLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  signLanguageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  signLanguageOption: {
    fontSize: 18,
    color: 'gray',
  },
  selectedOption: {
    color: '#2E6AF3',
    fontWeight: 'bold',
  },
});

export default Register;
