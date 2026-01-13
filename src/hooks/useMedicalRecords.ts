import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  chief_complaint?: string;
  medical_history?: string;
  current_medications?: string;
  allergies?: string;
  previous_surgeries?: string;
  family_history?: string;
  lifestyle_habits?: string;
  record_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useMedicalRecords(patientId?: string) {
  return useQuery({
    queryKey: ['medical-records', patientId],
    queryFn: async () => {
      let query = supabase
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MedicalRecord[];
    },
    enabled: !!patientId || patientId === undefined,
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('medical_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['medical-records', data.patient_id] });
      toast({
        title: 'Prontuário criado!',
        description: 'Prontuário adicionado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar prontuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, patientId }: { id: string; data: Partial<MedicalRecord>; patientId: string }) => {
      const { data: updated, error } = await supabase
        .from('medical_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...updated, patient_id: patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['medical-records', data.patient_id] });
      toast({
        title: 'Prontuário atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar prontuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return patientId;
    },
    onSuccess: (patientId) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      queryClient.invalidateQueries({ queryKey: ['medical-records', patientId] });
      toast({
        title: 'Prontuário removido!',
        description: 'Prontuário excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover prontuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
