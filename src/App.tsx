import { Suspense, useEffect, useMemo } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from '@/contexts/DataContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { AuthContextProvider } from '@/contexts/AuthContextProvider';
import { TourProvider } from '@/contexts/TourContext';
import { GamificationFeedbackProvider } from '@/contexts/GamificationFeedbackContext';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AppLoadingSkeleton } from '@/components/ui/AppLoadingSkeleton';

let _loggedAppInit = false;
let _loggedNotificationsInit = false;
import { notificationManager } from '@/lib/services/NotificationManager';
import { initMonitoring } from '@/lib/monitoring';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { AppRoutes } from "./routes";
import { VersionManager } from "@/components/system/VersionManager";
import { initWebVitalsMonitoring, WebVitalsIndicator } from "@/lib/monitoring/web-vitals";
import { initPerformanceMonitoring } from "@/lib/monitoring/initPerformanceMonitoring";

import { FeatureFlagProvider } from "@/lib/featureFlags/hooks";
// DESABILITADO: import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { SkipLink, FocusVisibleHandler } from "@/components/accessibility";
import { NetworkStatus } from "@/components/ui/network-status";
import { SyncManager } from "@/components/sync/SyncManager";
import { initPushNotifications } from '@/lib/mobile/push-notifications';
import { useNavigate } from 'react-router-dom';

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



// Wrapper to sync auth user with Statsig
const StatsigProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();

  const statsigUser = useMemo(() => {
    if (!user) return { userID: 'anonymous' };

    return {
      userID: user.uid,
      email: user.email || undefined,
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

// Component to initialize push notifications with navigation support
const NotificationInitializer = () => {
  const navigate = useNavigate();

  useEffect(() => {
    initPushNotifications(navigate);
  }, [navigate]);

  return null;
};

import { TourGuide } from '@/components/system/TourGuide';

// Grouped providers for cleaner structure and better performance
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <GlobalErrorBoundary>
      <ErrorBoundary>
        <SkipLink />
        <FocusVisibleHandler />
        <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
        }}
        onSuccess={() => logger.info('Cache persistente restaurado', {}, 'App')}
      >
        <TooltipProvider>
          <AuthContextProvider>
            <TourProvider>
              <StatsigProviderWrapper>
                <GamificationFeedbackProvider>
                  <RealtimeProvider>
                    <DataProvider>
                      {children}
                    </DataProvider>
                  </RealtimeProvider>
                </GamificationFeedbackProvider>
              </StatsigProviderWrapper>
            </TourProvider>
          </AuthContextProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
      </ErrorBoundary>
    </GlobalErrorBoundary>
  );
};

const App = () => {
  useEffect(() => {
    if (!_loggedAppInit) {
      _loggedAppInit = true;
      logger.info('Aplicação iniciada', { timestamp: new Date().toISOString() }, 'App');
    }

    initMonitoring();
    
    // Initialize our comprehensive performance monitoring system
    initPerformanceMonitoring(queryClient).catch((error) => {
      logger.error('Falha ao inicializar monitoramento de performance', error, 'App');
    });
    
    initWebVitalsMonitoring().catch((error) => {
      logger.error('Falha ao inicializar Core Web Vitals', error, 'App');
    });

    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
        if (!_loggedNotificationsInit) {
          _loggedNotificationsInit = true;
          logger.info('Sistema de notificações inicializado', {}, 'App');
        }
      } catch (error) {
        logger.error('Falha ao inicializar sistema de notificações', error, 'App');
      }
    };

    initNotifications();
    sessionStorage.removeItem('chunk_load_error_reload');
  }, []);

  return (
    <AppProviders>
      <Toaster />
      <Sonner />
      <NetworkStatus />
      <SyncManager />
      <TourGuide />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NotificationInitializer />
        <Suspense fallback={<AppLoadingSkeleton message="Carregando sistema..." />}>
          <AppRoutes />
          <VersionManager />
          <WebVitalsIndicator />
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
