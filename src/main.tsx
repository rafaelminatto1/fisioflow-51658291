// 1. INICIALIZAÇÃO CRÍTICA
import "temporal-polyfill/global";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { initializeOnClient } from "@/lib/services/initialization";

import { handleChunkError } from "@/utils/chunkError";
import { registerAppServiceWorker } from "@/lib/pwa/serviceWorkerRegistration";

// 3. MONITORAMENTO DE ERROS DE BUNDLE (VITE 8)
window.addEventListener("error", (event) => {
  handleChunkError(event.error ?? event.message, "window.error");
});

window.addEventListener("unhandledrejection", (event) => {
  handleChunkError(event.reason, "unhandledrejection");
});

// Evento dedicado do Vite para falha de preload/prefetch de chunk (não passa pelo
// render do React, então os boundaries não pegam). Recomendação oficial do Vite.
window.addEventListener("vite:preloadError", (event) => {
  handleChunkError((event as { payload?: unknown }).payload ?? event, "vite:preloadError");
});

// ============================================================================
// BOOTSTRAP (Render first, init later)
// ============================================================================
const container = document.getElementById("root");
if (!container) throw new Error("Elemento root não encontrado");

createRoot(container).render(<App />);

// 5. REGISTRO DE SERVICE WORKER (PWA)
void registerAppServiceWorker();

// Inicialização de serviços secundários após o render inicial para TBT zero
setTimeout(() => {
  initializeOnClient().then(() => {
    logger.info(
      "Sistema inicializado",
      {
        version: "2026.1.0",
        engine: "Vite 8 + Rolldown",
      },
      "main",
    );
  });
}, 100);
