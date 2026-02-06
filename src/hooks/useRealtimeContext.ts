/**
 * Hook para acessar o RealtimeContext (arquivo separado para evitar aviso HMR Fast Refresh).
 */

import { useContext } from 'react';
import { RealtimeContext } from '@/contexts/RealtimeContext';

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime deve ser usado dentro do RealtimeProvider');
  }
  return context;
}
