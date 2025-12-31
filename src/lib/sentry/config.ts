// Configuração do Sentry para o frontend
import * as Sentry from '@sentry/react';
import { logger } from '@/lib/errors/logger';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('Sentry DSN não configurado. Monitoramento de erros desabilitado.', {}, 'Sentry');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    // Filtros de erros
    beforeSend(event, hint) {
      // Filtrar erros conhecidos que não são críticos
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignorar erros de rede quando offline
          if (error.message.includes('Failed to fetch') && !navigator.onLine) {
            return null;
          }
          // Ignorar erros de CORS em desenvolvimento
          if (error.message.includes('CORS') && import.meta.env.DEV) {
            return null;
          }
        }
      }
      return event;
    },
  });
}

export { Sentry };

