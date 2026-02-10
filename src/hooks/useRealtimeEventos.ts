/**
 * useRealtimeEventos - Migrated to Firebase
 */

import { useEffect } from 'react';
import { collection, query as firestoreQuery, orderBy, limit, onSnapshot, db } from '@/integrations/firebase/app';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export function useRealtimeEventos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Firestore onSnapshot for real-time updates
    const q = firestoreQuery(
      collection(db, 'eventos'),
      orderBy('created_at', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newEvento = { id: change.doc.id, ...normalizeFirestoreData(change.doc.data()) };
            logger.info('Novo evento criado', { eventId: newEvento.id }, 'useRealtimeEventos');
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });

            toast({
              title: '🎉 Novo evento criado',
              description: `${newEvento.nome} foi adicionado`,
            });
          } else if (change.type === 'modified') {
            const updatedEvento = { id: change.doc.id, ...normalizeFirestoreData(change.doc.data()) };
            logger.info('Evento atualizado', { eventId: updatedEvento.id }, 'useRealtimeEventos');
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
            queryClient.invalidateQueries({ queryKey: ['eventos', updatedEvento.id] });
          } else if (change.type === 'removed') {
            const deletedEvento = { id: change.doc.id, ...normalizeFirestoreData(change.doc.data()) };
            logger.info('Evento deletado', { eventId: deletedEvento.id }, 'useRealtimeEventos');
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });

            toast({
              title: 'Evento removido',
              description: 'Um evento foi excluído',
              variant: 'destructive',
            });
          }
        });
      },
      (error) => {
        logger.error('Real-time eventos error', error, 'useRealtimeEventos');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient, toast]);
}