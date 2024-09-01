import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/context/supabaseClient';
import { useColorScheme } from '@/components/useColorScheme'; // Import the hook for detecting color scheme

const avatars = [
  require('../../assets/avatars/avatar1.png'),
  require('../../assets/avatars/avatar2.png'),
  require('../../assets/avatars/avatar3.png'),
  require('../../assets/avatars/avatar4.png'),
  require('../../assets/avatars/avatar5.png'),
  require('../../assets/avatars/avatar6.png'),
];

const AccountSettings = () => {
  const { logOut, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ [key: string]: string | number } | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const colorScheme = useColorScheme(); // Detect system color scheme
  const isDarkMode = colorScheme === 'dark'; // Determine if dark mode is active

  const handleEditPress = (field: string) => {
    setEditingField(field);
    setFieldValue(profile?.[field]?.toString() || '');
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      Alert.alert('Error', 'Could not fetch profile information.');
      console.error(error);
    } else {
      setProfile(data);
      setIsSpeaker(data.sign);
    }
    setLoading(false);
  };

  const checkFieldUniqueness = async (field: string, value: string) => {
    const normalizedValue = field === 'username' ? value.trim().toLowerCase() : value.trim();
  
    const { count, error } = await supabase
      .from('user_profiles')
      .select(field, { count: 'exact' })
      .eq(field, normalizedValue)
      .neq('user_id', user.id);
  
    if (error) {
      console.error('Error checking field uniqueness:', error);
      return false;
    }
  
    return count === 0;
  };

  const handleSave = async () => {
    if (!fieldValue.trim()) {
      Alert.alert('Error', 'Field cannot be empty.');
      return;
    }
  
    const normalizedValue = editingField === 'username' ? fieldValue.trim().toLowerCase() : fieldValue.trim();
  
    if (['email', 'username', 'phone'].includes(editingField as string)) {
      const isUnique = await checkFieldUniqueness(editingField as string, normalizedValue);
      if (!isUnique) {
        Alert.alert('Error', `${editingField} is already in use.`);
        return;
      }
    }
  
    setIsSaving(true);
  
    const updates = { [editingField as string]: normalizedValue };
  
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', user.id);
  
    if (error) {
      Alert.alert('Error', `Failed to update ${editingField}.`);
      console.error(error);
    } else {
      if (editingField === 'email') {
        const { error: authError } = await supabase.auth.updateUser({
          email: normalizedValue,
        });
        if (authError) {
          Alert.alert('Error', 'Failed to update email in authentication.');
          console.error(authError);
        }
      }
      Alert.alert('Success', `${editingField} updated successfully.`);
      fetchUserProfile();
      setEditingField(null);
    }
  
    setIsSaving(false);
  };

  const handleAvatarSelect = async (avatarIndex: number) => {
    setIsSaving(true);
    const avatarUri = avatarIndex;
    const { error } = await supabase
      .from('user_profiles')
      .update({ profile_image: avatarUri })
      .eq('user_id', user.id);

    if (error) {
      Alert.alert('Error', 'Failed to update avatar.');
      console.error(error);
    } else {
      Alert.alert('Success', 'Avatar updated successfully.');
      fetchUserProfile();
      setAvatarModalVisible(false);
    }
    setIsSaving(false);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) throw authError;

      Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
      logOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSwitch = async () => {
    const newStatus = !isSpeaker;
    setIsSpeaker(newStatus);

    const { error } = await supabase
      .from('user_profiles')
      .update({ sign: newStatus })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating speaker status:', error.message);
    } else {
      Alert.alert('Success', 'Speaker status updated successfully.');
      fetchUserProfile();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E6AF3" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Text style={[styles.headerText, isDarkMode ? styles.darkText : styles.lightText]}>הגדרות משתמש</Text>

      {/* Avatar */}
      <View style={[styles.section, isDarkMode ? styles.darkSection : styles.lightSection]}>
        <Text style={[styles.label, isDarkMode ? styles.darkSubText : styles.lightSubText]}>אווטאר</Text>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
        >
          <Image
            source={profile?.profile_image ? avatars[profile.profile_image as number] : null}
            style={styles.avatar}
          />
          <Text style={[styles.changeAvatarText, isDarkMode ? styles.darkLinkText : styles.lightLinkText]}>שנה אווטאר</Text>
        </TouchableOpacity>
      </View>

      {/* Username */}
      <View style={[styles.section, isDarkMode ? styles.darkSection : styles.lightSection]}>
        <Text style={[styles.label, isDarkMode ? styles.darkSubText : styles.lightSubText]}>שם משתמש</Text>
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, isDarkMode ? styles.darkText : styles.lightText]}>{profile?.username}</Text>
          <TouchableOpacity
            style={[styles.editButton, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={() => handleEditPress('username')}
          >
            <Text style={styles.editButtonText}>ערוך</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email */}
      <View style={[styles.section, isDarkMode ? styles.darkSection : styles.lightSection]}>
        <Text style={[styles.label, isDarkMode ? styles.darkSubText : styles.lightSubText]}>אימייל</Text>
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, isDarkMode ? styles.darkText : styles.lightText]}>{(profile as any)?.email}</Text>
          <TouchableOpacity
            style={[styles.editButton, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={() => handleEditPress('email')}
          >
            <Text style={styles.editButtonText}>ערוך</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Phone */}
      <View style={[styles.section, isDarkMode ? styles.darkSection : styles.lightSection]}>
        <Text style={[styles.label, isDarkMode ? styles.darkSubText : styles.lightSubText]}>מספר טלפון</Text>
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, isDarkMode ? styles.darkText : styles.lightText]}>{(profile as any)?.phone || 'Not set'}</Text>
          <TouchableOpacity
            style={[styles.editButton, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={() => handleEditPress('phone')}
          >
            <Text style={styles.editButtonText}>ערוך</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Language Speaker */}
      <View style={[styles.section, isDarkMode ? styles.darkSection : styles.lightSection]}>
        <Text style={[styles.label, isDarkMode ? styles.darkSubText : styles.lightSubText]}>האם אתה דובר שפת סימנים?</Text>
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, isDarkMode ? styles.darkText : styles.lightText]}>{(profile as any)?.sign ? 'כן' : 'לא'}</Text>
          <Switch
            value={isSpeaker}
            onValueChange={toggleSwitch}
            thumbColor={isSpeaker ? '#4CAF50' : (isDarkMode ? '#666' : '#fff')}
            trackColor={{ false: (isDarkMode ? '#444' : '#ccc'), true: '#4CAF50' }}
            style={styles.switch}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[styles.logoutButton, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={logOut}>
        <Text style={styles.logoutButtonText}>התנתקות</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity
        style={[styles.deleteButton, isDarkMode ? styles.darkDeleteButton : styles.lightDeleteButton]}
        onPress={confirmDeleteAccount}
      >
        <Text style={styles.deleteButtonText}>מחיקת משתמש</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={!!editingField}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>
              Edit {editingField === 'sign' ? 'Sign Language Preference' : editingField}
            </Text>
            <TextInput
              style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
              value={fieldValue}
              onChangeText={setFieldValue}
              keyboardType={
                editingField === 'email'
                  ? 'email-address'
                  : editingField === 'phone'
                  ? 'phone-pad'
                  : 'default'
              }
              autoCapitalize="none"
              placeholder={`Enter new ${editingField}`}
              placeholderTextColor={isDarkMode ? '#999' : '#666'}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, isDarkMode ? styles.darkButton : styles.lightButton]}
                onPress={() => setEditingField(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSave, isDarkMode ? styles.darkButton : styles.lightButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '300' }}>שמור</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.avatarModalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>בחר אווטאר</Text>
            <ScrollView contentContainerStyle={styles.avatarOptions}>
              {avatars.map((src, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleAvatarSelect(index)}
                >
                  <Image source={src} style={styles.avatarOption} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButtonCancel, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'flex-end',
  },
  lightContainer: {
    backgroundColor: '#F7F9FC',
  },
  darkContainer: {
    backgroundColor: '#1c1c1c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    marginBottom: 30,
    textAlign: 'right',
    fontWeight: '400',
  },
  lightText: {
    color: '#2E6AF3',
  },
  darkText: {
    color: '#FFFFFF',
  },
  section: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  lightSection: {
    backgroundColor: '#FFFFFF',
  },
  darkSection: {
    backgroundColor: '#333',
  },
  label: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: '300',
    textAlign: 'right',
  },
  lightSubText: {
    color: '#7B8794',
  },
  darkSubText: {
    color: '#aaa',
  },
  infoContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    textAlign: 'right',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  lightButton: {
    backgroundColor: '#2E6AF3',
  },
  darkButton: {
    backgroundColor: '#555',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '300',
  },
  avatarContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginLeft: 15,
    backgroundColor: '#DDD',
  },
  changeAvatarText: {
    fontSize: 16,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
  lightLinkText: {
    color: '#3D5AFE',
  },
  darkLinkText: {
    color: '#8AB4F8',
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 15,
  },
  lightDeleteButton: {
    backgroundColor: '#FF5252',
  },
  darkDeleteButton: {
    backgroundColor: '#D32F2F',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  lightModalContent: {
    backgroundColor: '#FFFFFF',
  },
  darkModalContent: {
    backgroundColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: '300',
    textAlign: 'right',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'right',
  },
  lightInput: {
    borderColor: '#E0E6EE',
    color: '#000',
  },
  darkInput: {
    borderColor: '#555',
    color: '#FFF',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '300',
  },
  avatarModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  avatarOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    margin: 10,
    backgroundColor: '#DDD',
  },
  switch: {
    marginHorizontal: 10,
  },
});

export default AccountSettings;
