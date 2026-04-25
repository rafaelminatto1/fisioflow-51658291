// 1. INICIALIZAÇÃO CRÍTICA
import "temporal-polyfill/global";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { initializeOnClient } from "@/lib/services/initialization";
import { registerSW } from "virtual:pwa-register";

import { handleChunkError } from "@/utils/chunkError";

// 3. MONITORAMENTO DE ERROS DE BUNDLE (VITE 8)
window.addEventListener("error", (event) => {
  handleChunkError(event.error ?? event.message, "window.error");
});

window.addEventListener("unhandledrejection", (event) => {
  handleChunkError(event.reason, "unhandledrejection");
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
      console.log("[PWA] Nova versão detectada. Forçando atualização de cache...");
      // Força o reload para garantir que o navegador pegue os novos assets e evite 404
      void updateSW?.(true);
    },
    onOfflineReady() {
      console.log("[PWA] Conteúdo em cache para uso offline.");
    },
    onRegisteredSW(swUrl, r) {
      console.log("[PWA] Service Worker registrado:", swUrl);
      // Força verificação de update a cada hora
      if (r) {
        setInterval(
          () => {
            console.log("[PWA] Verificando atualizações em segundo plano...");
            r.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Erro no registro do Service Worker:", error);
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
      } catch (err: any) {
        // Silencia erro de permissão negada (comum se não estiver instalado como PWA)
        if (err?.name !== "NotAllowedError") {
          console.warn("[PWA] Periodic Sync não pôde ser registrado:", err);
        }
      }
    }
  });
}

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
