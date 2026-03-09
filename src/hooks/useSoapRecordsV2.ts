import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api/workers-client';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';

export interface SoapRecordV2 {
  id: string;
  patientId: string;
  recordDate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
  createdBy: string;
}

const toSoapRecordV2 = (record: Record<string, unknown>): SoapRecordV2 => ({
  id: String(record.id),
  patientId: String(record.patient_id ?? record.patientId ?? ''),
  recordDate: String(record.record_date ?? record.recordDate ?? new Date().toISOString().slice(0, 10)),
  subjective: typeof record.subjective === 'string' ? record.subjective : '',
  objective: typeof record.objective === 'string' ? record.objective : '',
  assessment: typeof record.assessment === 'string' ? record.assessment : '',
  plan: typeof record.plan === 'string' ? record.plan : '',
  createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
  createdBy:
    typeof record.created_by === 'string'
      ? record.created_by
      : typeof record.createdBy === 'string'
        ? record.createdBy
        : 'Desconhecido',
});

export const useSoapRecordsV2 = (patientId: string) => {
  return useQuery({
    queryKey: ['soap-records-v2', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const response = await sessionsApi.list({ patientId, limit: 50 });
      return (response.data ?? []).map((record) => toSoapRecordV2(record as unknown as Record<string, unknown>));
    },
    enabled: !!patientId,
  });
};

export const useCreateSoapRecordV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
      recordDate?: string;
    }) => {
      const response = await sessionsApi.create({
        patient_id: data.patientId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        record_date: data.recordDate,
        status: 'draft',
      });
      return toSoapRecordV2(response.data as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records-v2', data.patientId] });
      toast({
        title: 'Evolução salva',
        description: 'Registro salvo com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreateSoapRecordV2');
    },
  });
};

export const useUpdateSoapRecordV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      recordId: string;
      patientId: string;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }) => {
      const response = await sessionsApi.update(data.recordId, {
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
      });
      return toSoapRecordV2(response.data as unknown as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records-v2', data.patientId] });
      toast({
        title: 'Evolução atualizada',
        description: 'Registro atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useUpdateSoapRecordV2');
    },
  });
};

export const useAutoSaveSoapRecordV2 = () => {
  const createMutation = useCreateSoapRecordV2();
  const updateMutation = useUpdateSoapRecordV2();

  return {
    mutateAsync: async (data: {
      recordId?: string;
      patientId: string;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
      recordDate?: string;
    }) => {
      if (data.recordId) {
        return updateMutation.mutateAsync({
          recordId: data.recordId,
          patientId: data.patientId,
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
        });
      }

      return createMutation.mutateAsync({
        patientId: data.patientId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        recordDate: data.recordDate,
      });
    },
    isPending: createMutation.isPending || updateMutation.isPending,
  };
};
