import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit 
} from 'firebase/firestore';
import { ExerciseSession } from '../types/pose';

/**
 * Hook para buscar o histórico de exercícios analisados por IA
 */
export function useAIExerciseHistory(patientId: string) {
  return useQuery({
    queryKey: ['ai-exercise-history', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const sessionsRef = collection(db, 'exercise_sessions');
      const q = query(
        sessionsRef,
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ExerciseSession[];
    },
    enabled: !!patientId,
  });
}
