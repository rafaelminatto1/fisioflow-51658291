import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from '@/integrations/firebase/app';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/app';

import { fisioLogger as logger } from '@/lib/errors/logger';


/**
 * Hook para inscrições Realtime na tabela prestadores (Firestore)
 */
export function useRealtimePrestadores(eventoId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventoId) return;

    const q = query(
      collection(db, 'prestadores'),
      where('evento_id', '==', eventoId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Snapshot changes invoke this callback
      // We don't necessarily need the data here if we just want to invalidate queries
      // But we can check if there are changes
      if (!snapshot.metadata.hasPendingWrites) {
        queryClient.invalidateQueries({ queryKey: ['prestadores', eventoId] });
        queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
      }
    }, (error) => {
      logger.error("Error in useRealtimePrestadores subscription", error, 'useRealtimePrestadores');
    });

    return () => {
      unsubscribe();
    };
  }, [eventoId, queryClient]);
}
