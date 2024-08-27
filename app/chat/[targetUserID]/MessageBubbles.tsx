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
        Alert.alert('Copied to clipboard');
        hideMenu(); // Close the menu after copying
    };

    const handleEditSave = () => {
        setIsEditing(false);
        onEdit(editedMessage);
        hideMenu(); // Close the menu after saving
    };

    const handleEdit = () => {
        setIsEditing(true);
        hideMenu(); // Close the menu after pressing Edit
    };

    const handleDeleteForMe = () => {
        onDeleteForMe();
        hideMenu(); // Close the menu after deleting for me
    };

    const handleDeleteForEveryone = () => {
        onDeleteForEveryone();
        hideMenu(); // Close the menu after deleting for everyone
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
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={handleEditSave} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>שמור</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.discardButton}>
                            <Text style={styles.discardButtonText}>ביטול</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity onLongPress={showMenu} style={styles.userMessageContainer}>
                    <Text style={styles.messageText}>{message}</Text>
                    <View style={styles.messageInfo}>
                        {isEdited && <Text style={styles.editedText}>(נערך)</Text>}
                        {!isDeleted && status === 'sent' && <Octicons name="check" size={16} color="white" style={styles.statusIcon} />}
                        {!isDeleted && status === 'read' && <MaterialCommunityIcons name="check-all" size={16} color="#7FADE0" style={styles.statusIcon} />}
                    </View>
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
                        <MenuItem onPress={handleEdit}>Edit</MenuItem>
                        <MenuItem onPress={handleDeleteForMe}>Delete for Me</MenuItem>
                        <MenuItem onPress={handleDeleteForEveryone}>Delete for Everyone</MenuItem>
                        <MenuDivider />
                        <MenuItem onPress={handleCopy}>Copy</MenuItem>
                    </>
                ) : (
                    <MenuItem onPress={handleDeleteForMe}>Delete for Me</MenuItem>
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
        Alert.alert('Copied to clipboard');
        hideMenu(); // Close the menu after copying
    };

    const handleDeleteForMe = () => {
        onDeleteForMe();
        hideMenu(); // Close the menu after deleting for me
    };

    const isDeleted = message === DELETED_MESSAGE_PLACEHOLDER;

    return (
        <View style={{ alignItems: 'flex-start' }}>
            <TouchableOpacity onLongPress={showMenu} style={styles.otherMessageContainer}>
                <Text style={[styles.messageText, { color: '#000' }]}>{message}</Text>
                <View style={styles.messageInfo}>
                    {isEdited && <Text style={[styles.editedText, { color: '#000' }]}>(נערך)</Text>}
                </View>
            </TouchableOpacity>
            <Menu
                visible={visible}
                anchor={<View />}
                onRequestClose={hideMenu}
                style={{ ...styles.menuStyle, marginTop: 5 }}
            >
                {!isDeleted ? (
                    <>
                        <MenuItem onPress={handleDeleteForMe}>Delete for Me</MenuItem>
                        <MenuDivider />
                        <MenuItem onPress={handleCopy}>Copy</MenuItem>
                    </>
                ) : (
                    <MenuItem onPress={handleDeleteForMe}>Delete for Me</MenuItem>
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
        borderRadius: 20,
        marginBottom: 5,
        marginTop: 5,
        alignSelf: 'flex-end',
        maxWidth: '80%',
        marginRight: 10,
    },
    otherMessageContainer: {
        backgroundColor: '#E5E5EA',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginBottom: 5,
        marginTop: 10,
        alignSelf: 'flex-start',
        maxWidth: '80%',
        marginLeft: 10,
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
        flexShrink: 1,
    },
    messageInfo: {
        flexDirection: 'row', // Align checkmark and edited text in a row
        alignItems: 'center',
        justifyContent: 'flex-end', // Align to the right
        marginTop: 5, // Space between the message text and the status/edited text
    },
    statusIcon: {
        marginLeft: 8, // Space between the checkmark and the "edited" text
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
        marginBottom: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    saveButton: {
        backgroundColor: '#2E6AF3',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginRight: 10,
    },
    discardButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    discardButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    menuStyle: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        elevation: 3,
        marginTop: 20, // Adjust this to create more space between the menu and the bubble
    },
    menuIcon: {
        marginRight: 10,
    },
});
