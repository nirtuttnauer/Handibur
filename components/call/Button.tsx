import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  icon: string;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const Button: React.FC<ButtonProps> = ({ icon, text, onPress, disabled, style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={disabled ? "#aaa" : "white"} />
      <Text style={[styles.buttonText, disabled ? styles.buttonTextDisabled : null]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Reduced padding for a more compact design
    paddingHorizontal: 15, // Adjusted for more consistent sizing
    backgroundColor: '#1f1f23',
    borderRadius: 8, // Slightly smaller radius for a sleeker look
    marginBottom: 10, // Reduced margin for tighter spacing
    shadowColor: '#000',
    shadowOpacity: 0.3, // Slightly reduced shadow for a subtle effect
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3, // Reduced elevation to match shadow
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    fontSize: 16, // Slightly smaller font for better scaling
    color: 'white',
    marginLeft: 8, // Reduced margin between icon and text
    fontWeight: '600', // Changed font weight for a more subtle bold effect
  },
  buttonTextDisabled: {
    color: '#aaa', // Lightened text color for disabled state
  },
});

export default Button;