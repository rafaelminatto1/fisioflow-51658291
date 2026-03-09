import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalApi } from '@/lib/api/workers-client';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';

export const useCreateTreatmentSessionV2 = () => {
  const queryClient = useQueryClient();
  const { _toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      appointmentId?: string;
      painLevelBefore?: number;
      painLevelAfter?: number;
      observations?: string;
      evolution?: string;
      nextGoals?: string;
    }) => {
      if (!data.appointmentId) {
        throw new Error('appointmentId é obrigatório para registrar a sessão de tratamento');
      }

      const response = await clinicalApi.treatmentSessions.upsert({
        patient_id: data.patientId,
        appointment_id: data.appointmentId,
        subjective: data.evolution,
        plan: data.nextGoals,
        observations: data.observations,
        pain_level_before: data.painLevelBefore,
        pain_level_after: data.painLevelAfter,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions-v2', data.patient_id] });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreateTreatmentSessionV2');
    },
  });
};
