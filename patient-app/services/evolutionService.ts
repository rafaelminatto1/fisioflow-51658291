/**
 * Evolution Service
 * Handles evolution (SOAP note) related operations
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

/**
 * Subscribe to evolutions for a user
 */
export function subscribeToEvolutions(
  userId: string,
  callback: (evolutions: any[]) => void
): () => void {
  const evolutionsRef = collection(db, 'users', userId, 'evolutions');
  const q = query(evolutionsRef, orderBy('date', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const evolutions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(evolutions);
  });

  return unsubscribe;
}

/**
 * Get evolutions for a user within a date range
 */
export async function getEvolutions(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('firestore_get_evolutions');

    const evolutionsRef = collection(db, 'users', userId, 'evolutions');
    let q = query(evolutionsRef, orderBy('date', 'desc'));

    // Note: Firestore doesn't support multiple range queries
    // If filtering by date is needed, it should be done client-side

    const snapshot = await getDocs(q);

    perf.end('firestore_get_evolutions', true);

    let evolutions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by date range if provided
    if (startDate || endDate) {
      evolutions = evolutions.filter((evo: any) => {
        const evoDate = evo.date?.toDate ? evo.date.toDate() : evo.date;
        if (startDate && evoDate < startDate) return false;
        if (endDate && evoDate > endDate) return false;
        return true;
      });
    }

    return evolutions;
  }, 'getEvolutions');
}

/**
 * Get evolution statistics for a user
 */
export async function getEvolutionStats(userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('firestore_get_evolution_stats');

    const evolutionsRef = collection(db, 'users', userId, 'evolutions');
    const snapshot = await getDocs(evolutionsRef);

    const evolutions = snapshot.docs.map(doc => doc.data());

    if (evolutions.length === 0) {
      return {
        totalSessions: 0,
        averagePain: 0,
        painImprovement: 0,
        totalDays: 0,
      };
    }

    const totalSessions = evolutions.length;
    const painLevels = evolutions.map(e => e.pain_level || 0);
    const averagePain = painLevels.reduce((sum, level) => sum + level, 0) / painLevels.length;

    // Calculate date range
    const dates = evolutions
      .map(e => (e.date?.toDate ? e.date.toDate() : new Date()))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const totalDays = Math.max(
      1,
      Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate pain improvement (first vs last)
    const firstPain = evolutions[evolutions.length - 1]?.pain_level || 0;
    const lastPain = evolutions[0]?.pain_level || 0;
    const painImprovement = firstPain - lastPain;

    perf.end('firestore_get_evolution_stats', true);

    return {
      totalSessions,
      averagePain: Math.round(averagePain * 10) / 10,
      painImprovement: Math.round(painImprovement * 10) / 10,
      totalDays,
    };
  }, 'getEvolutionStats');
}
