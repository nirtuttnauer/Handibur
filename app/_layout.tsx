import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/context/auth';
import WebRTCProvider from '@/context/WebRTCContext';
import { useFonts } from 'expo-font';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
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
  const isDarkMode = colorScheme === 'dark';

  return (
    <AuthProvider>
      <WebRTCProvider>
        <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
              }} 
            />
            <Stack.Screen
              name="(auth)"
              options={{ headerTitle: '', headerBackTitle: "Back", headerShown: false }} 
            />
            <Stack.Screen
              name="(settings)"
              options={{ headerTitle: '', headerBackTitle: "Back", headerShown: true }} 
            />
            <Stack.Screen 
              name="call" 
            />
            <Stack.Screen 
              name="chat" 
              options={({ route }: { route: any }): any  => ({
                headerBackTitle: "Back",
                headerTitle: route?.params?.targetUserName || 'Chat',
                headerShown: true,
                headerRight: () => (
                  <TouchableOpacity onPress={() => {
                    console.log('Calling', route?.params?.targetUserID);
                    router.replace(
                      {pathname:`/call/${route?.params?.targetUserID}/calling`,params:{targetUserID: route?.params?.targetUserID}})}}>
                    <FontAwesome 
                      name="phone" 
                      size={24} 
                      color={isDarkMode ? 'white' : 'black'} // Adjust icon color based on theme
                    />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen 
              name="friendsModal" 
              options={{ presentation: 'modal', headerShown: true }} 
            />
            <Stack.Screen 
              name="addFriendsModal" 
              options={{ presentation: 'modal', headerShown: true }} 
            />
          </Stack>
        </ThemeProvider>
      </WebRTCProvider>
    </AuthProvider>
  );
}