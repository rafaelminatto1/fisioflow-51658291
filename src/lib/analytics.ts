// import { Analytics } from '@vercel/analytics/react';
// import ReactGA from 'react-ga4';
// import * as Sentry from '@sentry/react';

// Configuração do Google Analytics
const GA_MEASUREMENT_ID = process.env.VITE_GA_MEASUREMENT_ID || '';

// Configuração do Sentry
const SENTRY_DSN = process.env.VITE_SENTRY_DSN || '';

// Inicializar Google Analytics
export const initGA = () => {
  // if (GA_MEASUREMENT_ID) {
  //   ReactGA.initialize(GA_MEASUREMENT_ID);
  //   console.log('Google Analytics inicializado');
  // }
};

// Inicializar Sentry
export const initSentry = () => {
  // if (SENTRY_DSN) {
  //   Sentry.init({
  //     dsn: SENTRY_DSN,
  //     environment: process.env.NODE_ENV || 'development',
  //     tracesSampleRate: 1.0,
  //     integrations: [
  //       new Sentry.BrowserTracing(),
  //     ],
  //   });
  //   console.log('Sentry inicializado');
  // }
};

// Rastrear eventos personalizados
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  // if (GA_MEASUREMENT_ID) {
  //   ReactGA.event({
  //     action,
  //     category,
  //     label,
  //     value,
  //   });
  // }
  
  console.log('Evento rastreado:', { action, category, label, value });
};

// Rastrear visualizações de página
export const trackPageView = (path: string, title?: string) => {
  // if (GA_MEASUREMENT_ID) {
  //   ReactGA.send({ hitType: 'pageview', page: path, title });
  // }
  console.log('Página rastreada:', path);
};

// Rastrear erros
export const trackError = (error: Error, errorInfo?: any) => {
  // Enviar para Sentry
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: errorInfo,
    });
  }
  
  // Enviar para Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      action: 'exception',
      category: 'Error',
      label: error.message,
      fatal: false,
    });
  }
};

// Rastrear performance
export const trackTiming = (category: string, variable: string, value: number, label?: string) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      action: 'timing_complete',
      category,
      label: `${variable}${label ? ` - ${label}` : ''}`,
      value,
    });
  }
};

// Rastrear conversões (agendamentos, cadastros, etc.)
export const trackConversion = (action: string, value?: number) => {
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      action,
      category: 'Conversion',
      value,
    });
  }
};

// Hook para analytics
export const useAnalytics = () => {
  return {
    trackEvent,
    trackPageView,
    trackError,
    trackTiming,
    trackConversion,
  };
};

// Componente de Analytics para Vercel
// export const VercelAnalytics = Analytics;
export const VercelAnalytics = () => null;

export default {
  initGA,
  initSentry,
  trackEvent,
  trackPageView,
  trackError,
  trackTiming,
  trackConversion,
  useAnalytics,
  VercelAnalytics,
};