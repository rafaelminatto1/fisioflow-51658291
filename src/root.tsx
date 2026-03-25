import { useEffect, useMemo } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { HighContrastProvider } from "@/contexts/HighContrastContext";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary as FisioErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { notificationManager } from "@/lib/services/NotificationManager";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { ThemeProvider } from "@/components/ui/theme";
import { PremiumThemeToggle } from "@/components/ui/PremiumThemeToggle";
import { FeatureFlagProvider } from "@/lib/featureFlags/hooks";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { SkipLink, FocusVisibleHandler } from "@/components/accessibility";

import "./index.css";

// Shared QueryClient instance
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

const StatsigProviderWrapper = ({ children }: { children: React.ReactNode }) => {
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
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

let _loggedAppInit = false;
let _loggedNotificationsInit = false;

export default function App() {
  useServiceWorkerUpdate();

  useEffect(() => {
    if (!_loggedAppInit) {
      _loggedAppInit = true;
      logger.info("Aplicação (RRv7) iniciada", { timestamp: new Date().toISOString() }, "root");
    }

    const removeInitialLoader = () => {
      const loader = document.getElementById("initial-loader");
      if (loader) {
        loader.style.opacity = "0";
        loader.style.transition = "opacity 0.3s ease-out";
        setTimeout(() => loader.remove(), 300);
      }
    };

    const loaderTimeout = setTimeout(removeInitialLoader, 2000);

    const scheduleMonitoringInit = async () => {
      try {
        const [{ initMonitoring }, { initPerformanceMonitoring }] = await Promise.all([
          import("@/lib/monitoring"),
          import("@/lib/monitoring/initPerformanceMonitoring"),
        ]);
        initMonitoring();
        await initPerformanceMonitoring(queryClient);
      } catch (error) {
        logger.error("Falha ao inicializar monitoramento", error, "root");
      }
    };

    const idleId = typeof window !== "undefined" && "requestIdleCallback" in window
      ? window.requestIdleCallback(() => void scheduleMonitoringInit(), { timeout: 3000 })
      : null;

    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
        if (!_loggedNotificationsInit) {
          _loggedNotificationsInit = true;
          logger.info("Notificações inicializadas", {}, "root");
        }
      } catch (error) {
        logger.error("Falha ao inicializar notificações", error, "root");
      }
    };

    initNotifications();

    return () => {
      clearTimeout(loaderTimeout);
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <GlobalErrorBoundary>
      <FisioErrorBoundary>
        <SkipLink />
        <FocusVisibleHandler />
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
          >
            <TooltipProvider>
              <AuthContextProvider>
                <HighContrastProvider>
                  <StatsigProviderWrapper>
                    <PremiumThemeToggle />
                    <Toaster />
                    <Sonner />
                    <Outlet />
                  </StatsigProviderWrapper>
                </HighContrastProvider>
              </AuthContextProvider>
            </TooltipProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </FisioErrorBoundary>
    </GlobalErrorBoundary>
  );
}
