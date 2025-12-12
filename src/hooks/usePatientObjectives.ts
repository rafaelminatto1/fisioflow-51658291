import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PatientObjective {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  organization_id: string | null;
  created_at: string;
}

export interface PatientObjectiveAssignment {
  id: string;
  patient_id: string;
  objective_id: string;
  prioridade: number;
  notas: string | null;
  created_at: string;
  objective?: PatientObjective;
}

export type PatientObjectiveFormData = Omit<PatientObjective, 'id' | 'created_at' | 'organization_id'>;

export function usePatientObjectives() {
  return useQuery({
    queryKey: ['patient-objectives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_objectives')
        .select('*')
        .eq('ativo', true)
        .order('categoria', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as PatientObjective[];
    },
  });
}

export function usePatientAssignedObjectives(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-assigned-objectives', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('patient_objective_assignments')
        .select(`
          *,
          objective:patient_objectives(*)
        `)
        .eq('patient_id', patientId)
        .order('prioridade');

      if (error) throw error;
      return data as PatientObjectiveAssignment[];
    },
    enabled: !!patientId,
  });
}

export function useCreatePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objective: PatientObjectiveFormData) => {
      const { data, error } = await supabase
        .from('patient_objectives')
        .insert(objective)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo criado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar objetivo.');
    },
  });
}

export function useUpdatePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...objective }: Partial<PatientObjective> & { id: string }) => {
      const { data, error } = await supabase
        .from('patient_objectives')
        .update(objective)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar objetivo.');
    },
  });
}

export function useDeletePatientObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_objectives')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-objectives'] });
      toast.success('Objetivo excluído com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir objetivo.');
    },
  });
}

// Assignment mutations
export function useAssignObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, objectiveId, prioridade = 2, notas }: { 
      patientId: string; 
      objectiveId: string; 
      prioridade?: number;
      notas?: string;
    }) => {
      const { data, error } = await supabase
        .from('patient_objective_assignments')
        .insert({
          patient_id: patientId,
          objective_id: objectiveId,
          prioridade,
          notas,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-assigned-objectives', variables.patientId] });
      toast.success('Objetivo atribuído ao paciente.');
    },
    onError: () => {
      toast.error('Erro ao atribuir objetivo.');
    },
  });
}

export function useRemoveObjectiveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('patient_objective_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-assigned-objectives', variables.patientId] });
      toast.success('Objetivo removido do paciente.');
    },
    onError: () => {
      toast.error('Erro ao remover objetivo.');
    },
  });
}
