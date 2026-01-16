import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParticipanteCreate, ParticipanteUpdate } from '@/lib/validations/participante';

export function useParticipantes(eventoId: string) {
  return useQuery({
    queryKey: ['participantes', eventoId],
    queryFn: async () => {
      // Optimized: Select only required columns instead of *
      const { data, error } = await supabase
        .from('participantes')
        .select('id, evento_id, nome, email, telefone, status, confirmado, created_at, updated_at')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useCreateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participante: ParticipanteCreate) => {
      // Optimized: Select only required columns
      const { data, error } = await supabase
        .from('participantes')
        .insert([participante])
        .select('id, evento_id, nome, email, telefone, status, confirmado, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update - adiciona participante antes da resposta do servidor
    onMutate: async (newParticipante) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', newParticipante.evento_id] });

      const previousParticipantes = queryClient.getQueryData(['participantes', newParticipante.evento_id]);

      const optimisticParticipante = {
        ...newParticipante,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['participantes', newParticipante.evento_id], (old: any[]) => [
        optimisticParticipante,
        ...(old || []),
      ]);

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.evento_id], context?.previousParticipantes);
      toast({
        title: 'Erro ao adicionar participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Participante adicionado!',
        description: 'Participante cadastrado com sucesso.',
      });
    },
  });
}

export function useUpdateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: ParticipanteUpdate; eventoId: string }) => {
      // Otimizado: Select apenas colunas necessárias
      const { data: updated, error } = await supabase
        .from('participantes')
        .update(data)
        .eq('id', id)
        .select('id, evento_id, nome, email, telefone, status, confirmado, created_at, updated_at')
        .single();

      if (error) throw error;
      return { ...updated, evento_id: eventoId };
    },
    // Optimistic update - atualiza participante antes da resposta do servidor
    onMutate: async ({ id, data, eventoId }) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', eventoId] });

      const previousParticipantes = queryClient.getQueryData(['participantes', eventoId]);

      queryClient.setQueryData(['participantes', eventoId], (old: any[]) =>
        (old || []).map((p) =>
          p.id === id
            ? { ...p, ...data, updated_at: new Date().toISOString() }
            : p
        )
      );

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.eventoId], context?.previousParticipantes);
      toast({
        title: 'Erro ao atualizar participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Participante atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
  });
}

export function useDeleteParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('participantes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return eventoId;
    },
    // Optimistic update - remove participante da lista visualmente
    onMutate: async ({ id, eventoId }) => {
      await queryClient.cancelQueries({ queryKey: ['participantes', eventoId] });

      const previousParticipantes = queryClient.getQueryData(['participantes', eventoId]);

      queryClient.setQueryData(['participantes', eventoId], (old: any[]) =>
        (old || []).filter((p) => p.id !== id)
      );

      return { previousParticipantes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['participantes', variables.eventoId], context?.previousParticipantes);
      toast({
        title: 'Erro ao remover participante',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Participante removido!',
        description: 'Participante excluído com sucesso.',
      });
    },
  });
}

export function useExportParticipantes() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventoId: string) => {
      // Otimizado: Select apenas colunas necessárias para exportação
      const { data, error } = await supabase
        .from('participantes')
        .select('nome, contato, instagram, segue_perfil, observacoes')
        .eq('evento_id', eventoId);

      if (error) throw error;

      // Criar CSV
      const headers = ['Nome', 'Contato', 'Instagram', 'Segue Perfil', 'Observações'];
      const csvContent = [
        headers.join(','),
        ...data.map(p => [
          (p as Record<string, unknown>).nome,
          (p as Record<string, unknown>).contato || '',
          (p as Record<string, unknown>).instagram || '',
          (p as Record<string, unknown>).segue_perfil ? 'Sim' : 'Não',
          (p as Record<string, unknown>).observacoes || ''
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_${eventoId}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Exportação concluída!',
        description: 'CSV de participantes baixado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
