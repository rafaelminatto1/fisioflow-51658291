import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, ToastProvider } from '@fisioflow/shared-ui';
import { NotificationProvider } from '@fisioflow/shared-api';
import { DevMenu } from '@/components/DevMenu';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400: Inter_400Regular,
    Inter_500: Inter_500Medium,
    Inter_600: Inter_600SemiBold,
    Inter_700: Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider requestOnMount={true} registerOnMount={true} appType="patient">
          <ToastProvider position="top">
            <StatusBar style="auto" />
            <DevMenu>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </DevMenu>
          </ToastProvider>
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
