import { useState, useEffect } from 'react';
import { gamificationApi } from '@/lib/api';
import { log } from '@/lib/logger';

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

    let cancelled = false;

    const load = async () => {
      try {
        const data = await gamificationApi.getProfile();
        if (!cancelled) {
          setProfile(data as GamificationProfile);
        }
      } catch (error) {
        log.error('Error loading gamification profile:', error);
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
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
