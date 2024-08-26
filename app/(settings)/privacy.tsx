import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable, Linking, Alert } from 'react-native';
import { Stack } from 'expo-router';

const PrivacySettings = () => {
    const [locationSharing, setLocationSharing] = React.useState(false);
    const [adPersonalization, setAdPersonalization] = React.useState(true);
    const [dataCollection, setDataCollection] = React.useState(true);

    const handleDownloadData = () => {
        const subject = encodeURIComponent('Request to Download My Data');
        const body = encodeURIComponent(
            'Dear Support,\n\nI would like to request a download of all the data associated with my account. Please process this request and provide the data as soon as possible.\n\nThank you,\n[Your Name]'
        );
        const email = 'eyalpasha115@outlook.com';
        const mailtoURL = `mailto:${email}?subject=${subject}&body=${body}`;

        Linking.openURL(mailtoURL).catch(err => console.error('Error opening mail client', err));
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'Your account will be deleted.');
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: true, title: 'Privacy Settings', headerBackTitle: 'Back' }}/>

            <Text style={styles.title}>Privacy Settings</Text>

            <View style={styles.settingContainer}>
                <Text style={styles.settingLabel}>Location Sharing</Text>
                <Switch 
                    value={locationSharing}
                    onValueChange={setLocationSharing}
                    thumbColor={locationSharing ? '#007AFF' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={styles.settingContainer}>
                <Text style={styles.settingLabel}>Ad Personalization</Text>
                <Switch 
                    value={adPersonalization}
                    onValueChange={setAdPersonalization}
                    thumbColor={adPersonalization ? '#007AFF' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={styles.settingContainer}>
                <Text style={styles.settingLabel}>Data Collection for Analytics</Text>
                <Switch 
                    value={dataCollection}
                    onValueChange={setDataCollection}
                    thumbColor={dataCollection ? '#007AFF' : '#f4f3f4'}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                />
            </View>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Your Data</Text>
                <Text style={styles.sectionDescription}>
                    You have full control over your data. You can request to download a copy of your data, or delete your account along with all associated data.
                </Text>
                <View style={styles.actionsContainer}>
                    <Pressable 
                        style={styles.button}
                        onPress={handleDownloadData}
                    >
                        <Text style={styles.buttonText}>Download Your Data</Text>
                    </Pressable>
                    <Pressable 
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#1c1c1e',
        marginBottom: 30,
        textAlign: 'center',
    },
    settingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    settingLabel: {
        fontSize: 18,
        fontWeight: '500',
        color: '#3a3a3c',
    },
    sectionContainer: {
        marginTop: 40,
        padding: 20,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
        color: '#1c1c1e',
    },
    sectionDescription: {
        fontSize: 16,
        fontWeight: '400',
        color: '#3a3a3c',
        marginBottom: 20,
        lineHeight: 22,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#ff3b30',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default PrivacySettings;
