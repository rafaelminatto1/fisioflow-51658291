import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

/**
 * Hook para inscrições Realtime na tabela eventos
 * FIX: Track subscription state to avoid WebSocket errors
 */
export function useRealtimeEventos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // FIX: Track subscription state to avoid WebSocket errors
    let isSubscribed = false;
    const channel = supabase.channel('eventos-changes');

    (channel as any)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eventos'
        },
        (payload) => {
          logger.info('Novo evento criado', { eventId: payload.new.id, nome: payload.new.nome }, 'useRealtimeEventos');
          queryClient.invalidateQueries({ queryKey: ['eventos'] });
          queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });

          toast({
            title: '🎉 Novo evento criado',
            description: `${payload.new.nome} foi adicionado`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eventos'
        },
        (payload) => {
          logger.info('Evento atualizado', { eventId: payload.new.id }, 'useRealtimeEventos');
          queryClient.invalidateQueries({ queryKey: ['eventos'] });
          queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
          queryClient.invalidateQueries({ queryKey: ['eventos', payload.new.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
        schema: 'public',
          table: 'eventos'
        },
        (payload) => {
          logger.info('Evento deletado', { eventId: payload.old.id }, 'useRealtimeEventos');
          queryClient.invalidateQueries({ queryKey: ['eventos'] });
          queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });

          toast({
            title: 'Evento removido',
            description: 'Um evento foi excluído',
            variant: 'destructive',
          });
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
        }
      });

    return () => {
      if (isSubscribed) {
        supabase.removeChannel(channel).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [queryClient, toast]);
}
