import { useEffect, useState, useCallback } from 'react';

import {
  collection,
  query,
  where,
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
import type { ExercisePlan } from '@/types';

export function useTreatmentPlans(patientId?: string) {
  const [data, setData] = useState<ExercisePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Build query based on patientId filter
    let q;
    if (patientId) {
      q = query(
        collection(db, 'exercise_plans'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'exercise_plans'),
        orderBy('created_at', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const plans: ExercisePlan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          plans.push({
            id: docSnap.id,
            name: data.name || '',
            description: data.description || '',
            patientId: data.patient_id || data.patientId || '',
            exercises: data.exercises || data.exercise_items || [],
            status: data.status || 'Ativo',
            createdAt: data.created_at?.toDate?.() || new Date(),
            updatedAt: data.updated_at?.toDate?.() || new Date(),
          } as ExercisePlan);
        });
        setData(plans);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching treatment plans:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [patientId]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData]);

  // Get single plan by ID
  const getById = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'exercise_plans', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          patientId: data.patient_id || data.patientId || '',
          exercises: data.exercises || data.exercise_items || [],
          status: data.status || 'Ativo',
          createdAt: data.created_at?.toDate?.() || new Date(),
          updatedAt: data.updated_at?.toDate?.() || new Date(),
        } as ExercisePlan;
      }
      return null;
    } catch (err) {
      console.error('Error fetching treatment plan:', err);
      throw err;
    }
  }, []);

  // Create new treatment plan
  const create = useCallback(async (plan: Omit<ExercisePlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'exercise_plans'), {
        name: plan.name,
        description: plan.description,
        patient_id: plan.patientId,
        exercises: plan.exercises,
        status: plan.status || 'Ativo',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating treatment plan:', err);
      throw err;
    }
  }, []);

  // Update treatment plan
  const update = useCallback(async (id: string, updates: Partial<ExercisePlan>) => {
    try {
      const updateData: any = { updated_at: serverTimestamp() };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.patientId !== undefined) updateData.patient_id = updates.patientId;
      if (updates.exercises !== undefined) updateData.exercises = updates.exercises;
      if (updates.status !== undefined) updateData.status = updates.status;

      await updateDoc(doc(db, 'exercise_plans', id), updateData);
    } catch (err) {
      console.error('Error updating treatment plan:', err);
      throw err;
    }
  }, []);

  // Update plan status
  const updateStatus = useCallback(async (id: string, status: 'Ativo' | 'Inativo' | 'Concluído') => {
    return update(id, { status });
  }, [update]);

  // Add exercise to plan
  const addExercise = useCallback(async (
    id: string,
    exercise: { exerciseId: string; sets: number; reps: number; restTime: number; notes?: string }
  ) => {
    try {
      const plan = await getById(id);
      if (!plan) throw new Error('Plan not found');

      const exercises = [...(plan.exercises || []), exercise];
      return update(id, { exercises });
    } catch (err) {
      console.error('Error adding exercise to plan:', err);
      throw err;
    }
  }, [getById, update]);

  // Remove exercise from plan
  const removeExercise = useCallback(async (id: string, exerciseIndex: number) => {
    try {
      const plan = await getById(id);
      if (!plan) throw new Error('Plan not found');

      const exercises = plan.exercises.filter((_, index) => index !== exerciseIndex);
      return update(id, { exercises });
    } catch (err) {
      console.error('Error removing exercise from plan:', err);
      throw err;
    }
  }, [getById, update]);

  // Delete treatment plan
  const remove = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exercise_plans', id));
    } catch (err) {
      console.error('Error deleting treatment plan:', err);
      throw err;
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    getById,
    create,
    update,
    updateStatus,
    addExercise,
    removeExercise,
    remove,
  };
}
