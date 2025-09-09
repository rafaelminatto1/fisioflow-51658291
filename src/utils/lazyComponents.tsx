/**
 * Lazy Loading Components - FisioFlow
 * Otimização de performance com carregamento sob demanda
 */

import React, { lazy } from 'react';
import { ComponentType } from 'react';

// Wrapper para lazy loading com error boundary
const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  displayName?: string
) => {
  const LazyComponent = lazy(importFn);
  
  if (displayName) {
    LazyComponent.displayName = displayName;
  }
  
  return LazyComponent;
};

// Páginas menos críticas (carregamento sob demanda)
export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('../pages/analytics/AnalyticsDashboard'),
  'LazyAnalyticsDashboard'
);

export const LazyReportsLibrary = createLazyComponent(
  () => import('../pages/reports/ReportsLibrary'),
  'LazyReportsLibrary'
);

export const LazySmartAI = createLazyComponent(
  () => import('../pages/SmartAI'),
  'LazySmartAI'
);

export const LazySmartExercisePlans = createLazyComponent(
  () => import('../pages/SmartExercisePlans'),
  'LazySmartExercisePlans'
);

export const LazyCommunications = createLazyComponent(
  () => import('../pages/Communications'),
  'LazyCommunications'
);

export const LazyPartner = createLazyComponent(
  () => import('../pages/Partner'),
  'LazyPartner'
);

export const LazyVouchers = createLazyComponent(
  () => import('../pages/Vouchers'),
  'LazyVouchers'
);

export const LazyFileUploadTest = createLazyComponent(
  () => import('../pages/FileUploadTest'),
  'LazyFileUploadTest'
);

// Componentes pesados (carregamento sob demanda)
export const LazyExerciseProgressTracker = createLazyComponent(
  () => import('../components/exercises/ExerciseProgressTracker'),
  'LazyExerciseProgressTracker'
);

// Componentes de relatórios (carregamento sob demanda)
export const LazyReportBuilder = createLazyComponent(
  () => import('../components/reports/ReportBuilder'),
  'LazyReportBuilder'
);

// Componente de loading personalizado
export const LazyLoadingFallback = ({ message = 'Carregando...' }: { message?: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
};

// Componente de erro para lazy loading
export const LazyErrorFallback = ({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void; 
}) => (
  <div className="flex items-center justify-center min-h-[200px] bg-red-50 rounded-lg border border-red-200">
    <div className="text-center p-6">
      <div className="text-red-600 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar componente</h3>
      <p className="text-red-600 text-sm mb-4">{error.message}</p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  </div>
);

// Função para preload de componentes
export const preloadComponent = (componentName: string) => {
  // Mapeamento de nomes para imports
  const componentImports: Record<string, () => Promise<any>> = {
    'LazyAnalyticsDashboard': () => import('../pages/analytics/AnalyticsDashboard'),
    'LazyReportsLibrary': () => import('../pages/reports/ReportsLibrary'),
    'LazySmartAI': () => import('../pages/SmartAI'),
    'LazySmartExercisePlans': () => import('../pages/SmartExercisePlans'),
    'LazyCommunications': () => import('../pages/Communications'),
    'LazyPartner': () => import('../pages/Partner'),
    'LazyVouchers': () => import('../pages/Vouchers'),
    'LazyFileUploadTest': () => import('../pages/FileUploadTest'),
    'LazyExerciseProgressTracker': () => import('../components/exercises/ExerciseProgressTracker'),
    'LazyReportBuilder': () => import('../components/reports/ReportBuilder')
  };

  const componentImport = componentImports[componentName];
  if (componentImport) {
    // Preload apenas se não estiver em mobile e tiver boa conexão
    if (typeof window !== 'undefined' && 
        !window.navigator.userAgent.includes('Mobile') &&
        (navigator as any).connection?.effectiveType !== 'slow-2g') {
      componentImport().catch(() => {
        // Ignorar erros de preload
      });
    }
  }
};

// Hook para preload de componentes
export const usePreloadComponent = () => {
  return { preloadComponent };
};

// Configuração de preload inteligente
export const PreloadConfig = {
  // Preload após 2 segundos de idle
  idleTime: 2000,
  
  // Preload apenas em conexões rápidas
  fastConnectionOnly: true,
  
  // Preload apenas em desktop
  desktopOnly: true,
  
  // Componentes para preload automático
  autoPreload: [
    () => import('../pages/analytics/AnalyticsDashboard'),
    () => import('../pages/reports/ReportsLibrary')
  ]
};

// Inicializar preload automático
if (typeof window !== 'undefined') {
  let idleTimer: NodeJS.Timeout;
  
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // Verificar condições para preload
      const isMobile = window.navigator.userAgent.includes('Mobile');
      const isSlowConnection = (navigator as any).connection?.effectiveType === 'slow-2g';
      
      if (!isMobile && !isSlowConnection) {
        PreloadConfig.autoPreload.forEach(importFn => {
          importFn().catch(() => {
            // Ignorar erros de preload
          });
        });
      }
    }, PreloadConfig.idleTime);
  };
  
  // Eventos para detectar atividade do usuário
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
  });
  
  // Iniciar timer
  resetIdleTimer();
}