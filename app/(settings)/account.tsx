import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput } from 'react-native';
import { useAuth } from '@/context/auth';
import { Entypo } from '@expo/vector-icons'; // Add this import for the edit icon

const AccountSettings = () => {
    const { logOut, user, updateUser } = useAuth(); // Assume updateUser is a method to update user info

    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');

    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    const handleSave = () => {
        const updatedUser = {
            ...user,
            user_metadata: { ...user.user_metadata, name },
            phone,
            email,
        };
        updateUser(updatedUser); // Implement the updateUser method to update user info
        setIsEditingName(false);
        setIsEditingPhone(false);
        setIsEditingEmail(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: user?.avatarUrl || 'https://via.placeholder.com/100' }} // Replace with actual user avatar URL
                    style={styles.avatar}
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, !isEditingName && styles.disabledInput]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Name"
                        editable={isEditingName}
                    />
                    <TouchableOpacity onPress={() => setIsEditingName(!isEditingName)}>
                        <Entypo name="edit" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, !isEditingPhone && styles.disabledInput]}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Phone Number"
                        keyboardType="phone-pad"
                        editable={isEditingPhone}
                    />
                    <TouchableOpacity onPress={() => setIsEditingPhone(!isEditingPhone)}>
                        <Entypo name="edit" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, !isEditingEmail && styles.disabledInput]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        keyboardType="email-address"
                        editable={isEditingEmail}
                    />
                    <TouchableOpacity onPress={() => setIsEditingEmail(!isEditingEmail)}>
                        <Entypo name="edit" size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logOut}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        width: '70%',
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    disabledInput: {
        backgroundColor: '#e9ecef',
    },
    saveButton: {
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginBottom: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AccountSettings;