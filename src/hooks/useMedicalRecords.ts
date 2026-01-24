import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalApi } from '@/integrations/firebase/functions';
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
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export function useMedicalRecords(patientId?: string) {
  return useQuery({
    queryKey: ['medical-records', patientId],
    queryFn: async () => {
      const response = await clinicalApi.getPatientRecords(patientId || '', 'evolution', 100);
      return response.data as MedicalRecord[];
    },
    enabled: !!patientId,
  });
}

export function useCreateMedicalRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (record: any) => {
      const response = await clinicalApi.createMedicalRecord({
        patientId: record.patient_id,
        type: 'evolution',
        title: 'Evolução Clínica',
        content: JSON.stringify(record),
        recordDate: record.record_date
      });
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      if (data?.patient_id) {
        queryClient.invalidateQueries({ queryKey: ['medical-records', data.patient_id] });
      }
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
      const response = await clinicalApi.updateMedicalRecord(id, data);
      return { ...response.data, patient_id: patientId };
    },
    onSuccess: (data: any) => {
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
      await clinicalApi.deleteMedicalRecord(id);
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
