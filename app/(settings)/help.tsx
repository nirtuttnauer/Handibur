import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useAuth } from '@/context/auth';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme'; // Import the hook for detecting color scheme

const generateTicketNumber = () => {
    return 'TICKET-' + Math.floor(Math.random() * 90000 + 10000);  // Generates a random 5-digit number
};

const sendHelpEmail = () => {
    const ticketNumber = generateTicketNumber();
    const subject = `בקשת עזרה - ${ticketNumber}`;
    const body = `שלום,\n\nאני זקוק לעזרה בבעיה הבאה:\n\n[תאר את הבעיה שלך כאן]\n\nמספר כרטיס: ${ticketNumber}`;
    const email = 'eyalpasha115@outlook.com';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl)
        .catch(err => console.error('Error opening email app:', err));
};

const HelpSettings = () => {
    const { logOut } = useAuth();
    const colorScheme = useColorScheme(); // Detect system color scheme
    const isDarkMode = colorScheme === 'dark'; // Determine if dark mode is active

    return (
        <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
            <Stack.Screen options={{ headerShown: true, title: 'עזרה', headerBackTitle: 'חזרה'}}/>
            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>זקוק לעזרה?</Text>
            <Text style={[styles.description, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
                אם אתה נתקל בבעיות או יש לך שאלות, אנחנו כאן כדי לעזור. לחץ על הכפתור למטה כדי לשלוח בקשת עזרה, ואחד מחברי הצוות שלנו יחזור אליך בקרוב.
            </Text>
            <TouchableOpacity style={styles.helpButton} onPress={sendHelpEmail}>
                <Text style={styles.helpButtonText}>שלח בקשת עזרה</Text>
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
    },
    lightContainer: {
        backgroundColor: '#f2f2f7', // Light grey background
    },
    darkContainer: {
        backgroundColor: '#1c1c1e', // Dark background for dark mode
    },
    title: {
        fontSize: 22, // Larger, bold title
        fontWeight: '600', // Semi-bold for a more refined look
        textAlign: 'center',
        marginBottom: 10, // Less margin for a tighter look
    },
    lightText: {
        color: '#1c1c1e', // Darker text color for light mode
    },
    darkText: {
        color: '#ffffff', // White text for dark mode
    },
    description: {
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        marginHorizontal: 20,
        marginBottom: 30, // More space between the description and button
        lineHeight: 22,
    },
    lightSubText: {
        color: '#3a3a3c', // Slightly lighter grey for the description text in light mode
    },
    darkSubText: {
        color: '#d1d1d6', // Lighter grey for the description text in dark mode
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
