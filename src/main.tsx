// 1. INICIALIZAÇÃO CRÍTICA
import "temporal-polyfill/global";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { initializeOnClient } from "@/lib/services/initialization";
import { registerSW } from "virtual:pwa-register";

// 3. MONITORAMENTO DE ERROS DE BUNDLE (VITE 8)
const isChunkLoadError = (error: unknown) => {
	const message =
		typeof error === "string"
			? error
			: typeof error === "object" &&
				  error !== null &&
				  "message" in error &&
				  typeof error.message === "string"
				? error.message
				: "";
	return (
		/Loading chunk/i.test(message) ||
		/Loading CSS chunk/i.test(message) ||
		/Failed to fetch dynamically imported module/i.test(message)
	);
};

const reloadOnChunkError = (source: string) => {
	console.warn(`[Vite] Erro de carregamento de chunk detectado via ${source}. Recarregando...`);
	window.location.reload();
};

window.addEventListener("error", (event) => {
	if (!isChunkLoadError(event.error ?? event.message)) return;
	reloadOnChunkError("window.error");
});

window.addEventListener("unhandledrejection", (event) => {
	if (!isChunkLoadError(event.reason)) return;
	reloadOnChunkError("unhandledrejection");
});

// ============================================================================
// BOOTSTRAP (Render first, init later)
// ============================================================================
const container = document.getElementById("root");
if (!container) throw new Error("Elemento root não encontrado");

createRoot(container).render(<App />);

// 5. REGISTRO DE SERVICE WORKER (PWA)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
	let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

	updateSW = registerSW({
		immediate: true,
		onNeedRefresh() {
			console.log("[PWA] Nova versão disponível. Atualizando agora para evitar bundles antigos.");
			void updateSW?.(true);
		},
		onOfflineReady() {
			console.log("[PWA] Aplicativo pronto para uso offline.");
		},
	});

	// Registro de Periodic Sync (V5 Pro)
	navigator.serviceWorker.ready.then(async (registration) => {
		if ("periodicSync" in registration) {
			try {
				await (registration as any).periodicSync.register("wiki-sync", {
					minInterval: 24 * 60 * 60 * 1000, // 24 horas
				});
				console.log("[PWA] Periodic Sync registrado: wiki-sync");
			} catch (err) {
				console.warn("[PWA] Periodic Sync não pôde ser registrado:", err);
			}
		}
	});
}

// Inicialização de serviços secundários após o render inicial para TBT zero
setTimeout(() => {
	initializeOnClient().then(() => {
		logger.info("Sistema inicializado", {
			version: "2026.1.0",
			engine: "Vite 8 + Rolldown"
		}, "main");
	});
}, 100);
