import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimePrestadores(eventoId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventoId) return;

    const channel = supabase
      .channel(`prestadores-${eventoId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId, queryClient]);
}
