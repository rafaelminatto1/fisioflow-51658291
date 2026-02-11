
// Inicializar serviços globais de forma otimizada
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from '@/lib/sentry/config';
import { initAppCheck } from '@/lib/firebase/app-check';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { initializeRemoteConfig } from '@/lib/firebase/remote-config';
import { initCrashlytics } from '@/lib/firebase/crashlytics';
import { initPerformanceMonitoring } from '@/lib/firebase/performance';

// Inicialização paralela de serviços não-bloqueantes
const initServices = async () => {
  try {
    initSentry();
    initAppCheck();
    
    // Serviços que podem falhar sem quebrar a app (Remote Config, Analytics, etc)
    const secondaryServices = [
      initializeRemoteConfig(3600000, 600000),
      initCrashlytics(),
      initPerformanceMonitoring()
    ];
    
    await Promise.allSettled(secondaryServices);
    logger.info('Serviços secundários inicializados', null, 'main.tsx');
  } catch (error) {
    logger.error('Erro na inicialização de serviços', error as Error, 'main.tsx');
  }
};

initServices();

// ============================================================================
// ERROR HANDLERS (Global)
// ============================================================================
window.addEventListener('vite:preloadError', () => {
  logger.error('Vite preload error - Recarregando deployment', null, 'main.tsx');
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
