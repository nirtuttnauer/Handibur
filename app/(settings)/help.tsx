import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useAuth } from '@/context/auth';
import { Stack } from 'expo-router';

const generateTicketNumber = () => {
    return 'TICKET-' + Math.floor(Math.random() * 90000 + 10000);  // Generates a random 5-digit number
};

const sendHelpEmail = () => {
    const ticketNumber = generateTicketNumber();
    const subject = `Help Request - ${ticketNumber}`;
    const body = `Hello,\n\nI need help with the following issue:\n\n[Describe your issue here]\n\nTicket Number: ${ticketNumber}`;
    const email = 'eyalpasha115@outlook.com';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl)
        .catch(err => console.error('Error opening email app:', err));
};

const HelpSettings = () => {
    const { logOut } = useAuth();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: true, title: 'Help', headerBackTitle: 'Back'}}/>
            <Text style={styles.title}>Need Help?</Text>
            <Text style={styles.description}>
                If you're experiencing issues or have any questions, we're here to help. Tap the button below to send a help request, and one of our team members will get back to you shortly.
            </Text>
            <TouchableOpacity style={styles.helpButton} onPress={sendHelpEmail}>
                <Text style={styles.helpButtonText}>Send Help Request</Text>
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
        backgroundColor: '#f2f2f7', // Light grey background similar to Apple's settings pages
    },
    title: {
        fontSize: 28, // Larger, bold title
        fontWeight: '600', // Semi-bold for a more refined look
        color: '#1c1c1e', // Darker text color
        marginBottom: 10, // Less margin for a tighter look
    },
    description: {
        fontSize: 16,
        fontWeight: '400',
        color: '#3a3a3c', // Slightly lighter grey for the description text
        textAlign: 'center',
        marginHorizontal: 20,
        marginBottom: 30, // More space between the description and button
        lineHeight: 22,
    },
    helpButton: {
        backgroundColor: '#007AFF', // Apple's blue color for call-to-action buttons
        paddingVertical: 14, // Slightly taller button for better touchability
        paddingHorizontal: 30, // More padding for a wider button
        borderRadius: 12, // More rounded corners
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // Slight shadow for depth
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    helpButtonText: {
        color: '#fff', // White text for contrast
        fontSize: 17, // Slightly larger text for readability
        fontWeight: '600', // Semi-bold to match the button style
    },
});

export default HelpSettings;
