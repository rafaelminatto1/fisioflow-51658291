import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/v2/client';
import { API_URLS } from '@/lib/api/v2/config';

export interface AISummaryResponse {
  summary: string;
  timestamp: string;
}

export const usePatientAISummary = () => {
  return useMutation({
    mutationKey: ['patient-ai-summary'],
    mutationFn: async (patientId: string) => {
      const response = await apiClient.post<{ data: AISummaryResponse }>(
        API_URLS.clinical.getAiSummary,
        { patientId }
      );
      return response.data;
    },
  });
};
