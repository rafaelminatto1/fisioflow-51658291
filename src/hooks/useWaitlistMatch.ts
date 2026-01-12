import { useMemo } from 'react';
import { useWaitlist, type WaitlistEntry } from './useWaitlist';
import { format, getDay } from 'date-fns';

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const TIME_SLOT_MAP: Record<string, { start: number; end: number }> = {
  morning: { start: 7, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 21 },
};

export interface WaitlistMatch {
  entry: WaitlistEntry;
  matchScore: number; // Higher = better match
}

export const useWaitlistMatch = () => {
  const { data: waitlist = [], isLoading: loading } = useWaitlist();

  /**
   * Finds waitlist entries that match a specific date and time
   */
  const findMatchingEntries = useMemo(() => {
    return (date: Date | string, time: string): WaitlistMatch[] => {
      // Safety check for missing data
      if (!time || !date) {
        console.warn('findMatchingEntries called with missing arguments', { date, time });
        return [];
      }

      const targetDate = typeof date === 'string' ? new Date(date) : date;
      const dayOfWeek = DAY_MAP[getDay(targetDate)];

      // Additional safety check for time format
      if (typeof time !== 'string' || !time.includes(':')) {
        console.warn('findMatchingEntries called with invalid time format', { time });
        return [];
      }

      const [hour] = time.split(':').map(Number);

      // Determine which time slot this falls into
      let timeSlotMatch = '';
      for (const [slot, range] of Object.entries(TIME_SLOT_MAP)) {
        if (hour >= range.start && hour < range.end) {
          timeSlotMatch = slot;
          break;
        }
      }

      const matches: WaitlistMatch[] = [];

      for (const entry of waitlist) {
        // Use 'waiting' status (from useWaitlist) instead of 'active'
        if (entry.status !== 'waiting') continue;

        let matchScore = 0;

        // Check day preference
        const prefersDays = entry.preferred_days || [];
        const dayMatches = prefersDays.length === 0 || prefersDays.includes(dayOfWeek);
        if (!dayMatches) continue;

        // If they have day preferences and this day matches, boost score
        if (prefersDays.length > 0 && prefersDays.includes(dayOfWeek)) {
          matchScore += 20;
        }

        // Check time slot preference - use preferred_periods from useWaitlist
        const prefersTimeSlots = entry.preferred_periods || [];
        const timeMatches = prefersTimeSlots.length === 0 || prefersTimeSlots.includes(timeSlotMatch);
        if (!timeMatches) continue;

        // If they have time preferences and this time matches, boost score
        if (prefersTimeSlots.length > 0 && prefersTimeSlots.includes(timeSlotMatch)) {
          matchScore += 20;
        }

        // Priority bonus
        switch (entry.priority) {
          case 'urgent':
            matchScore += 50;
            break;
          case 'high':
            matchScore += 30;
            break;
          default:
            matchScore += 10;
        }

        // Waiting time bonus (longer wait = higher score) - use created_at from useWaitlist
        const waitingDays = Math.floor(
          (new Date().getTime() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        matchScore += Math.min(waitingDays, 30); // Cap at 30 days bonus

        // Less rejections = higher score - use refusal_count from useWaitlist
        matchScore -= (entry.refusal_count || 0) * 5;

        matches.push({ entry, matchScore });
      }

      // Sort by score descending
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    };
  }, [waitlist]);

  /**
   * Gets the best match for a specific slot
   */
  const getBestMatch = (date: Date | string, time: string): WaitlistMatch | null => {
    const matches = findMatchingEntries(date, time);
    return matches.length > 0 ? matches[0] : null;
  };

  /**
   * Check if there are any interested patients for a slot
   */
  const hasInterest = (date: Date | string, time: string): boolean => {
    return findMatchingEntries(date, time).length > 0;
  };

  /**
   * Get count of interested patients
   */
  const getInterestCount = (date: Date | string, time: string): number => {
    return findMatchingEntries(date, time).length;
  };

  return {
    findMatchingEntries,
    getBestMatch,
    hasInterest,
    getInterestCount,
    loading,
    totalInWaitlist: waitlist.length,
  };
};
