import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "@/contexts/DataContext";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry/config";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

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
// SERVICE WORKER UPDATE HANDLER
// ============================================================================

// Configurar handler para mensagens do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      // SW solicitou ativação imediata
      console.log('[SW] Skip waiting recebido, recarregando...');
      window.location.reload();
    }
  });

  // Limpar caches antigos ao iniciar
  window.addEventListener('load', async () => {
    try {
      // Aguardar um momento para o SW estar pronto
      await new Promise(resolve => setTimeout(resolve, 1000));

      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        // Verificar se há um SW esperando ativação (de deploy anterior)
        if (registration.waiting) {
          console.log('[SW] SW waiting detectado, ativando...');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Recarregar após ativar
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
      }
    } catch (error) {
      console.warn('[SW] Erro ao verificar SWs existentes:', error);
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
  window.fetch = function(input, init) {
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
    <DataProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </DataProvider>
  </StrictMode>
);
