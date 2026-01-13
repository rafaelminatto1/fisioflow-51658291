import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EventoCreate, EventoUpdate } from '@/lib/validations/evento';
import { mockEventos } from '@/lib/mockData';

export function useEventos(filtros?: { status?: string; categoria?: string; busca?: string }) {
  return useQuery({
    queryKey: ['eventos', filtros],
    queryFn: async () => {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let eventos = [...mockEventos];

      if (filtros?.status && filtros.status !== 'todos') {
        eventos = eventos.filter(e => e.status === filtros.status);
      }

      if (filtros?.categoria && filtros.categoria !== 'todos') {
        eventos = eventos.filter(e => e.categoria === filtros.categoria);
      }

      if (filtros?.busca) {
        const busca = filtros.busca.toLowerCase();
        eventos = eventos.filter(e => 
          e.nome.toLowerCase().includes(busca) || 
          e.local.toLowerCase().includes(busca)
        );
      }

      return eventos;
    },
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const evento = mockEventos.find(e => e.id === id);
      if (!evento) throw new Error('Evento não encontrado');
      
      return evento;
    },
    enabled: !!id,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (evento: EventoCreate) => {
      // Converter datas para string no formato ISO
      const eventoData: {
        nome: string;
        descricao?: string;
        categoria: string;
        local?: string;
        data_inicio: string;
        data_fim: string;
        gratuito: boolean;
        link_whatsapp?: string;
        valor_padrao_prestador?: number;
      } = {
        nome: evento.nome,
        descricao: evento.descricao,
        categoria: evento.categoria,
        local: evento.local,
        data_inicio: evento.data_inicio.toISOString().split('T')[0],
        data_fim: evento.data_fim.toISOString().split('T')[0],
        gratuito: evento.gratuito,
        link_whatsapp: evento.link_whatsapp,
        valor_padrao_prestador: evento.valor_padrao_prestador,
      };

      const { data, error } = await supabase
        .from('eventos')
        .insert([eventoData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento criado!',
        description: 'Evento cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      const _errorMessage = error instanceof Error ? error.message : 'Erro ao criar evento';
      toast({
        title: 'Erro ao criar evento',
        description: _errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventoUpdate }) => {
      // Converter datas se existirem
      const updateData: Record<string, string | Date | boolean | number | undefined> = { ...data };
      if (updateData.data_inicio instanceof Date) {
        updateData.data_inicio = updateData.data_inicio.toISOString().split('T')[0];
      }
      if (updateData.data_fim instanceof Date) {
        updateData.data_fim = updateData.data_fim.toISOString().split('T')[0];
      }

      const { data: updated, error } = await supabase
        .from('eventos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar evento',
        description: error instanceof Error ? error.message : 'Erro ao atualizar evento',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast({
        title: 'Evento excluído!',
        description: 'Evento removido com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir evento',
        description: error instanceof Error ? error.message : 'Erro ao excluir evento',
        variant: 'destructive',
      });
    },
  });
}
