import { Outlet, useLocation } from "react-router";
import { isPublicBootPath } from "./InfrastructureLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AuthenticatedAppShell } from "@/components/app/AuthenticatedAppShell";

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
			<AuthenticatedAppShell>
				<Outlet />
			</AuthenticatedAppShell>
		</ProtectedRoute>
	);
}
