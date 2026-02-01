import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Exercise } from '@/types';

export function useExercises() {
  const [data, setData] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Query all exercises
    const q = query(
      collection(db, 'exercises'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const exercises: Exercise[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          exercises.push({
            id: doc.id,
            name: data.name || '',
            category: data.category,
            difficulty: data.difficulty,
            video_url: data.video_url,
            image_url: data.image_url,
            description: data.description,
            instructions: data.instructions,
            sets: data.sets,
            repetitions: data.repetitions,
            duration: data.duration,
            targetMuscles: data.targetMuscles,
            equipment: data.equipment,
            indicated_pathologies: data.indicated_pathologies,
            contraindicated_pathologies: data.contraindicated_pathologies,
            body_parts: data.body_parts,
            created_at: data.created_at?.toDate?.() || new Date(),
            updated_at: data.updated_at?.toDate?.() || new Date(),
          } as Exercise);
        });
        setData(exercises);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching exercises:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}
