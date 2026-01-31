import { useEffect, useState } from 'react';
import { collection, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '@fisioflow/shared-constants';
import { startOfDay, endOfDay } from 'date-fns';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // in seconds
  sets: number;
  reps: number;
  restTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  professionalId: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  exercises: TreatmentPlanExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlanExercise {
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  duration: number;
  restTime: number;
  notes?: string;
}

export interface ExerciseProgress {
  id: string;
  patientId: string;
  exerciseId: string;
  treatmentPlanId: string;
  date: Date;
  plannedSets: number;
  plannedReps: number;
  completedSets: number;
  completedReps: number;
  rpe?: number;
  pain?: number;
  skipped: boolean;
  skipReason?: string;
  notes?: string;
}

// Hook to get today's exercises for a patient
export function useTodayExercises(patientId?: string) {
  const [exercises, setExercises] = useState<TreatmentPlanExercise[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    // Query for active treatment plan
    const plansRef = collection(db, COLLECTIONS.TREATMENT_PLANS);

    const q = query(
      plansRef,
      where('patientId', '==', patientId),
      where('status', '==', 'active'),
      where('startDate', '<=', dayEnd)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setExercises([]);
          setPlanId(null);
          setLoading(false);
          return;
        }

        const planDoc = snapshot.docs[0];
        setPlanId(planDoc.id);

        const plan = planDoc.data() as TreatmentPlan;
        setExercises(plan.exercises || []);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching exercises:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId]);

  return { exercises, planId, loading, error };
}

// Hook to get exercise progress
export function useExerciseProgress(patientId: string, exerciseId: string, date: Date = new Date()) {
  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const progressRef = collection(db, COLLECTIONS.EXERCISE_PROGRESS);

    const q = query(
      progressRef,
      where('patientId', '==', patientId),
      where('exerciseId', '==', exerciseId),
      where('date', '>=', dayStart),
      where('date', '<=', dayEnd)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setProgress(null);
        } else {
          const doc = snapshot.docs[0];
          setProgress({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate() || new Date(),
          } as ExerciseProgress);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching exercise progress:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId, exerciseId, date]);

  return { progress, loading };
}

// Hook to get exercise library
export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const exercisesRef = collection(db, COLLECTIONS.EXERCISES);

    const q = query(
      exercisesRef,
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const exercisesList: Exercise[] = [];
        snapshot.forEach((doc) => {
          exercisesList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Exercise);
        });
        setExercises(exercisesList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching exercise library:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { exercises, loading };
}
