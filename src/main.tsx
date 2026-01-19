import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry/config";

// Inicializar Sentry antes de renderizar a aplicação
initSentry();

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// Global Chunk Load Error Handler for Vite
window.addEventListener('vite:preloadError', (event) => {
  console.error('Vite preload error detected:', event);
  // Reloading the page to fetch the latest deployment
  window.location.reload();
});

// Handler para erros não capturados
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

// Handler para promises rejeitadas não capturadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ============================================================================
// SERVICE WORKER MESSAGE HANDLER
// ============================================================================

// Configurar handler para mensagens do Service Worker
// O VitePWA envia mensagens quando há atualizações
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      // SW solicitou ativação imediata
      console.log('[SW] Skip waiting recebido, recarregando...');
      window.location.reload();
    }
  });
}

// ============================================================================
// CACHE INVALIDATION FOR DEVELOPMENT
// ============================================================================

// Em desenvolvimento, desabilitar cache agressivo
if (import.meta.env.DEV) {
  // Adicionar timestamp para evitar cache em dev
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/sw.js')) {
      // Adicionar timestamp para SW em dev
      const separator = url.includes('?') ? '&' : '?';
      const timestampedUrl = `${url}${separator}t=${Date.now()}`;
      return originalFetch(timestampedUrl, init);
    }
    return originalFetch(input, init);
  };
}

// ============================================================================
// APP RENDERING
// ============================================================================

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
