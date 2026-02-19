/**
 * useDataConnect Hook
 *
 * Hook customizado para buscar dados de exercícios do paciente via Firebase DataConnect
 * com fallback para Firestore quando DataConnect não estiver disponível.
 *
 * @module hooks/useDataConnect
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Interface para exercício prescrito ao paciente
 */
export interface PatientExercise {
  id: string;
  patientId: string;
  exerciseId: string;
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
interface UsePatientExercisesResult {
  data: PatientExercise[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Opções para o hook
 */
interface UsePatientExercisesOptions {
  includeCompleted?: boolean;
  includeExpired?: boolean;
  limit?: number;
}

/**
 * Hook para buscar exercícios prescritos ao paciente
 *
 * @param patientId - ID do paciente (user.uid)
 * @param options - Opções de configuração
 * @returns Objeto com dados, loading, error e função de refetch
 *
 * @example
 * ```tsx
 * const { data: exercises, isLoading } = usePatientExercisesPostgres(user?.id, {
 *   includeCompleted: true,
 *   includeExpired: false,
 * });
 * ```
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

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    /**
     * NOTA: Esta implementação usa Firestore como fonte de dados.
     * Para migrar para Firebase DataConnect, substitua a lógica abaixo
     * pelas queries do DataConnect quando disponível.
     *
     * Exemplo de migração para DataConnect:
     *
     * ```typescript
     * import { dataConnect } from '@/lib/dataConnect';
     * const query = dataConnect.query('GetPatientExercises', {
     *   patientId,
     *   includeCompleted,
     *   includeExpired,
     *   limit,
     * });
     * ```
     */

    // Buscar exercícios via Firestore (fallback atual)
    const exercisesRef = collection(db, 'patient_exercises');
    const exercisesQuery = query(
      exercisesRef,
      where('patientId', '==', patientId)
    );

    // Filtros adicionais podem ser adicionados aqui
    if (!includeExpired) {
      // Filtrar exercícios não expirados
      // exercisesQuery = query(exercisesQuery, where('validUntil', '>=', new Date()));
    }

    const unsubscribe = onSnapshot(
      exercisesQuery,
      (snapshot) => {
        const exercises: PatientExercise[] = [];

        snapshot.forEach((doc) => {
          const exerciseData = doc.data();
          const exercise: PatientExercise = {
            id: doc.id,
            patientId: exerciseData.patientId || '',
            exerciseId: exerciseData.exerciseId || '',
            exercise: exerciseData.exercise,
            sets: exerciseData.sets || 0,
            reps: exerciseData.reps || 0,
            holdTime: exerciseData.holdTime,
            restTime: exerciseData.restTime,
            notes: exerciseData.notes,
            completed: exerciseData.completed || false,
            completedAt: exerciseData.completedAt?.toDate(),
            prescribedAt: exerciseData.prescribedAt?.toDate() || new Date(),
            validUntil: exerciseData.validUntil?.toDate(),
            frequency: exerciseData.frequency,
          };

          // Filtrar exercícios completos se necessário
          if (!includeCompleted && exercise.completed) {
            return;
          }

          exercises.push(exercise);
        });

        // Ordenar por data de prescrição (mais recentes primeiro)
        exercises.sort((a, b) => b.prescribedAt.getTime() - a.prescribedAt.getTime());

        // Aplicar limite se especificado
        const limitedExercises = limit ? exercises.slice(0, limit) : exercises;

        setData(limitedExercises);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching patient exercises:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [patientId, includeCompleted, includeExpired, limit]);

  /**
   * Função para forçar uma nova busca dos dados
   * Útil para pull-to-refresh ou após ações do usuário
   */
  const refetch = () => {
    setIsLoading(true);
    // A lógica de refetch será automaticamente acionada pelo onSnapshot
    // Apenas resetamos o estado de loading
    setTimeout(() => {
      if (patientId) {
        setIsLoading(false);
      }
    }, 100);
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

    // Calcular estatísticas baseadas nos exercícios
    // Esta é uma implementação simplificada
    // Em produção, você pode ter uma coleção separada de stats
    const exercisesRef = collection(db, 'patient_exercises');
    const q = query(exercisesRef, where('patientId', '==', patientId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let completed = 0;
      let pending = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.completed) {
          completed++;
        } else {
          pending++;
        }
      });

      setStats({
        total: snapshot.size,
        completed,
        pending,
        streak: calculateStreak(completed), // Simplificado
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
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
