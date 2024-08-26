import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Clipboard } from 'react-native';
import { Menu, MenuItem, MenuDivider } from 'react-native-material-menu';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';

interface MessageBubbleProps {
    message: string;
    status: string | null;  // Add status prop
    isEdited: boolean;  // Add isEdited prop
    onEdit: (newContent: string) => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
}

const DELETED_MESSAGE_PLACEHOLDER = "This message was deleted";

export const UserMessageBubble: React.FC<MessageBubbleProps> = ({ message, status, isEdited, onEdit, onDeleteForMe, onDeleteForEveryone }) => {
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
        onEdit(editedMessage);
    };

    const isDeleted = message === DELETED_MESSAGE_PLACEHOLDER;

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
                    <Text style={styles.messageText}>
                        {message} {isEdited && <Text style={styles.editedText}>(edited)</Text>}
                    </Text>
                    {!isDeleted && status === 'sent' && <Octicons name="check" size={16} color="white" style={styles.statusIcon} />}
                    {!isDeleted && status === 'read' && <MaterialCommunityIcons name="check-all" size={16} color="black" style={styles.statusIcon} />}
                </TouchableOpacity>
            )}
            <Menu
                visible={visible}
                anchor={<View />}
                onRequestClose={hideMenu}
                style={styles.menuStyle}
            >
                {!isDeleted ? (
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


export const OtherMessageBubble: React.FC<MessageBubbleProps> = ({ message, status, isEdited, onDeleteForMe }) => {
    const [visible, setVisible] = useState(false);

    const hideMenu = () => setVisible(false);
    const showMenu = () => setVisible(true);

    const handleCopy = () => {
        Clipboard.setString(message);
        hideMenu();
        Alert.alert('Copied to clipboard');
    };

    const isDeleted = message === DELETED_MESSAGE_PLACEHOLDER;

    return (
        <View style={{ alignItems: 'flex-start' }}>
            <TouchableOpacity onLongPress={showMenu} style={styles.otherMessageContainer}>
                <Text style={[styles.messageText, { color: '#000' }]}>
                    {message} {isEdited && <Text style={styles.editedText}>(edited)</Text>}
                </Text>
            </TouchableOpacity>
            <Menu
                visible={visible}
                anchor={<View />}
                onRequestClose={hideMenu}
                style={{ ...styles.menuStyle, marginTop: 5 }}
            >
                {!isDeleted ? (
                    <>
                        <MenuItem onPress={onDeleteForMe}>Delete for Me</MenuItem>
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


const styles = StyleSheet.create({
    userMessageContainer: {
        backgroundColor: '#2E6AF3', 
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20, // Rounded bubble shape
        marginBottom: 10,
        alignSelf: 'flex-end',
        maxWidth: '100%',
    },
    otherMessageContainer: {
        backgroundColor: '#E5E5EA', 
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20, // Rounded bubble shape
        marginBottom: 10,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },
    messageContent: {
        flexDirection: 'row-reverse', // Align items to the right
        justifyContent: 'flex-start', // Keep text and info together
        alignItems: 'center',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        flexShrink: 1, // Ensure text shrinks if needed to fit
    },
    messageInfo: {
        flexDirection: 'row', // Align timestamp and checkmarks in a row
        alignItems: 'center',
        marginLeft: 10, // Space between the text and the info section
    },
    timestampText: {
        color: '#ccc', // Light gray for the timestamp
        fontSize: 12,
        marginRight: 5, // Add spacing between the time and the checkmarks
    },
    statusIcon: {
        marginLeft: 5, // Add spacing between icons and text
    },
    editedText: {
        fontStyle: 'italic',
        fontSize: 12,
        color: 'white',
    },

    editableTextInput: {
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 20,
        borderColor: '#E5E5EA',
        borderWidth: 1,
    },
    saveButton: {
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    saveButtonText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    menuStyle: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        elevation: 3,
    },
});
