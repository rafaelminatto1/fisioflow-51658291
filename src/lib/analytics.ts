import { ErrorInfo } from 'react';

// Interface para eventos de analytics
interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

// Interface para dados de erro
interface ErrorData {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
}

// Função para rastrear eventos gerais
export const trackEvent = (event: string, properties?: Record<string, any>): void => {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date()
  };

  // Em desenvolvimento, apenas log no console
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', analyticsEvent);
    return;
  }

  // Em produção, enviar para serviço de analytics
  try {
    // Aqui você pode integrar com Google Analytics, Mixpanel, etc.
    // Por exemplo: gtag('event', event, properties);
    
    // Por enquanto, armazenar localmente
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push(analyticsEvent);
    localStorage.setItem('analytics_events', JSON.stringify(events.slice(-100))); // Manter apenas os últimos 100
  } catch (error) {
    console.error('Erro ao rastrear evento:', error);
  }
};

// Função para rastrear erros
export const trackError = (error: Error, errorInfo?: ErrorInfo): void => {
  const errorData: ErrorData = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date()
  };

  // Em desenvolvimento, log detalhado no console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Tracked:', errorData);
    return;
  }

  // Em produção, enviar para serviço de monitoramento de erros
  try {
    // Aqui você pode integrar com Sentry, LogRocket, etc.
    // Por exemplo: Sentry.captureException(error, { extra: errorInfo });
    
    // Por enquanto, armazenar localmente e enviar para console
    const errors = JSON.parse(localStorage.getItem('error_logs') || '[]');
    errors.push(errorData);
    localStorage.setItem('error_logs', JSON.stringify(errors.slice(-50))); // Manter apenas os últimos 50
    
    // Também enviar para console em produção para debug
    console.error('Production Error:', errorData);
  } catch (trackingError) {
    console.error('Erro ao rastrear erro:', trackingError);
  }
};

// Função para rastrear visualizações de página
export const trackPageView = (page: string, properties?: Record<string, any>): void => {
  trackEvent('page_view', {
    page,
    ...properties
  });
};

// Função para rastrear ações do usuário
export const trackUserAction = (action: string, properties?: Record<string, any>): void => {
  trackEvent('user_action', {
    action,
    ...properties
  });
};

// Função para rastrear métricas de performance
export const trackPerformance = (metric: string, value: number, properties?: Record<string, any>): void => {
  trackEvent('performance_metric', {
    metric,
    value,
    ...properties
  });
};

// Função para obter eventos armazenados (útil para debug)
export const getStoredEvents = (): AnalyticsEvent[] => {
  try {
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  } catch {
    return [];
  }
};

// Função para obter erros armazenados (útil para debug)
export const getStoredErrors = (): ErrorData[] => {
  try {
    return JSON.parse(localStorage.getItem('error_logs') || '[]');
  } catch {
    return [];
  }
};

// Função para limpar dados armazenados
export const clearStoredData = (): void => {
  localStorage.removeItem('analytics_events');
  localStorage.removeItem('error_logs');
};

// Inicialização do sistema de analytics
export const initializeAnalytics = (): void => {
  // Rastrear carregamento inicial da página
  if (typeof window !== 'undefined') {
    trackPageView(window.location.pathname);
    
    // Rastrear erros não capturados
    window.addEventListener('error', (event) => {
      trackError(new Error(event.message), {
        componentStack: `at ${event.filename}:${event.lineno}:${event.colno}`
      } as ErrorInfo);
    });
    
    // Rastrear promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event) => {
      trackError(new Error(`Unhandled Promise Rejection: ${event.reason}`));
    });
  }
};