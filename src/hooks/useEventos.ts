import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EventoCreate, EventoUpdate } from '@/lib/validations/evento';

export function useEventos(filtros?: { status?: string; categoria?: string; busca?: string }) {
  return useQuery({
    queryKey: ['eventos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('eventos')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (filtros?.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.categoria && filtros.categoria !== 'todos') {
        query = query.eq('categoria', filtros.categoria);
      }

      if (filtros?.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,local.ilike.%${filtros.busca}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ['evento', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
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
      const eventoData: any = {
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
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
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
      const updateData: any = { ...data };
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
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar evento',
        description: error.message,
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
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir evento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
