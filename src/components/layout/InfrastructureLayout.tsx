import { Suspense, lazy, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { fisioLogger as logger } from "@/lib/errors/logger";

// Lazy loads for infrastructure components
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
					"InfrastructureLayout",
				);
			});

		return () => {
			isMounted = false;
		};
	}, [navigate]);

	return null;
};

// Public path helper
const PUBLIC_BOOT_PATH_PREFIXES = [
	"/auth",
	"/welcome",
	"/pre-cadastro",
	"/prescricoes/publica",
	"/agendar",
];

export function isPublicBootPath(pathname: string): boolean {
	return PUBLIC_BOOT_PATH_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

// Pose preload helper
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

/**
 * Infrastructure Layout
 * Wraps all routes and handles global services like network status, sync, and notifications.
 */
export default function InfrastructureLayout() {
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
			<Outlet />
		</>
	);
}
