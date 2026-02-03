import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalApi } from '@/integrations/firebase/functions';
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

// Helper to parse content JSON
const parseSoapContent = (record: any): SoapRecordV2 => {
  let content = { subjective: '', objective: '', assessment: '', plan: '' };
  try {
    content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;
  } catch (e) {
    // Fallback if content is plain text
    content.subjective = record.content;
  }

  return {
    id: record.id,
    patientId: record.patient_id,
    recordDate: record.record_date,
    subjective: content.subjective || '',
    objective: content.objective || '',
    assessment: content.assessment || '',
    plan: content.plan || '',
    createdAt: record.created_at,
    createdBy: record.created_by_name || 'Desconhecido'
  };
};

export const useSoapRecordsV2 = (patientId: string) => {
  return useQuery({
    queryKey: ['soap-records-v2', patientId],
    queryFn: async () => {
      const response = await clinicalApi.getPatientRecords(patientId, 'soap', 50);
      return (response.data || []).map(parseSoapContent);
    },
    enabled: !!patientId,
  });
};

export const useCreateSoapRecordV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { patientId: string; subjective: string; objective: string; assessment: string; plan: string; recordDate?: string }) => {
      const content = JSON.stringify({
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan
      });

      const response = await clinicalApi.createMedicalRecord({
        patientId: data.patientId,
        type: 'soap',
        title: 'Evolução SOAP',
        content,
        recordDate: data.recordDate
      });
      return parseSoapContent(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records-v2', data.patientId] });
      toast({
        title: 'Evolução salva',
        description: 'Registro salvo com sucesso.'
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreateSoapRecordV2');
    }
  });
};

export const useUpdateSoapRecordV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { recordId: string; patientId: string; subjective: string; objective: string; assessment: string; plan: string }) => {
      const content = JSON.stringify({
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan
      });

      const response = await clinicalApi.updateMedicalRecord(data.recordId, {
        content
      });
      return parseSoapContent(response.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records-v2', data.patientId] });
      toast({
        title: 'Evolução atualizada',
        description: 'Registro atualizado com sucesso.'
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useUpdateSoapRecordV2');
    }
  });
};

// Autosave hook compatible with V2
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
        return await updateMutation.mutateAsync({
          recordId: data.recordId,
          patientId: data.patientId,
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan
        });
      } else {
        return await createMutation.mutateAsync({
          patientId: data.patientId,
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          recordDate: data.recordDate
        });
      }
    },
    isPending: createMutation.isPending || updateMutation.isPending
  };
};