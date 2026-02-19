import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Componente de diagnóstico para problemas de loading infinito
 * Adicione ao App.tsx temporariamente para debug:
 * 
 * import { LoadingDiagnostics } from '@/components/debug/LoadingDiagnostics';
 * // No render: <LoadingDiagnostics />
 */
export function LoadingDiagnostics() {
  const { user, profile, loading, initialized } = useAuth();
  const [mountTime] = useState(Date.now());
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - mountTime;
      const initialLoader = document.getElementById('initial-loader');
      
      const diag = {
        elapsed: `${(elapsed / 1000).toFixed(1)}s`,
        loading,
        initialized,
        hasUser: !!user,
        hasProfile: !!profile,
        initialLoaderVisible: !!initialLoader,
        timestamp: new Date().toISOString(),
      };

      setDiagnostics(diag);

      // Log a cada 5 segundos
      if (elapsed % 5000 < 1000) {
        logger.info('Loading Diagnostics', diag, 'LoadingDiagnostics');
      }

      // Alerta se loading está travado por mais de 10 segundos
      if (loading && elapsed > 10000) {
        logger.error('LOADING TRAVADO POR MAIS DE 10 SEGUNDOS!', diag, 'LoadingDiagnostics');
        console.error('🚨 LOADING INFINITO DETECTADO!', diag);
        console.log('💡 Tente: localStorage.clear(); sessionStorage.clear(); location.reload();');
      }

      // Alerta se initial loader ainda está visível após 5 segundos
      if (initialLoader && elapsed > 5000) {
        logger.warn('Initial loader ainda visível após 5s', diag, 'LoadingDiagnostics');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mountTime, loading, initialized, user, profile]);

  // Não renderizar nada em produção
  if (import.meta.env.PROD) {
    return null;
  }

  // Renderizar diagnóstico apenas em desenvolvimento
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🔍 Loading Diagnostics
      </div>
      {Object.entries(diagnostics).map(([key, value]) => (
        <div key={key}>
          <span style={{ color: '#888' }}>{key}:</span>{' '}
          <span style={{ color: value === true ? '#0f0' : value === false ? '#f00' : '#fff' }}>
            {String(value)}
          </span>
        </div>
      ))}
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
        Press F12 to see console logs
      </div>
    </div>
  );
}
