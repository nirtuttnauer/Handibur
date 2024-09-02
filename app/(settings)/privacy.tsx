import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable, Linking, Alert, I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme'; // Import the hook for detecting color scheme

I18nManager.allowRTL(true); // Ensure that the text direction is Right-to-Left

const PrivacySettings = () => {
    const [locationSharing, setLocationSharing] = React.useState(false);
    const [adPersonalization, setAdPersonalization] = React.useState(true);
    const [dataCollection, setDataCollection] = React.useState(true);

    const colorScheme = useColorScheme(); // Detect system color scheme
    const isDarkMode = colorScheme === 'dark'; // Determine if dark mode is active

    const handleDownloadData = () => {
        const subject = encodeURIComponent('בקשה להורדת נתונים');
        const body = encodeURIComponent(
            'שלום רב,\n\nאני מבקש להוריד עותק של כל הנתונים הקשורים לחשבון שלי. נא לעבד את הבקשה ולספק את הנתונים בהקדם האפשרי.\n\nתודה,\n[שמך]'
        );
        const email = 'eyalpasha115@outlook.com';
        const mailtoURL = `mailto:${email}?subject=${subject}&body=${body}`;

        Linking.openURL(mailtoURL).catch(err => console.error('Error opening mail client', err));
    };

    const handleDeleteAccount = () => {
        Alert.alert('מחיקת חשבון', 'החשבון שלך יימחק.');
    };

    return (
        <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
            <Stack.Screen options={{ headerShown: true, title: 'הגדרות פרטיות', headerBackTitle: 'חזרה' }}/>

            <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>הגדרות פרטיות</Text>

            <View style={[styles.settingContainer, isDarkMode ? styles.darkSettingContainer : styles.lightSettingContainer]}>
                <Text style={[styles.settingLabel, isDarkMode ? styles.darkText : styles.lightText]}>שיתוף מיקום</Text>
                <Switch 
                    value={locationSharing}
                    onValueChange={setLocationSharing}
                    thumbColor={locationSharing ? '#007AFF' : (isDarkMode ? '#666' : '#f4f3f4')}
                    trackColor={{ false: isDarkMode ? '#444' : '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={[styles.settingContainer, isDarkMode ? styles.darkSettingContainer : styles.lightSettingContainer]}>
                <Text style={[styles.settingLabel, isDarkMode ? styles.darkText : styles.lightText]}>התאמת מודעות אישית</Text>
                <Switch 
                    value={adPersonalization}
                    onValueChange={setAdPersonalization}
                    thumbColor={adPersonalization ? '#007AFF' : (isDarkMode ? '#666' : '#f4f3f4')}
                    trackColor={{ false: isDarkMode ? '#444' : '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={[styles.settingContainer, isDarkMode ? styles.darkSettingContainer : styles.lightSettingContainer]}>
                <Text style={[styles.settingLabel, isDarkMode ? styles.darkText : styles.lightText]}>איסוף נתונים לאנליטיקה</Text>
                <Switch 
                    value={dataCollection}
                    onValueChange={setDataCollection}
                    thumbColor={dataCollection ? '#007AFF' : (isDarkMode ? '#666' : '#f4f3f4')}
                    trackColor={{ false: isDarkMode ? '#444' : '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={[styles.sectionContainer, isDarkMode ? styles.darkSectionContainer : styles.lightSectionContainer]}>
                <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>הנתונים שלך</Text>
                <Text style={[styles.sectionDescription, isDarkMode ? styles.darkSubText : styles.lightSubText]}>
                    יש לך שליטה מלאה על הנתונים שלך. ניתן לבקש להוריד עותק של הנתונים שלך או למחוק את החשבון שלך יחד עם כל הנתונים המשויכים אליו.
                </Text>
                <View style={styles.actionsContainer}>
                    <Pressable 
                        style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                        onPress={handleDownloadData}
                    >
                        <Text style={styles.buttonText}>הורד את הנתונים שלך</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.deleteButton, isDarkMode ? styles.darkDeleteButton : styles.lightDeleteButton]}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={styles.deleteButtonText}>מחק חשבון</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    lightContainer: {
        backgroundColor: '#f8f8f8',
    },
    darkContainer: {
        backgroundColor: '#1c1c1c',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 30,
        textAlign: 'right', // Align title to the right
    },
    darkText: {
        color: '#ffffff',
    },
    lightText: {
        color: '#1c1c1e',
    },
    settingContainer: {
        flexDirection: 'row-reverse', // Adjust to RTL
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    lightSettingContainer: {
        backgroundColor: '#ffffff',
    },
    darkSettingContainer: {
        backgroundColor: '#333',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right', // Align text to the right
    },
    sectionContainer: {
        marginTop: 40,
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    lightSectionContainer: {
        backgroundColor: '#ffffff',
    },
    darkSectionContainer: {
        backgroundColor: '#333',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'right', // Align text to the right
    },
    sectionDescription: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 20,
        lineHeight: 22,
        textAlign: 'right', // Align text to the right
    },
    lightSubText: {
        color: '#3a3a3c',
    },
    darkSubText: {
        color: '#aaaaaa',
    },
    actionsContainer: {
        flexDirection: 'row-reverse', // Adjust to RTL
        justifyContent: 'space-between',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        flex: 1,
        marginLeft: 10, // Adjust margin for RTL
        alignItems: 'center',
    },
    lightButton: {
        backgroundColor: '#007AFF',
    },
    darkButton: {
        backgroundColor: '#005BB5',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    deleteButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        flex: 1,
        alignItems: 'center',
    },
    lightDeleteButton: {
        backgroundColor: '#ff3b30',
    },
    darkDeleteButton: {
        backgroundColor: '#D32F2F',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',

    }, 
}); 

export default PrivacySettings;
