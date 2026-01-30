/**
 * useRealtimeEventos - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.channel('eventos-changes') → Firestore onSnapshot for real-time updates
 * - supabase.postgres_changes → Firestore onSnapshot
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';


/**
 * Hook para inscrições Realtime na tabela eventos
 * Migrated from Supabase Realtime to Firestore onSnapshot
 */
export function useRealtimeEventos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Firestore onSnapshot for real-time updates
    const q = query(
      collection(db, 'eventos'),
      orderBy('created_at', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newEvento = { id: change.doc.id, ...change.doc.data() };
            logger.info('Novo evento criado', { eventId: newEvento.id }, 'useRealtimeEventos');
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });

            toast({
              title: '🎉 Novo evento criado',
              description: `${newEvento.nome} foi adicionado`,
            });
          } else if (change.type === 'modified') {
            const updatedEvento = { id: change.doc.id, ...change.doc.data() };
            logger.info('Evento atualizado', { eventId: updatedEvento.id }, 'useRealtimeEventos');
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
            queryClient.invalidateQueries({ queryKey: ['eventos', updatedEvento.id] });
          } else if (change.type === 'removed') {
            const deletedEvento = { id: change.doc.id, ...change.doc.data() };
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
