import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GamificationProfile {
  id: string;
  patient_id: string;
  level: number;
  current_xp: number;
  total_xp: number;
  total_points: number;
  current_streak: number;
  highest_streak: number;
  last_activity_at: string;
}

export function useGamification(patientId: string | undefined) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'patient_gamification', patientId);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile({ id: snapshot.id, ...snapshot.data() } as GamificationProfile);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [patientId]);

  const xpPerLevel = 1000;
  const currentLevel = profile?.level || 1;
  const currentXp = profile?.current_xp || 0;
  const progressPercentage = (currentXp / xpPerLevel) * 100;

  return {
    profile,
    loading,
    currentLevel,
    currentXp,
    xpPerLevel,
    progressPercentage,
  };
}
