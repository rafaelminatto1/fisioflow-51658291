import { useEffect, useState, useCallback } from 'react';

import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Exercise } from '@/types';

export function useExercises() {
  const [data, setData] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
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
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          exercises.push({
            id: docSnap.id,
            name: data.name || '',
            category: data.category,
            difficulty: data.difficulty,
            video_url: data.video_url,
            image_url: data.image_url,
            thumbnail_url: data.thumbnail_url,
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

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Get single exercise by ID
  const getById = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'exercises', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          category: data.category,
          difficulty: data.difficulty,
          video_url: data.video_url,
          image_url: data.image_url,
          thumbnail_url: data.thumbnail_url,
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
        } as Exercise;
      }
      return null;
    } catch (err) {
      console.error('Error fetching exercise:', err);
      throw err;
    }
  }, []);

  // Create new exercise
  const create = useCallback(async (exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const docRef = await addDoc(collection(db, 'exercises'), {
        name: exercise.name,
        category: exercise.category,
        difficulty: exercise.difficulty,
        video_url: exercise.video_url,
        image_url: exercise.image_url,
        thumbnail_url: exercise.thumbnail_url,
        description: exercise.description,
        instructions: exercise.instructions,
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        duration: exercise.duration,
        targetMuscles: exercise.targetMuscles,
        equipment: exercise.equipment,
        indicated_pathologies: exercise.indicated_pathologies,
        contraindicated_pathologies: exercise.contraindicated_pathologies,
        body_parts: exercise.body_parts,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating exercise:', err);
      throw err;
    }
  }, []);

  // Update exercise
  const update = useCallback(async (id: string, updates: Partial<Exercise>) => {
    try {
      const updateData: any = { updated_at: serverTimestamp() };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      if (updates.video_url !== undefined) updateData.video_url = updates.video_url;
      if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
      if (updates.thumbnail_url !== undefined) updateData.thumbnail_url = updates.thumbnail_url;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
      if (updates.sets !== undefined) updateData.sets = updates.sets;
      if (updates.repetitions !== undefined) updateData.repetitions = updates.repetitions;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.targetMuscles !== undefined) updateData.targetMuscles = updates.targetMuscles;
      if (updates.equipment !== undefined) updateData.equipment = updates.equipment;
      if (updates.indicated_pathologies !== undefined) updateData.indicated_pathologies = updates.indicated_pathologies;
      if (updates.contraindicated_pathologies !== undefined) updateData.contraindicated_pathologies = updates.contraindicated_pathologies;
      if (updates.body_parts !== undefined) updateData.body_parts = updates.body_parts;

      await updateDoc(doc(db, 'exercises', id), updateData);
    } catch (err) {
      console.error('Error updating exercise:', err);
      throw err;
    }
  }, []);

  // Delete exercise
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exercises', id));
    } catch (err) {
      console.error('Error deleting exercise:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchData, getById, create, update, remove };
}
