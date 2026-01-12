import { Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { logger } from '@/lib/errors/logger';
import { notificationManager } from '@/lib/services/NotificationManager';
import { initMonitoring } from '@/lib/monitoring';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { AppRoutes } from "./routes";

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

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  throttleTime: 3000, // Throttle saves to every 3 seconds
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

const App = () => {
  useEffect(() => {
    logger.info('Aplicação iniciada', { timestamp: new Date().toISOString() }, 'App');

    // Initialize monitoring (performance, errors, analytics)
    initMonitoring();

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
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hours
        onSuccess={() => logger.info('Cache persistente restaurado com sucesso', {}, 'App')}
      >
        <TooltipProvider>
          <AuthContextProvider>
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
                </Suspense>
              </BrowserRouter>
            </DataProvider>
          </AuthContextProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
