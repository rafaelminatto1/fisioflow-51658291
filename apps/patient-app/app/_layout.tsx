
// Prevent the splash screen from auto-hiding

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useColors, useColorScheme } from '@/hooks/useColorScheme';
import { initializeNotifications } from '@/lib/notificationsSystem';
import * as Sentry from '@sentry/react-native';
import { ToastContainer, ErrorBoundary } from '@/components';
import * as SplashScreen from 'expo-splash-screen';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://placeholder@sentry.io/placeholder',
  debug: __DEV__,
  enableNative: !__DEV__,
  tracesSampleRate: 1.0,
});

// Silenciar avisos do Expo Go sobre notificações (esperados em ambiente de dev)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported in Expo Go'
]);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();

    // Initialize notifications system
    initializeNotifications();

    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <ToastContainer />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
