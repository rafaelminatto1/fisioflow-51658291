import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import { COLLECTIONS } from '@fisioflow/shared-constants';
import { startOfDay, endOfDay, subDays, differenceInDays, format } from 'date-fns';

export interface PatientProgress {
  patientId: string;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  totalExercises: number;
  completedExercises: number;
  adherenceRate: number;
  averagePain: number;
  initialPain: number;
  lastSessionDate?: Date;
}

export interface DailyStats {
  date: Date;
  exercisesCompleted: number;
  exercisesTotal: number;
  adherenceRate: number;
  averagePain: number;
  averageRPE: number;
}

// Hook to get overall progress for a patient
export function usePatientProgress(patientId?: string) {
  const [progress, setProgress] = useState<PatientProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const progressRef = doc(db, COLLECTIONS.PATIENT_PROGRESS, patientId);

    const unsubscribe = onSnapshot(
      progressRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setProgress({
            patientId,
            currentStreak: data.currentStreak || 0,
            bestStreak: data.bestStreak || 0,
            totalSessions: data.totalSessions || 0,
            totalExercises: data.totalExercises || 0,
            completedExercises: data.completedExercises || 0,
            adherenceRate: data.adherenceRate || 0,
            averagePain: data.averagePain || 0,
            initialPain: data.initialPain || 0,
            lastSessionDate: data.lastSessionDate?.toDate(),
          } as PatientProgress);
        } else {
          // Initialize progress if doesn't exist
          setProgress({
            patientId,
            currentStreak: 0,
            bestStreak: 0,
            totalSessions: 0,
            totalExercises: 0,
            completedExercises: 0,
            adherenceRate: 0,
            averagePain: 0,
            initialPain: 0,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching patient progress:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId]);

  return { progress, loading };
}

// Hook to get weekly/daily stats
export function useDailyStats(patientId?: string, days: number = 7) {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const today = new Date();
    const startDate = subDays(today, days - 1);

    const statsRef = collection(db, COLLECTIONS.DAILY_STATS);

    const q = query(
      statsRef,
      where('patientId', '==', patientId),
      where('date', '>=', startDate),
      where('date', '<=', endOfDay(today)),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const statsList: DailyStats[] = [];
        snapshot.forEach((doc) => {
          statsList.push({
            date: doc.data().date?.toDate() || new Date(),
            exercisesCompleted: doc.data().exercisesCompleted || 0,
            exercisesTotal: doc.data().exercisesTotal || 0,
            adherenceRate: doc.data().adherenceRate || 0,
            averagePain: doc.data().averagePain || 0,
            averageRPE: doc.data().averageRPE || 0,
          } as DailyStats);
        });
        setStats(statsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching daily stats:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId, days]);

  return { stats, loading };
}

// Hook to get achievements for a patient
export function useAchievements(patientId?: string) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const achievementsRef = collection(db, COLLECTIONS.ACHIEVEMENTS);

    const q = query(
      achievementsRef,
      where('patientId', '==', patientId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const achievementsList: any[] = [];
        snapshot.forEach((doc) => {
          achievementsList.push({
            id: doc.id,
            ...doc.data(),
            unlockedAt: doc.data().unlockedAt?.toDate(),
          });
        });
        setAchievements(achievementsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching achievements:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [patientId]);

  return { achievements, loading };
}

// Helper function to check if streak should be incremented
export async function checkAndUpdateStreak(patientId: string): Promise<boolean> {
  const progressRef = doc(db, COLLECTIONS.PATIENT_PROGRESS, patientId);
  const progressDoc = await getDoc(progressRef);

  if (!progressDoc.exists()) {
    return false;
  }

  const progress = progressDoc.data();
  const lastSessionDate = progress.lastSessionDate?.toDate();
  const today = new Date();

  // If last session was today or yesterday, check/update streak
  if (lastSessionDate) {
    const daysDiff = differenceInDays(today, lastSessionDate);

    if (daysDiff <= 1) {
      // Streak is active, no change needed
      return true;
    } else if (daysDiff > 1) {
      // Streak broken, reset to 0
      await updateDoc(progressRef, {
        currentStreak: 0,
      });
      return false;
    }
  }

  return false;
}

// Helper function to update progress after completing exercises
export async function updateExerciseProgress(
  patientId: string,
  exerciseId: string,
  data: {
    completedSets: number;
    completedReps: number;
    rpe?: number;
    pain?: number;
    skipped?: boolean;
    skipReason?: string;
  }
): Promise<void> {
  // This would be called after completing an exercise
  // Update daily stats and overall progress
  const today = new Date();
  const dailyStatsRef = doc(db, COLLECTIONS.DAILY_STATS, `${patientId}_${format(today, 'yyyy-MM-dd')}`);

  await setDoc(dailyStatsRef, {
    patientId,
    date: today,
    ...data,
  }, { merge: true });

  // Recalculate adherence rate and update progress
  // (implementation depends on business logic)
}
