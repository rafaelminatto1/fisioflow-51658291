import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/lib/sentry/config";
import { initAppCheck } from "@/lib/firebase/app-check";
import { fisioLogger as logger } from '@/lib/errors/logger';
import { initMonitoring } from '@/lib/monitoring';
import { initializeRemoteConfig } from '@/lib/firebase/remote-config';

// Inicializar serviços globais
initSentry();
initAppCheck();

// Inicializar Monitoring (Google Analytics 4)
initMonitoring();

// Inicializar Remote Config (feature flags)
initializeRemoteConfig(
  3600000,  // cacheDuration: 1 hora em produção
  600000    // minimumFetchInterval: 10 minutos
).catch((error) => {
  logger.error('Failed to initialize Remote Config', error, 'main.tsx');
  // Não bloquear inicialização da app se Remote Config falhar
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// Global Chunk Load Error Handler for Vite
window.addEventListener('vite:preloadError', (event) => {
  logger.error('Vite preload error detected', event as Error, 'main.tsx');
  // Reloading the page to fetch the latest deployment
  window.location.reload();
});

// Handler para erros não capturados
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', event.error as Error, 'main.tsx');
});

// Handler para promises rejeitadas não capturadas
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason as Error, 'main.tsx');
});

// ============================================================================
// SERVICE WORKER REGISTRATION
// ============================================================================

// TEMPORARILY DISABLED: Service Worker may be interfering with Firebase Auth
// TODO: Re-enable after fixing the issue
logger.debug('Service Worker registration disabled temporarily to fix Firebase Auth', null, 'main.tsx');

/*
// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.debug(`Service Worker registered: ${registration.scope}`, null, 'main.tsx');

      // Verificar por atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              logger.debug('New version available', null, 'main.tsx');

              // Notificar usuário (opcional - implementar UI)
              if (window.confirm('Nova versão disponível. Deseja atualizar?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          });
        }
      });

      // Configurar handler para mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SKIP_WAITING') {
          // SW solicitou ativação imediata
          logger.debug('Skip waiting recebido, recarregando...', null, 'main.tsx');
          window.location.reload();
        }
      });

      // Solicitar permissão para notificações (opcional)
      if ('Notification' in window && Notification.permission === 'default') {
        // Não solicitar automaticamente - deixar usuário decidir
        // await Notification.requestPermission();
      }
    } catch (error) {
      logger.error('Service Worker registration failed', error as Error, 'main.tsx');
    }
  });
}
*/

// ============================================================================
// CACHE INVALIDATION FOR DEVELOPMENT
// ============================================================================

// Em desenvolvimento, desabilitar cache agressivo
if (import.meta.env.DEV) {
  // Adicionar timestamp para evitar cache em dev
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
    }

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
