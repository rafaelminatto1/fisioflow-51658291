import { useState, useEffect } from 'react';
import { ExerciseFunctions } from '../lib/exercises';

export function useExercises(patientId?: string) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExercises() {
      try {
        const result = await ExerciseFunctions.listExercises();
        setExercises(result.data || []);
      } catch (error) {
        console.error('Failed to load exercises:', error);
      } finally {
        setLoading(false);
      }
    }

    loadExercises();
  }, [patientId]);

  return { exercises, loading };
}
