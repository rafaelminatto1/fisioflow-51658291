// Inicializar serviços globais de forma otimizada
import "temporal-polyfill/global";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	ensureServiceWorkerRegistration,
	requestBrowserNotificationPermission,
} from "@/lib/pwa/serviceWorker";

// Inicialização paralela de serviços não-bloqueantes
const initServices = async () => {
	try {
		const [
			{ initSentry },
			{ initPostHog },
			{ initAppCheck },
			{ initializeRemoteConfig },
		] = await Promise.all([
			import("@/lib/sentry/config"),
			import("@/lib/analytics/posthog"),
			import("@/lib/app-check"),
			import("@/lib/remote-config-manager"),
		]);

		initSentry();
		initPostHog();
		initAppCheck();

		// Serviços que podem falhar sem quebrar a app (Remote Config, Analytics, etc)
		const secondaryServices = [initializeRemoteConfig(3600000, 600000)];

		await Promise.allSettled(secondaryServices);
		logger.info("Serviços secundários inicializados", null, "main.tsx");

		// PWA fallback: manter um único fluxo de registro de SW.
		const registration = await ensureServiceWorkerRegistration();
		if (registration) {
			const permission = await requestBrowserNotificationPermission();
			if (permission) {
				logger.info("Notification permission:", { permission }, "main.tsx");
			}
		}
	} catch (error) {
		logger.error(
			"Erro na inicialização de serviços",
			error as Error,
			"main.tsx",
		);
	}
};

// ============================================================================
// BOOTSTRAP (Render first, init later)
// ============================================================================
createRoot(document.getElementById("root")!).render(
	<App />
);

// Inicialização de serviços secundários após o render inicial
const runInit = () => {
	setTimeout(() => {
		initServices();
	}, 0);
};

if (typeof window !== "undefined") {
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(() => runInit());
	} else {
		runInit();
	}
}

// ============================================================================
// ERROR HANDLERS (Global)
// ============================================================================
const CHUNK_RELOAD_GUARD_KEY = "__fisioflow_chunk_reload_once__";

function isChunkLoadError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error ?? "");
	return /chunk|dynamically imported module|failed to fetch|reading 'default'/i.test(
		message,
	);
}

function reloadOnChunkError(reason: string) {
	if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1") {
		logger.error(
			`Chunk reload já executado (evitando loop): ${reason}`,
			null,
			"main.tsx",
		);
		return;
	}

	sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
	logger.error(
		`Erro de chunk detectado (${reason}) - recarregando`,
		null,
		"main.tsx",
	);
	window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
	event.preventDefault();
	reloadOnChunkError("vite:preloadError");
});

window.addEventListener("error", (event) => {
	if (!isChunkLoadError(event.error ?? event.message)) return;
	reloadOnChunkError("window.error");
});

window.addEventListener("unhandledrejection", (event) => {
	if (!isChunkLoadError(event.reason)) return;
	reloadOnChunkError("unhandledrejection");
});
