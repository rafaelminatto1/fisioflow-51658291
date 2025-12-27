// Configuração do Sentry para Edge Functions (Deno)
// Nota: @sentry/deno precisa ser importado via esm.sh

export interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

let sentryInitialized = false;

export async function initSentry(config: SentryConfig) {
  if (sentryInitialized) {
    return;
  }

  try {
    // Importar Sentry para Deno
    const Sentry = await import('https://esm.sh/@sentry/deno@7.91.0');
    
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || Deno.env.get('ENVIRONMENT') || 'production',
      release: config.release,
      tracesSampleRate: config.tracesSampleRate || 0.1,
      beforeSend(event) {
        // Filtrar eventos em desenvolvimento
        if (config.environment === 'development') {
          // Apenas enviar erros críticos em dev
          if (event.level === 'error' || event.level === 'fatal') {
            return event;
          }
          return null;
        }
        return event;
      },
    });

    sentryInitialized = true;
    console.log('Sentry inicializado para Edge Functions');
  } catch (error) {
    console.error('Erro ao inicializar Sentry:', error);
    // Não quebrar a aplicação se Sentry falhar
  }
}

export async function captureException(error: Error, context?: Record<string, unknown>) {
  try {
    const Sentry = await import('https://esm.sh/@sentry/deno@7.91.0');
    
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.error('Erro ao capturar exceção no Sentry:', err);
  }
}

export async function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) {
  try {
    const Sentry = await import('https://esm.sh/@sentry/deno@7.91.0');
    
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } catch (err) {
    console.error('Erro ao capturar mensagem no Sentry:', err);
  }
}

export async function addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>) {
  try {
    const Sentry = await import('https://esm.sh/@sentry/deno@7.91.0');
    
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    });
  } catch (err) {
    // Ignorar erros de breadcrumb
  }
}

