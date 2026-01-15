import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para inscrições Realtime na tabela prestadores
 * FIX: Track subscription state to avoid WebSocket errors
 */
export function useRealtimePrestadores(eventoId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventoId) return;

    // FIX: Track subscription state to avoid WebSocket errors
    let isSubscribed = false;
    const channel = supabase.channel(`prestadores-${eventoId}`);

    (channel as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prestadores',
          filter: `evento_id=eq.${eventoId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['prestadores', eventoId] });
          queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
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
  }, [eventoId, queryClient]);
}
