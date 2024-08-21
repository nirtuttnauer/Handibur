import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Clipboard } from 'react-native';
import { Menu, MenuItem, MenuDivider } from 'react-native-material-menu';

interface MessageBubbleProps {
    message: string;
    onEdit: (newContent: string) => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
}

const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";  // Consistent placeholder

export const UserMessageBubble: React.FC<MessageBubbleProps> = ({ message, onEdit, onDeleteForMe, onDeleteForEveryone }) => {
    const [visible, setVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedMessage, setEditedMessage] = useState(message);

    const hideMenu = () => setVisible(false);
    const showMenu = () => setVisible(true);

    const handleCopy = () => {
        Clipboard.setString(message);
        hideMenu();
        Alert.alert('Copied to clipboard');
    };

    const handleEditSave = () => {
        setIsEditing(false);
        onEdit(editedMessage); // Call the edit function with the new message content
    };

    return (
        <View style={{ alignItems: 'flex-end' }}>
            {isEditing ? (
                <View style={styles.userMessageContainer}>
                    <TextInput
                        value={editedMessage}
                        onChangeText={setEditedMessage}
                        style={styles.editableTextInput}
                        multiline
                    />
                    <TouchableOpacity onPress={handleEditSave} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onLongPress={showMenu} style={styles.userMessageContainer}>
                    <Text style={styles.messageText}>{message}</Text>
                </TouchableOpacity>
            )}
            <Menu
                visible={visible}
                anchor={<View />}  // Invisible anchor, no extra space added
                onRequestClose={hideMenu}
                style={styles.menuStyle}  // Position the menu below the bubble
            >
                {/* Show only "Delete for Me" if the message was deleted for everyone */}
                {message !== DELETED_MESSAGE_PLACEHOLDER ? (
                    <>
                        <MenuItem onPress={() => setIsEditing(true)}>Edit</MenuItem>
                        <MenuItem onPress={onDeleteForMe}>Delete for Me</MenuItem>
                        <MenuItem onPress={onDeleteForEveryone}>Delete for Everyone</MenuItem>
                        <MenuDivider />
                        <MenuItem onPress={handleCopy}>Copy</MenuItem>
                    </>
                ) : (
                    <MenuItem onPress={onDeleteForMe}>Delete for Me</MenuItem>
                )}
            </Menu>
        </View>
    );
};

export const OtherMessageBubble: React.FC<MessageBubbleProps> = ({ message, onDeleteForMe }) => {
    const [visible, setVisible] = useState(false);

    const hideMenu = () => setVisible(false);
    const showMenu = () => setVisible(true);

    const handleCopy = () => {
        Clipboard.setString(message);
        hideMenu();
        Alert.alert('Copied to clipboard');
    };

    return (
        <View style={{ alignItems: 'flex-start' }}>
            <TouchableOpacity onLongPress={showMenu} style={styles.otherMessageContainer}>
                <Text style={styles.messageText}>{message}</Text>
            </TouchableOpacity>
            <Menu
                visible={visible}
                anchor={<View />}  // Invisible anchor, no extra space added
                onRequestClose={hideMenu}
                style={{ ...styles.menuStyle, marginTop: 5 }}  // Position the menu below the bubble
            >
                <MenuItem onPress={onDeleteForMe}>Delete for Me</MenuItem>
                <MenuDivider />
                <MenuItem onPress={handleCopy}>Copy</MenuItem>
            </Menu>
        </View>
    );
};

const styles = StyleSheet.create({
    userMessageContainer: {
        backgroundColor: '#e1ffc7',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        alignSelf: 'flex-end', // Align to the right
        maxWidth: '75%',
    },
    otherMessageContainer: {
        backgroundColor: '#add8e6',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        alignSelf: 'flex-start', // Align to the left
        maxWidth: '75%',
    },
    messageText: {
        fontWeight: 'bold',
    },
    editableTextInput: {
        backgroundColor: '#ffffff',
        padding: 5,
        borderRadius: 5,
        borderColor: 'gray',
        borderWidth: 1,
    },
    saveButton: {
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    saveButtonText: {
        color: '#007BFF',
        fontWeight: 'bold',
    },
    menuStyle: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        elevation: 3, // Adds a shadow effect
    },
});
