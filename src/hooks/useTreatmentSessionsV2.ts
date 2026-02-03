import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalApi } from '@/integrations/firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';

export const useCreateTreatmentSessionV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      const response = await clinicalApi.createTreatmentSession(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions-v2', data.patient_id] });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreateTreatmentSessionV2');
    }
  });
};
