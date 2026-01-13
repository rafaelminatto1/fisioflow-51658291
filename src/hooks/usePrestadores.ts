import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PrestadorCreate, PrestadorUpdate } from '@/lib/validations/prestador';

export function usePrestadores(eventoId: string) {
  return useQuery({
    queryKey: ['prestadores', eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prestadores')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });
}

export function useCreatePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prestador: PrestadorCreate) => {
      const { data, error } = await supabase
        .from('prestadores')
        .insert([prestador as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.evento_id] });
      toast({
        title: 'Prestador adicionado!',
        description: 'Prestador cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar prestador',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: PrestadorUpdate; eventoId: string }) => {
      const { data: updated, error } = await supabase
        .from('prestadores')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...updated, evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.evento_id] });
      toast({
        title: 'Prestador atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar prestador',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePrestador() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('prestadores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', eventoId] });
      toast({
        title: 'Prestador removido!',
        description: 'Prestador excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover prestador',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarcarPagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { data: prestador, error: fetchError } = await supabase
        .from('prestadores')
        .select('status_pagamento')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const novoStatus = prestador.status_pagamento === 'PAGO' ? 'PENDENTE' : 'PAGO';

      const { data, error } = await supabase
        .from('prestadores')
        .update({ status_pagamento: novoStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prestadores', data.eventoId] });
      toast({
        title: 'Status atualizado!',
        description: `Pagamento marcado como ${data.status_pagamento.toLowerCase()}.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
