import { Suspense, lazy, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { HighContrastProvider } from "@/contexts/HighContrastContext";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { AppLoadingSkeleton } from "@/components/ui/AppLoadingSkeleton";

let _loggedAppInit = false;
let _loggedNotificationsInit = false;
import { notificationManager } from "@/lib/services/NotificationManager";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { AppRoutes } from "./routes";
// ============================================================================
// NOVO: TEMA PROVIDER
// ============================================================================
import { ThemeProvider } from "@/components/ui/theme";

import { PremiumThemeToggle } from "@/components/ui/PremiumThemeToggle";

import { FeatureFlagProvider } from "@/lib/featureFlags/hooks";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { SkipLink, FocusVisibleHandler } from "@/components/accessibility";

// Create a client with performance optimizations
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			gcTime: 1000 * 60 * 60 * 24, // 24 hours (increased for persistence)
			retry: (failureCount, error) => {
				// Não retry para erros 4xx (client errors)
				if (error && typeof error === "object" && "status" in error) {
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
			networkMode: "offlineFirst",
		},
		mutations: {
			networkMode: "offlineFirst",
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
const StatsigProviderWrapper = ({
	children,
}: {
	children: React.ReactNode;
}) => {
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

	return (
		<FeatureFlagProvider user={statsigUser}>{children}</FeatureFlagProvider>
	);
};

// Component to initialize push notifications with navigation support
const NotificationInitializer = () => {
	const navigate = useNavigate();

	useEffect(() => {
		let isMounted = true;

		void import("@/lib/mobile/push-notifications")
			.then(({ initPushNotifications }) => {
				if (isMounted) {
					return initPushNotifications(navigate);
				}

				return undefined;
			})
			.catch((error) => {
				logger.error(
					"Falha ao carregar inicialização de push notifications",
					error,
					"App",
				);
			});

		return () => {
			isMounted = false;
		};
	}, [navigate]);

	return null;
};

const RouteAwareNetworkStatus = lazy(() =>
	import("@/components/ui/network-status").then((module) => ({
		default: module.NetworkStatus,
	})),
);
const RouteAwareSyncManager = lazy(() =>
	import("@/components/sync/SyncManager").then((module) => ({
		default: module.SyncManager,
	})),
);
const RouteAwareTourGuide = lazy(() =>
	import("@/components/system/TourGuide").then((module) => ({
		default: module.TourGuide,
	})),
);
const RouteAwareVersionManager = lazy(() =>
	import("@/components/system/VersionManager").then((module) => ({
		default: module.VersionManager,
	})),
);
const RouteAwareWebVitalsIndicator = lazy(() =>
	import("@/lib/monitoring/web-vitals").then((module) => ({
		default: module.WebVitalsIndicator,
	})),
);
const RouteAwarePosePreloadManager = lazy(() =>
	import("@/components/ai/PosePreloadManager").then((module) => ({
		default: module.PosePreloadManager,
	})),
);
const RouteAwareAuthenticatedAppShell = lazy(() =>
	import("@/components/app/AuthenticatedAppShell").then((module) => ({
		default: module.AuthenticatedAppShell,
	})),
);

// Grouped providers for cleaner structure and better performance
const AppProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<GlobalErrorBoundary>
			<ErrorBoundary>
				<SkipLink />
				<FocusVisibleHandler />
				<ThemeProvider>
					<PersistQueryClientProvider
						client={queryClient}
						persistOptions={{
							persister,
							maxAge: 1000 * 60 * 60 * 24 * 7,
						}}
						onSuccess={() =>
							logger.info("Cache persistente restaurado", {}, "App")
						}
					>
						<TooltipProvider>
							<AuthContextProvider>
								<HighContrastProvider>
									<StatsigProviderWrapper>{children}</StatsigProviderWrapper>
								</HighContrastProvider>
							</AuthContextProvider>
						</TooltipProvider>
					</PersistQueryClientProvider>
				</ThemeProvider>
			</ErrorBoundary>
		</GlobalErrorBoundary>
	);
};

const App = () => {
	useServiceWorkerUpdate();

	useEffect(() => {
		if (!_loggedAppInit) {
			_loggedAppInit = true;
			logger.info(
				"Aplicação iniciada",
				{ timestamp: new Date().toISOString() },
				"App",
			);
		}

		// Remover loader inicial após React montar (fallback de segurança)
		const removeInitialLoader = () => {
			const loader = document.getElementById("initial-loader");
			if (loader) {
				logger.info("Removendo initial loader", {}, "App");
				loader.style.opacity = "0";
				loader.style.transition = "opacity 0.3s ease-out";
				setTimeout(() => {
					loader.remove();
					logger.info("Initial loader removido", {}, "App");
				}, 300);
			}
		};

		// Remover loader após 2 segundos (fallback se o React não remover)
		const loaderTimeout = setTimeout(removeInitialLoader, 2000);

		// Inicializa monitoramento em baixa prioridade para não competir com render inicial
		const scheduleMonitoringInit = async () => {
			try {
				const [{ initMonitoring }, { initPerformanceMonitoring }] =
					await Promise.all([
						import("@/lib/monitoring"),
						import("@/lib/monitoring/initPerformanceMonitoring"),
					]);

				initMonitoring();
				await initPerformanceMonitoring(queryClient);
			} catch (error) {
				logger.error(
					"Falha ao inicializar monitoramento de performance",
					error,
					"App",
				);
			}
		};

		const idleId =
			typeof window !== "undefined" && "requestIdleCallback" in window
				? window.requestIdleCallback(() => void scheduleMonitoringInit(), {
						timeout: 3000,
					})
				: null;

		const monitoringFallbackTimer =
			idleId === null
				? setTimeout(() => void scheduleMonitoringInit(), 1200)
				: null;

		const initNotifications = async () => {
			try {
				await notificationManager.initialize();
				if (!_loggedNotificationsInit) {
					_loggedNotificationsInit = true;
					logger.info("Sistema de notificações inicializado", {}, "App");
				}
			} catch (error) {
				logger.error(
					"Falha ao inicializar sistema de notificações",
					error,
					"App",
				);
			}
		};

		initNotifications();
		sessionStorage.removeItem("chunk_load_error_reload");

		return () => {
			clearTimeout(loaderTimeout);
			if (monitoringFallbackTimer) {
				clearTimeout(monitoringFallbackTimer);
			}
			if (
				idleId !== null &&
				typeof window !== "undefined" &&
				"cancelIdleCallback" in window
			) {
				window.cancelIdleCallback(idleId);
			}
		};
	}, []);

	return (
		<AppProviders>
			<PremiumThemeToggle />
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<RouteAwareInfrastructure />
				<RouteAwareAppShell>
					<Suspense
						fallback={<AppLoadingSkeleton message="Carregando sistema..." />}
					>
						<AppRoutes />
					</Suspense>
				</RouteAwareAppShell>
			</BrowserRouter>
		</AppProviders>
	);
};

const PUBLIC_BOOT_PATH_PREFIXES = [
	"/auth",
	"/welcome",
	"/pre-cadastro",
	"/prescricoes/publica",
	"/agendar",
];

function isPublicBootPath(pathname: string): boolean {
	return PUBLIC_BOOT_PATH_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

const POSE_BOOT_PATH_PREFIXES = [
	"/ai/movement",
	"/computer-vision",
	"/augmented-reality",
	"/dashboard/imagens",
];

function shouldPreloadPoseForPath(pathname: string): boolean {
	if (pathname.startsWith("/pacientes/") && pathname.includes("/imagens")) {
		return true;
	}

	return POSE_BOOT_PATH_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

const RouteAwareAppShell = ({ children }: { children: React.ReactNode }) => {
	const location = useLocation();
	const isPublicRoute = isPublicBootPath(location.pathname);

	if (isPublicRoute) {
		return <>{children}</>;
	}

	return (
		<Suspense fallback={<AppLoadingSkeleton message="Carregando sistema..." />}>
			<RouteAwareAuthenticatedAppShell>
				{children}
			</RouteAwareAuthenticatedAppShell>
		</Suspense>
	);
};

const RouteAwareInfrastructure = () => {
	const location = useLocation();
	const isPublicRoute = isPublicBootPath(location.pathname);
	const shouldPreloadPose = shouldPreloadPoseForPath(location.pathname);

	return (
		<>
			<Suspense fallback={null}>
				<RouteAwareNetworkStatus />
			</Suspense>
			{!isPublicRoute && (
				<Suspense fallback={null}>
					<RouteAwareSyncManager />
				</Suspense>
			)}
			{!isPublicRoute && (
				<Suspense fallback={null}>
					<RouteAwareTourGuide />
				</Suspense>
			)}
			{!isPublicRoute && <NotificationInitializer />}
			{!isPublicRoute && (
				<Suspense fallback={null}>
					<RouteAwareVersionManager />
				</Suspense>
			)}
			{!isPublicRoute && shouldPreloadPose && (
				<Suspense fallback={null}>
					<RouteAwarePosePreloadManager />
				</Suspense>
			)}
			{!isPublicRoute &&
				import.meta.env.DEV &&
				!window.location.search.includes("e2e=true") && (
					<Suspense fallback={null}>
						<RouteAwareWebVitalsIndicator />
					</Suspense>
				)}
		</>
	);
};

export default App;
