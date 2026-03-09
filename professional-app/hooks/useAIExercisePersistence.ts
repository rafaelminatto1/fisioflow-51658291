/**
 * useAIExercisePersistence - Hook para salvar resultados de exercícios com IA
 */
import { ExerciseSession } from '../types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

export function useAIExercisePersistence() {
  
  const fetchApi = async (endpoint: string, method: string = 'POST', body?: any) => {
    const token = await authApi.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${config.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  };

  /**
   * Salva uma sessão completa de exercício
   */
  const saveSession = async (session: ExerciseSession) => {
    try {
      logger.info('[AIPersistence] Salvando sessão de exercício...', { id: session.exerciseId }, 'AIPersistence');
      
      const payload = {
        ...session,
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : new Date().toISOString(),
        endTime: session.endTime instanceof Date ? session.endTime.toISOString() : new Date().toISOString(),
      };

      const response = await fetchApi(`/api/clinical/patients/${session.patientId}/ai-sessions`, 'POST', payload);
      return response.data?.id;
    } catch (error) {
      logger.error('Erro ao salvar sessão de IA', error, 'AIPersistence');
      throw error;
    }
  };

  return { saveSession };
}
