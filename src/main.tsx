// 1. INICIALIZAÇÃO CRÍTICA
import "temporal-polyfill/global";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fisioLogger as logger } from "@/lib/errors/logger";

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

// Inicialização de serviços secundários após o render inicial para TBT zero
setTimeout(() => {
	logger.info("Sistema inicializado", { 
		version: "2026.1.0",
		engine: "Vite 8 + Rolldown"
	}, "main");
}, 100);
