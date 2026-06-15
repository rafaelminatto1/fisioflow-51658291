// Load polyfills first
import "../lib/polyfills";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useColors, useColorScheme } from "@/hooks/useColorScheme";
import * as SplashScreen from "expo-splash-screen";
import * as Haptics from "expo-haptics";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import * as Sentry from "@sentry/react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useFonts } from "expo-font";
import { nunitoFonts } from "@/constants/biomecanica";

import NetInfo from "@react-native-community/netinfo";
import { useSyncStore } from "@/store/sync-store";
import { SyncConflictModal } from "@/components/ui/SyncConflictModal";
import { fetchApi } from "@/lib/api";

// Initialize Sentry — only in production builds (native SDK not available via Metro)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (!__DEV__ && sentryDsn && sentryDsn.startsWith("https://")) {
  Sentry.init({
    dsn: sentryDsn,
    enableNative: true,
    tracesSampleRate: 0.1,
    enableNativeCrashHandling: true,
  });
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
  import("date-fns").catch(() => {});
}

function RootLayoutContent() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { isLoading, initialize } = useAuthStore();
  const [fontsLoaded] = useFonts(nunitoFonts);

  // 1. Inicialização única da autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Iniciar preload de módulos em paralelo com a inicialização
        preloadCriticalModules();

        await initialize();
      } catch (error) {
        console.error("Failed to initialize auth:", error);
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
          console.log("Setup finalization error:", error);
        }
      }
    };
    finalizeSetup();
  }, [isLoading]);

  useEffect(() => {
    const processQueue = async () => {
      const store = useSyncStore.getState();
      if (store.isSyncing || store.queue.length === 0 || store.conflict) return;

      store.setSyncing(true);

      try {
        const currentQueue = [...store.queue];
        for (const mutation of currentQueue) {
          if (useSyncStore.getState().conflict) break;

          try {
            // Skip queue logic inside fetchApi by using a custom flag,
            // but actually fetchApi only queues if network fails.
            await fetchApi(mutation.endpoint, {
              method: mutation.method,
              data: mutation.data,
              params: mutation.params,
            });
            useSyncStore.getState().removeMutation(mutation.id);
          } catch (error: any) {
            if (error.status === 409 || error.message?.includes("409")) {
              store.setConflict({
                id: mutation.id,
                mutation,
                serverData: error.serverData || {
                  aviso: "Versão do servidor atualizada e mais recente.",
                },
                localData: mutation.data,
              });
              break;
            } else if (
              error.message === "Network request failed" ||
              error.name === "AbortError" ||
              error.message?.includes("Network")
            ) {
              break;
            } else {
              useSyncStore.getState().removeMutation(mutation.id);
            }
          }
        }
      } finally {
        useSyncStore.getState().setSyncing(false);
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        processQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="biomecanica" options={{ headerShown: false }} />
        <Stack.Screen
          name="patient/[id]"
          options={{ title: "Paciente", headerBackTitle: "Voltar" }}
        />

        {/* ── Form sheets iOS nativos (bottom sheet arrastável) ─────────────── */}
        {/* Sensação nativa de formulário: sobe do baixo, pode fechar arrastando */}
        <Stack.Screen
          name="patient-form"
          options={{
            title: "Paciente",
            presentation: "formSheet",
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="appointment-form"
          options={{
            title: "Agendamento",
            headerShown: false,
            presentation: "formSheet",
            sheetAllowedDetents: [0.7, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="evolution-form"
          options={{
            title: "Evolução",
            headerBackTitle: "Voltar",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="tarefa-form"
          options={{
            title: "Tarefa",
            presentation: "formSheet",
            sheetAllowedDetents: [0.5, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="financial-form"
          options={{
            title: "Financeiro",
            presentation: "formSheet",
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="nfse-form"
          options={{
            title: "NFS-e",
            presentation: "formSheet",
            sheetAllowedDetents: [0.7, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="protocol-form"
          options={{
            title: "Protocolo",
            presentation: "formSheet",
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="prom-form"
          options={{
            title: "Escala Clínica",
            presentation: "formSheet",
            sheetAllowedDetents: [0.75, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="exercise-form"
          options={{
            title: "Exercício",
            presentation: "formSheet",
            sheetAllowedDetents: [0.65, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen name="whatsapp-chat/[id]" options={{ headerShown: false }} />
      </Stack>
      <SyncConflictModal />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <RootLayoutContent />
          </QueryClientProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
