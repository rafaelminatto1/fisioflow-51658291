import { useQuery } from '@tanstack/react-query';
import { ExerciseSession } from '../types/pose';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

const fetchApi = async (endpoint: string) => {
  const token = await authApi.getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${config.apiUrl}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

/**
 * Hook para buscar o histórico de exercícios analisados por IA
 */
export function useAIExerciseHistory(patientId: string) {
  return useQuery({
    queryKey: ['ai-exercise-history', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const response = await fetchApi(`/api/clinical/patients/${patientId}/ai-sessions`);
      return response.data as ExerciseSession[];
    },
    enabled: !!patientId,
  });
}
