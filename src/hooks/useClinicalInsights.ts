import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/v2/client';
import { API_URLS } from '@/lib/api/v2/config';

export interface ClinicalInsights {
  goals: Array<{
    status: string;
    count: string;
    avg_days_to_achieve: number | null;
  }>;
  pathologies: Array<{
    name: string;
    patient_count: string;
  }>;
  painTrend: Array<{
    pathology: string;
    avg_pain_level: number;
    record_count: string;
  }>;
  timestamp: string;
}

export const useClinicalInsights = () => {
  return useQuery({
    queryKey: ['clinical-insights-v2'],
    queryFn: async () => {
      const response = await apiClient.post<{ data: ClinicalInsights }>(
        API_URLS.clinical.getInsights,
        {}
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutos (dados analíticos mudam devagar)
  });
};
