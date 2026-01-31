/**
 * Hook para capturar erros de renderização em componentes React
 * Útil para debugging de erros que ocorrem durante a renderização
 */
import { useEffect, useRef } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

export function useRenderTracking(componentName: string, extraData?: Record<string, unknown>) {
  const renderCount = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    renderCount.current++;
    logger.debug(`[RenderTracking] ${componentName} render #${renderCount.current}`, {
      timestamp: new Date().toISOString(),
      ...extraData
    }, 'useRenderTracking');

    return () => {
      isMounted.current = false;
      logger.debug(`[RenderTracking] ${componentName} unmounted`, undefined, 'useRenderTracking');
    };
  });

  useEffect(() => {
    // Capturar erros não tratados
    const handleError = (event: ErrorEvent) => {
      logger.error(`[RenderTracking] Unhandled error in ${componentName}`, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        ...extraData
      }, 'useRenderTracking');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      logger.error(`[RenderTracking] Unhandled promise rejection in ${componentName}`, {
        reason: event.reason,
        ...extraData
      }, 'useRenderTracking');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [componentName, extraData]);
}
