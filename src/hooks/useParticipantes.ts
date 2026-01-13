import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParticipanteCreate, ParticipanteUpdate } from '@/lib/validations/participante';

export function useParticipantes(eventoId: string) {
  return useQuery({
    queryKey: ['participantes', eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });
}

export function useCreateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (participante: ParticipanteCreate) => {
      const { data, error } = await supabase
        .from('participantes')
        .insert([participante])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['participantes', data.evento_id] });
      toast({
        title: 'Participante adicionado!',
        description: 'Participante cadastrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar participante',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateParticipante() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: ParticipanteUpdate; eventoId: string }) => {
      const { data: updated, error } = await supabase
        .from('participantes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...updated, evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['participantes', data.evento_id] });
      toast({
        title: 'Participante atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar participante',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
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
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['participantes', eventoId] });
      toast({
        title: 'Participante removido!',
        description: 'Participante excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover participante',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useExportParticipantes() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventoId: string) => {
      const { data, error } = await supabase
        .from('participantes')
        .select('*')
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
