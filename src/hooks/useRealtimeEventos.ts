import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeEventos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('eventos-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eventos'
        },
        (payload) => {
          console.log('Novo evento criado:', payload);
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
          console.log('Evento atualizado:', payload);
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
          console.log('Evento deletado:', payload);
          queryClient.invalidateQueries({ queryKey: ['eventos'] });
          queryClient.invalidateQueries({ queryKey: ['eventos-stats'] });
          
          toast({
            title: 'Evento removido',
            description: 'Um evento foi excluído',
            variant: 'destructive',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
}
