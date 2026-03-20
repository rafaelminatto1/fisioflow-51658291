/**
 * Canonical error boundary exports — single source of truth.
 *
 * Use these instead of any other error boundary file:
 *   import { GlobalErrorBoundary, RouteErrorBoundary, ComponentErrorBoundary } from '@/components/error'
 */

// Global (app-level, Sentry + full-page fallback)
export { GlobalErrorBoundary, withErrorBoundary } from "./GlobalErrorBoundary";

// Route-level (wraps React Router routes, logs URL context)
export { RouteErrorBoundary } from "./RouteErrorBoundary";

// Component-level (inline widgets, suppressable)
export {
	ComponentErrorBoundary,
	HeavyComponentFallback,
	PDFComponentFallback,
	ComputerVisionFallback,
	ChartFallback,
} from "./ComponentErrorBoundary";
export type { ComponentErrorBoundaryProps } from "./ComponentErrorBoundary";

// App-level with Vite preload handler (used in App.tsx)
export { ErrorBoundary, ErrorBoundaryWithViteHandler } from "./ErrorBoundary";

// Utility components
export { CustomNotification } from "./CustomNotification";
export { GlobalNotifications } from "./GlobalNotifications";
export { ErrorPageLayout } from "./ErrorPageLayout";
