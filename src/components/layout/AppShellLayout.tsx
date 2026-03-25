import { Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router";
import { AppLoadingSkeleton } from "@/components/ui/AppLoadingSkeleton";
import { isPublicBootPath } from "./InfrastructureLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const RouteAwareAuthenticatedAppShell = lazy(() =>
	import("@/components/app/AuthenticatedAppShell").then((module) => ({
		default: module.AuthenticatedAppShell,
	})),
);

/**
 * App Shell Layout
 * Wraps private routes with the Authenticated App Shell.
 */
export default function AppShellLayout() {
	const location = useLocation();
	const isPublicRoute = isPublicBootPath(location.pathname);

	if (isPublicRoute) {
		return <Outlet />;
	}

	return (
		<ProtectedRoute>
			<Suspense fallback={<AppLoadingSkeleton message="Carregando sistema..." />}>
				<RouteAwareAuthenticatedAppShell>
					<Outlet />
				</RouteAwareAuthenticatedAppShell>
			</Suspense>
		</ProtectedRoute>
	);
}
