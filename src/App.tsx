import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { logger } from '@/lib/errors/logger';
import { notificationManager } from '@/lib/services/NotificationManager';
import { initMonitoring } from '@/lib/monitoring';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { AppRoutes } from "./routes";
import { VersionManager } from "@/components/system/VersionManager";
import { initWebVitalsMonitoring, WebVitalsIndicator } from "@/lib/monitoring/web-vitals";
import { PerformanceDashboard } from "@/components/system";
import { FeatureFlagProvider } from "@/lib/featureFlags/hooks";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { SkipLink, FocusVisibleHandler } from "@/components/accessibility";

// Lazy load Vercel Analytics to avoid errors when not properly configured
const Analytics = import.meta.env.PROD
  ? lazy(() => import("@vercel/analytics/react").then(m => ({ default: m.Analytics })))
  : null;
const SpeedInsights = import.meta.env.PROD
  ? lazy(() => import("@vercel/speed-insights/react").then(m => ({ default: m.SpeedInsights })))
  : null;

// Create a client with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (increased for persistence)
      retry: (failureCount, error) => {
        // Não retry para erros 4xx (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 409) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
  },
});

// Async persister using IndexedDB (idb-keyval)
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

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Wrapper to sync auth user with Statsig
const StatsigProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();

  const statsigUser = useMemo(() => {
    if (!user) return { userID: 'anonymous' };

    return {
      userID: user.id,
      email: user.email,
      custom: {
        role: profile?.role,
        name: profile?.full_name,
      }
    };
  }, [user, profile]);

  return (
    <FeatureFlagProvider user={statsigUser}>
      {children}
    </FeatureFlagProvider>
  );
};

const App = () => {
  // Gerenciar atualizações do Service Worker
  useServiceWorkerUpdate();

  useEffect(() => {
    logger.info('Aplicação iniciada', { timestamp: new Date().toISOString() }, 'App');

    // Initialize monitoring (performance, errors, analytics)
    initMonitoring();

    // Initialize Core Web Vitals monitoring
    initWebVitalsMonitoring().catch((error) => {
      logger.error('Falha ao inicializar Core Web Vitals', error, 'App');
    });

    // Initialize notification system
    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
        logger.info('Sistema de notificações inicializado', {}, 'App');
      } catch (error) {
        logger.error('Falha ao inicializar sistema de notificações', error, 'App');
      }
    };

    initNotifications();

    // Clear chunk load error flag on successful load
    sessionStorage.removeItem('chunk_load_error_reload');
  }, []);

  return (
    <ErrorBoundary>
      {/* Componentes de acessibilidade - WCAG 2.1 */}
      <SkipLink />
      <FocusVisibleHandler />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          buster: __APP_VERSION__,
        }}
        onSuccess={() => logger.info('Cache persistente restaurado com sucesso', {}, 'App')}
      >
        <TooltipProvider>
          <AuthContextProvider>
            <StatsigProviderWrapper>
              <DataProvider>
                <Toaster />
                <Sonner />
                {/* <PWAInstallPrompt /> */}
                {/* <PWAUpdatePrompt /> */}
                <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AppRoutes />
                    <VersionManager />
                    {/* Vercel Analytics - Only in production */}
                    {Analytics && <Analytics />}
                    {SpeedInsights && <SpeedInsights />}
                    <WebVitalsIndicator />
                    {/* Performance Dashboard - Dev Only */}
                    {import.meta.env.DEV && <PerformanceDashboard />}
                  </Suspense>
                </BrowserRouter>
              </DataProvider>
            </StatsigProviderWrapper>
          </AuthContextProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
