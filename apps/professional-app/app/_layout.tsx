// Load polyfills first
import '../lib/polyfills';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useColors, useColorScheme } from '@/hooks/useColorScheme';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Initialize Sentry
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn && sentryDsn.startsWith('https://')) {
  Sentry.init({
    dsn: sentryDsn,
    debug: __DEV__,
    enableNative: !__DEV__,
    // 1.0 envia TODAS as transações — caro em produção. 0.1 = 10% sample.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Captura erros no boot nativo (feature do Sentry v8)
    enableNativeCrashHandling: true,
  });
} else if (__DEV__) {
  console.log('Sentry disabled: valid DSN not found in environment');
}

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
          // Haptic suave ao app ficar pronto — sensação nativa iOS
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          // Iniciar notificações apenas se houver um projeto configurado
          if (process.env.EXPO_PUBLIC_EXPO_PROJECT_ID) {
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
          options={{ title: 'Paciente', headerBackTitle: 'Voltar' }}
        />

        {/* ── Form sheets iOS nativos (bottom sheet arrastável) ─────────────── */}
        {/* Sensação nativa de formulário: sobe do baixo, pode fechar arrastando */}
        <Stack.Screen
          name="patient-form"
          options={{
            title: 'Paciente',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="appointment-form"
          options={{
            title: 'Agendamento',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.7, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="evolution-form"
          options={{
            title: 'Evolução',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="tarefa-form"
          options={{
            title: 'Tarefa',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="financial-form"
          options={{
            title: 'Financeiro',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="nfse-form"
          options={{
            title: 'NFS-e',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.7, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="protocol-form"
          options={{
            title: 'Protocolo',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="prom-form"
          options={{
            title: 'Escala Clínica',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.75, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="exercise-form"
          options={{
            title: 'Exercício',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.65, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
