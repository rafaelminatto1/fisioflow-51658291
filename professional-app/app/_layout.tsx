// Load polyfills first
import './polyfills';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useColors, useColorScheme } from '@/hooks/useColorScheme';
import * as SplashScreen from 'expo-splash-screen';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

function RootLayoutContent() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Initialize auth
    try {
      unsubscribe = initialize();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }

    // Initialize push notifications when app starts
    const initNotifications = async () => {
      try {
        await registerForPushNotificationsAsync();
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    // Hide splash screen when auth state is determined
    if (!isLoading) {
      SplashScreen.hideAsync();
      initNotifications();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isLoading, initialize]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
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
        <Stack.Screen
          name="patient/[id]"
          options={{
            title: 'Paciente',
            headerBackTitle: 'Voltar',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootLayoutContent />
      </QueryClientProvider>
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
