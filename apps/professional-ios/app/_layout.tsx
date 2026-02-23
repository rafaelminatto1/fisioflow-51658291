
// Custom themes with FisioFlow brand colors
// Based on Activity Fisioterapia logo - Baby Blue palette

import { Stack, useRouter } from 'expo-router';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { phiCacheManager } from '../lib/services/phiCacheManager';
import { AuthGuard } from '../components/navigation/AuthGuard';

const FisioFlowLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary - Baby Blue (cor principal da marca)
    primary: '#0284C7',
    background: '#FAFAF9',
    card: '#FFFFFF',
    text: '#1C1917',
    border: '#E7E5E4',
    // Secondary - Logo Original Blue (Activity brand color)
    notification: '#5EB3E6',
    // Accent - Coral (cor quente para destaque)
    accent: '#F97316',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
  },
};

const FisioFlowDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    // Primary - Baby Blue (adapted for dark mode)
    primary: '#38BDF8',
    background: '#0C0A09',
    card: '#1C1917',
    text: '#FAFAF9',
    border: '#292524',
    // Secondary - Logo Original Blue (adapted for dark mode)
    notification: '#7DD3FC',
    // Accent - Coral (adapted for dark mode)
    accent: '#FB923C',
    success: '#4ADE80',
    warning: '#FACC15',
    error: '#F87171',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  
  // Get auth store methods
  const {
    checkSessionTimeout,
    checkBackgroundTimeout,
    lockSession,
    setBackgroundedAt,
    clearSession,
    initializeSession,
    updateLastActivity,
    isLocked,
  } = useAuthStore();

  // Initialize session on app start
  useEffect(() => {
    initializeSession();
    console.log('[RootLayout] Session initialized on app start');
  }, [initializeSession]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      // App is going to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        const now = new Date();
        setBackgroundedAt(now);
        console.log('[RootLayout] App backgrounded at:', now.toISOString());
        
        // Notify PHI Cache Manager that app is going to background
        // This starts a 5-minute timer to clear decrypted PHI from memory
        phiCacheManager.onAppBackground();
      }

      // App is coming to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[RootLayout] App foregrounded, checking session validity');
        
        // Notify PHI Cache Manager that app is returning to foreground
        // This cancels the timer if app returns before 5 minutes
        phiCacheManager.onAppForeground();
        
        // Check if session has timed out (30 days of inactivity)
        const sessionValid = checkSessionTimeout();
        if (!sessionValid) {
          console.warn('[RootLayout] Session timeout detected - auto-logout');
          // Clear session and navigate to login
          clearSession();
          // Navigate to login screen (session expired)
          router.replace('/(auth)/login');
          return;
        }

        // Check if app was backgrounded for more than 5 minutes
        const requiresReauth = checkBackgroundTimeout();
        if (requiresReauth) {
          console.warn('[RootLayout] Background timeout detected - re-authentication required');
          lockSession();
          // Navigate to unlock screen for re-authentication
          router.push('/(auth)/unlock');
        } else {
          // Clear backgroundedAt timestamp
          setBackgroundedAt(null);
          // Update activity timestamp
          updateLastActivity();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [
    checkSessionTimeout,
    checkBackgroundTimeout,
    lockSession,
    setBackgroundedAt,
    clearSession,
    updateLastActivity,
  ]);

  // Track user activity on app interactions
  // This will be called by individual screens/components
  // For now, we update activity when app becomes active
  useEffect(() => {
    if (appState.current === 'active' && !isLocked) {
      updateLastActivity();
    }
  }, [updateLastActivity, isLocked]);

  // Use user's system preference for color scheme
  const theme = colorScheme === 'light' ? FisioFlowLightTheme : FisioFlowDarkTheme;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
