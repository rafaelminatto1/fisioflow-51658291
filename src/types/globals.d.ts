/**
 * Ambient declarations for third-party globals injected at runtime.
 * Centralizes types that other files would otherwise cast as `any`.
 */

interface PerformanceWithMemory extends Performance {
	memory?: {
		usedJSHeapSize: number;
		totalJSHeapSize: number;
		jsHeapSizeLimit: number;
	};
}

interface AnalyticsTrackPayload {
	[key: string]: string | number | boolean | undefined;
}

interface GtagFn {
	(command: "event", action: string, params?: AnalyticsTrackPayload): void;
	(command: "config", id: string, params?: AnalyticsTrackPayload): void;
	(command: "set", params: AnalyticsTrackPayload): void;
}

declare global {
	interface Window {
		gtag?: GtagFn;
		analytics?: {
			track: (event: string, payload?: AnalyticsTrackPayload) => void;
			identify?: (userId: string, traits?: AnalyticsTrackPayload) => void;
			page?: (name?: string, properties?: AnalyticsTrackPayload) => void;
		};
	}

	interface Performance {
		memory?: {
			usedJSHeapSize: number;
			totalJSHeapSize: number;
			jsHeapSizeLimit: number;
		};
	}
}

export {};
