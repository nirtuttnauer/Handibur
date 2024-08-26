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

const avatars = [
  require('../../assets/avatars/IMG_3882.png'),
  require('../../assets/avatars/IMG_3883.png'),
  require('../../assets/avatars/IMG_3884.png'),
  require('../../assets/avatars/IMG_3885.png'),
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
      .select(field, { count: 'exact' }) // Get the exact count of matching rows
      .eq(field, normalizedValue)
      .neq('user_id', user.id); // Exclude the current user from the check
  
    if (error) {
      console.error('Error checking field uniqueness:', error);
      return false; // Return false if there's an error to avoid blocking the update
    }
  
    return count === 0; // Returns true if unique, i.e., count is 0
  };
  
  

  const handleSave = async () => {
    if (!fieldValue.trim()) {
      Alert.alert('Error', 'Field cannot be empty.');
      return;
    }
  
    // Convert the username to lowercase before checking and saving
    const normalizedValue = editingField === 'username' ? fieldValue.trim().toLowerCase() : fieldValue.trim();
  
    // Perform uniqueness check for email, username, and phone
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
    const avatarUri = avatarIndex; // Save the index instead of the URI
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerText}>Account Settings</Text>

      {/* Avatar */}
      <View style={styles.section}>
        <Text style={styles.label}>Avatar</Text>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
        >
          <Image
            source={profile?.profile_image ? avatars[profile.profile_image as number] : null}
            style={styles.avatar}
          />
          <Text style={styles.changeAvatarText}>Change Avatar</Text>
        </TouchableOpacity>
      </View>

      {/* Username */}
      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{profile?.username}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress('username')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{(profile as any)?.email}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress('email')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Phone */}
      <View style={styles.section}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{(profile as any)?.phone || 'Not set'}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress('phone')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Language Speaker */}
      <View style={styles.section}>
        <Text style={styles.label}>Sign Language Speaker</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{(profile as any)?.sign ? 'Yes' : 'No'}</Text>
          <Switch
            value={isSpeaker}
            onValueChange={toggleSwitch}
            thumbColor={isSpeaker ? '#4CAF50' : '#fff'}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            style={styles.switch}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDeleteAccount}
      >
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={!!editingField}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editingField === 'sign' ? 'Sign Language Preference' : editingField}
            </Text>
            <TextInput
              style={styles.modalInput}
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
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setEditingField(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
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
          <View style={styles.avatarModalContent}>
            <Text style={styles.modalTitle}>Select Avatar</Text>
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
              style={styles.modalButtonCancel}
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E6AF3',
    marginBottom: 30,
  },
  section: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    color: '#333',
  },
  editButton: {
    backgroundColor: '#2E6AF3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: '#DDD',
  },
  changeAvatarText: {
    fontSize: 16,
    color: '#2E6AF3',
    textDecorationLine: 'underline',
  },
  logoutButton: {
    width: '100%',
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: '100%',
    backgroundColor: '#8E8E93',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    color: '#2E6AF3',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 10,
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: '#2E6AF3',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginLeft: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
