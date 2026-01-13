/**
 * Hook para capturar erros de renderização em componentes React
 * Útil para debugging de erros que ocorrem durante a renderização
 */
import { useEffect, useRef } from 'react';

export function useRenderTracking(componentName: string, extraData?: Record<string, any>) {
  const renderCount = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    renderCount.current++;
    console.log(`[RenderTracking] ${componentName} render #${renderCount.current}`, {
      timestamp: new Date().toISOString(),
      ...extraData
    });

    return () => {
      isMounted.current = false;
      console.log(`[RenderTracking] ${componentName} unmounted`);
    };
  });

  useEffect(() => {
    // Capturar erros não tratados
    const handleError = (event: ErrorEvent) => {
      console.error(`[RenderTracking] Unhandled error in ${componentName}:`, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
        ...extraData
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error(`[RenderTracking] Unhandled promise rejection in ${componentName}:`, {
        reason: event.reason,
        ...extraData
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [componentName, extraData]);
}
