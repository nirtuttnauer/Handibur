import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from './Button';

interface ButtonsContainerProps {
  onCreateOffer: () => void;
  onEndCall: () => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  isDarkMode: boolean;
  disableCallButton: boolean;
}

const ButtonsContainer: React.FC<ButtonsContainerProps> = ({
  onCreateOffer,
  onEndCall,
  onToggleVideo,
  onToggleAudio,
  isDarkMode,
  disableCallButton,
}) => {
  return (
    <View style={[
      styles.buttonsContainer
    ]}>
      <Button
        icon="call-outline"
        text="Call"
        onPress={onCreateOffer}
        disabled={disableCallButton}
        style={styles.button}
      />
      <Button
        icon="close-outline"
        text="End Call"
        onPress={onEndCall}
        style={styles.button}
      />
      <Button
        icon="videocam-outline"
        text="Toggle Video"
        onPress={onToggleVideo}
        style={styles.button}
      />
      <Button
        icon="mic-outline"
        text="Toggle Audio"
        onPress={onToggleAudio}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: '#333',
    elevation: 2, // Elevation for Android shadow support
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderRadius: 10, // Rounded corners for the container
  },
  button: {
    flex: 1, // Keep buttons equally sized
    marginHorizontal: 4, // Slightly smaller margin between buttons
    paddingVertical: 10, // Smaller padding for more compact buttons
    borderRadius: 8, // Slightly smaller border radius
    // backgroundColor: 'rgba(31, 31, 35, 0.8)', // Background color with transparency for the buttons
    shadowColor: '#000', // Subtle shadow for depth
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ButtonsContainer;