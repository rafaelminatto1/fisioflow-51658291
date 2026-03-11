import { useState, useEffect } from 'react';
import { patientApi } from '@/lib/api';
import { log } from '@/lib/logger';

/**
 * Interface para exercício prescrito ao paciente
 */
export interface PatientExercise {
  id: string;
  patientId: string;
  exerciseId: string;
  plan?: {
    id: string;
    name?: string;
    description?: string;
  };
  exercise?: {
    id: string;
    name: string;
    description?: string;
    videoUrl?: string;
    imageUrl?: string;
    category?: string;
  };
  sets: number;
  reps: number;
  holdTime?: number;
  restTime?: number;
  notes?: string;
  completed: boolean;
  completedAt?: Date;
  prescribedAt: Date;
  validUntil?: Date;
  frequency?: string; // 'daily', 'weekly', 'as_needed'
}

/**
 * Interface para o resultado do hook
 */
export interface UsePatientExercisesResult {
  data: PatientExercise[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Opções para o hook
 */
export interface UsePatientExercisesOptions {
  includeCompleted?: boolean;
  includeExpired?: boolean;
  limit?: number;
}

function parseDate(date: any): Date | undefined {
  if (!date) return undefined;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (date.seconds !== undefined) {
    return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
  }
  return undefined;
}

/**
 */
export function usePatientExercisesPostgres(
  patientId: string | undefined,
  options: UsePatientExercisesOptions = {}
): UsePatientExercisesResult {
  const {
    includeCompleted = true,
    includeExpired = false,
    limit,
  } = options;

  const [data, setData] = useState<PatientExercise[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let cancelled = false;

    const load = async () => {
      try {
        const response = await patientApi.getExercises();
        let exercises = response.map((item: any) => ({
          id: item.id,
          patientId: item.patientId || item.patient_id || patientId,
          exerciseId: item.exerciseId || item.exercise_id || '',
          exercise: item.exercise,
          sets: item.sets || 0,
          reps: item.reps || 0,
          holdTime: item.holdTime,
          restTime: item.restTime,
          notes: item.notes,
          completed: item.completed || false,
          completedAt: parseDate(item.completedAt || item.completed_at),
          prescribedAt: parseDate(item.prescribedAt || item.createdAt) || new Date(),
          validUntil: parseDate(item.validUntil || item.endDate),
          frequency: item.frequency,
        })) as PatientExercise[];

        if (!includeCompleted) {
          exercises = exercises.filter((exercise) => !exercise.completed);
        }

        if (!includeExpired) {
          const now = Date.now();
          exercises = exercises.filter((exercise) => {
            if (!exercise.validUntil) return true;
            return exercise.validUntil.getTime() >= now;
          });
        }

        exercises.sort((a, b) => b.prescribedAt.getTime() - a.prescribedAt.getTime());
        const limitedExercises = limit ? exercises.slice(0, limit) : exercises;

        if (!cancelled) {
          setData(limitedExercises);
          setIsLoading(false);
        }
      } catch (err) {
        log.error('Error fetching patient exercises:', err);
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [patientId, includeCompleted, includeExpired, limit, reloadKey]);

  /**
   * Função para forçar uma nova busca dos dados
   * Útil para pull-to-refresh ou após ações do usuário
   */
  const refetch = () => {
    setIsLoading(true);
    setReloadKey((current) => current + 1);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook para buscar estatísticas de exercícios do paciente
 */
export function usePatientExerciseStats(patientId: string | undefined) {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const exercises = await patientApi.getExercises();
        const completed = exercises.filter((exercise: any) => exercise.completed).length;
        const total = exercises.length;

        if (!cancelled) {
          setStats({
            total,
            completed,
            pending: total - completed,
            streak: calculateStreak(completed),
          });
        }
      } catch (error) {
        log.error('Error loading exercise stats:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { stats, isLoading };
}

/**
 * Calcula sequência de dias com exercícios completos (simplificado)
 */
function calculateStreak(completedCount: number): number {
  // Implementação simplificada - em produção, calcularia
  // baseado em datas reais de conclusão
  return Math.min(Math.floor(completedCount / 3), 30); // Max 30 dias
}

/**
 * Hook para buscar histórico de conclusão de um exercício específico
 */
export function useExerciseHistory(exerciseId: string | undefined) {
  const [history, setHistory] = useState<Array<{
    date: Date;
    completed: boolean;
    feedback?: {
      difficulty: number;
      pain: number;
    };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) {
      setIsLoading(false);
      return;
    }

    // Buscar histórico de conclusões
    // Em produção, isso viria de uma coleção de histórico
    setIsLoading(false);
  }, [exerciseId]);

  return { history, isLoading };
}

export default usePatientExercisesPostgres;
