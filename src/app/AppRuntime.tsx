import { useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, defaultShouldDehydrateMutation } from "@tanstack/react-query";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary as FisioErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { notificationManager } from "@/lib/services/NotificationManager";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { ThemeProvider } from "@/components/ui/theme";
import { FeatureFlagProvider } from "@/lib/featureFlags/hooks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => {
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 409) return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// P3.2: registra mutationFn global para autosave de evolução. Permite que
// resumePausedMutations() funcione APÓS hidratação do PersistQueryClient —
// mesmo que o componente PatientEvolution ainda não tenha montado, o
// queryClient consegue invocar a mutation persistida via mutationKey.
// Import dinâmico evita circular dep (useSoapMutations importa sessionsApi).
import("@/hooks/soap/useSoapMutations").then(
  ({ EVOLUTION_AUTOSAVE_KEY, evolutionAutosaveMutationFn }) => {
    queryClient.setMutationDefaults(EVOLUTION_AUTOSAVE_KEY as unknown as string[], {
      mutationFn: evolutionAutosaveMutationFn,
    });
  },
);

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const val = await get(key);
      return val === undefined ? null : val;
    },
    setItem: async (key, value) => {
      await set(key, value);
    },
    removeItem: async (key) => {
      await del(key);
    },
  },
  throttleTime: 3000,
});

function StatsigProviderWrapper({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const statsigUser = useMemo(() => {
    if (!user) return { userID: "anonymous" };
    return {
      userID: user.uid,
      email: user.email || undefined,
      custom: {
        role: profile?.role,
        name: profile?.full_name,
      },
    };
  }, [user, profile]);

  return <FeatureFlagProvider user={statsigUser}>{children}</FeatureFlagProvider>;
}

export function useAppRuntime(source: string) {
  useEffect(() => {
    logger.info("Aplicação iniciada", { source }, "AppRuntime");

    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
      } catch (error) {
        logger.error("Falha ao inicializar notificações", error, "AppRuntime");
      }
    };

    void initNotifications();
  }, [source]);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary>
      <FisioErrorBoundary>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister,
              maxAge: 1000 * 60 * 60 * 24 * 7,
              // P3.2: persiste mutations paused (default) E pending que falharam
              // pelo menos uma vez, desde que tenham idempotency key (segurança
              // contra retry duplicado — KV TTL 60s dedupe no server, ver P2.1).
              // Ref: spec US5 + TanStack #6238
              dehydrateOptions: {
                shouldDehydrateMutation: (mutation) => {
                  if (defaultShouldDehydrateMutation(mutation)) return true;
                  const isPendingRetry =
                    mutation.state.status === "pending" &&
                    mutation.state.failureCount > 0;
                  if (!isPendingRetry) return false;
                  // Exigir idempotency key nas variables para evitar duplicação
                  // ao resumir (mesma key → server retorna response cacheada)
                  const vars = mutation.state.variables as
                    | { idempotencyKey?: string }
                    | undefined;
                  return !!vars?.idempotencyKey;
                },
              },
            }}
            onSuccess={() => {
              // Após hidratação, resume mutations paused (offline / pending-retry)
              void queryClient.resumePausedMutations();
            }}
          >
            <TooltipProvider>
              <AuthContextProvider>
                <StatsigProviderWrapper>
                  <Toaster />
                  <Sonner />
                  {children}
                </StatsigProviderWrapper>
              </AuthContextProvider>
            </TooltipProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </FisioErrorBoundary>
    </GlobalErrorBoundary>
  );
}
