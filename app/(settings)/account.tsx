import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useAuth } from '@/context/auth';
import { supabase } from '@/context/supabaseClient'; // Import your Supabase client

const AccountSettings = () => {
    const { logOut, user } = useAuth(); // Only use the logOut function
    const [isSpeaker, setIsSpeaker] = useState(false); // State to manage speaker status

    useEffect(() => {
        // Fetch and set initial speaker status when component mounts
        const fetchSpeakerStatus = async () => {
            if (user) {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('sign')
                    .eq('user_id', user.id)
                    .single();
                
                if (error) {
                    console.error('Error fetching speaker status:', error.message);
                } else {
                    setIsSpeaker(data.sign);
                }
            }
        };
        fetchSpeakerStatus();
    }, [user]);

    const toggleSwitch = async () => {
        const newStatus = !isSpeaker;
        setIsSpeaker(newStatus);

        // Update the speaker status in Supabase
        const { data, error } = await supabase
            .from('user_profiles')
            .update({ sign: newStatus })
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error updating speaker status:', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Account Settings</Text>
            </View>
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Speaker:</Text>
                <Switch
                    value={isSpeaker}
                    onValueChange={toggleSwitch}
                    thumbColor={isSpeaker ? '#4CAF50' : '#fff'}
                    trackColor={{ false: '#ccc', true: '#4CAF50' }}
                    style={styles.switch}
                />
                <Text style={styles.toggleStatus}>{isSpeaker ? 'Speaker' : 'Non-Speaker'}</Text>
            </View>
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
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        width: '100%',
        maxWidth: 400,
        justifyContent: 'space-between',
    },
    toggleLabel: {
        fontSize: 18,
        color: '#333',
    },
    toggleStatus: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
    },
    switch: {
        marginHorizontal: 10,
    },
    logoutButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AccountSettings;