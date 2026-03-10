// Load polyfills first
import './polyfills';

import { useEffect, useCallback } from 'react';
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

/**
 * Preload módulos críticos pós-login em background
 * Isso melhora a experiência do usuário carregando módulos pesados
 * enquanto ele está fazendo login ou vendo o splash screen
 */
async function preloadCriticalModules(): Promise<void> {
  // Carregar date-fns em background (usado em várias telas)
  // Não bloqueia o fluxo de login
  import('date-fns').catch(() => {});
}

function RootLayoutContent() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { isLoading, initialize } = useAuthStore();

  // 1. Inicialização única da autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Iniciar preload de módulos em paralelo com a inicialização
        preloadCriticalModules();
        
        await initialize();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };
    initAuth();
  }, [initialize]);

  // 2. Lógica para esconder o Splash Screen e iniciar notificações
  useEffect(() => {
    const finalizeSetup = async () => {
      if (!isLoading) {
        try {
          await SplashScreen.hideAsync();
          
          // Iniciar notificações apenas se houver um projeto configurado
          if (process.env.EXPO_PUBLIC_PROJECT_ID) {
            await registerForPushNotificationsAsync();
          }
        } catch (error) {
          console.log('Setup finalization error:', error);
        }
      }
    };
    finalizeSetup();
  }, [isLoading]);

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
