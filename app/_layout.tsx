import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ActivityIndicator, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/context/auth';
import WebRTCProvider from '@/context/WebRTCContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(app)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Handle font loading errors
  useEffect(() => {
    if (error) {
      console.error(error);
      // Optionally show an error screen here
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <WebRTCProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            {/* Define a screen with custom header options */}
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen
              name="(auth)"
              options={{headerShown: false}} 
            />
            <Stack.Screen 
            name='call' />
            <Stack.Screen 
            name='chat' 
            options={{headerTitle: 'Chat', headerBackTitle:"back"}} 
            />
            <Stack.Screen 
              name="modal" 
              options={{ presentation: 'modal', headerShown: false }} 
            />
          </Stack>
        </ThemeProvider>
      </WebRTCProvider>
    </AuthProvider>
  );
}