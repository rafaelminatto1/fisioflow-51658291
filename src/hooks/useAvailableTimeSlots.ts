import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFirebaseDb } from '@/integrations/firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import type { BusinessHour, BlockedTime } from './useScheduleSettings';
import { useAuth } from './useAuth';

import { generateTimeSlots, TimeSlotInfo } from '@/utils/scheduleHelpers';

export type { TimeSlotInfo };

export function useAvailableTimeSlots(date: Date | null) {
  const { user } = useAuth();

  // Get organization ID from profiles in Firestore
  const { data: profile } = useQuery({
    queryKey: ['profile-org', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const db = getFirebaseDb();
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists()) {
        return profileDoc.data();
      }
      return null;
    },
    enabled: !!user?.uid,
  });

  const organizationId = profile?.organization_id;

  // Fetch business hours
  const { data: businessHours } = useQuery({
    queryKey: ['business-hours', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_business_hours')
        .select('*')
        .eq('organization_id', organizationId)
        .order('day_of_week');
      if (error) throw error;
      return data as BusinessHour[];
    },
    enabled: !!organizationId,
  });

  // Fetch blocked times
  const { data: blockedTimes } = useQuery({
    queryKey: ['blocked-times', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_blocked_times')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data as BlockedTime[];
    },
    enabled: !!organizationId,
  });

  const timeSlots = useMemo(() => {
    return generateTimeSlots(date as Date, businessHours, blockedTimes);
  }, [date, businessHours, blockedTimes]);

  // Simple array of available times for backward compatibility
  const availableTimes = useMemo(() => {
    return timeSlots.filter(s => s.isAvailable).map(s => s.time);
  }, [timeSlots]);

  // All time strings (for display purposes)
  const allTimes = useMemo(() => {
    return timeSlots.map(s => s.time);
  }, [timeSlots]);

  // Check if a specific time is blocked
  const isTimeBlocked = (time: string): boolean => {
    const slot = timeSlots.find(s => s.time === time);
    return slot?.isBlocked || false;
  };

  // Get block reason for a time
  const getBlockReason = (time: string): string | undefined => {
    const slot = timeSlots.find(s => s.time === time);
    return slot?.blockReason;
  };

  // Check if day is closed (business hours)
  const isDayClosed = useMemo(() => {
    if (!date) return false;
    const dayOfWeek = date.getDay();
    const dayConfig = businessHours?.find(h => h.day_of_week === dayOfWeek);
    return dayConfig ? !dayConfig.is_open : dayOfWeek === 0; // Sunday closed by default
  }, [date, businessHours]);

  return {
    timeSlots,
    availableTimes,
    allTimes,
    isTimeBlocked,
    getBlockReason,
    isDayClosed,
    businessHours,
    blockedTimes,
  };
}

// Utility function for generating time slots without hooks (for SSR or static)
export function generateTimeSlotsForDate(
  date: Date,
  businessHours?: BusinessHour[],
  _blockedTimes?: BlockedTime[]
): string[] {
  const slots = generateTimeSlots(date, businessHours, _blockedTimes);
  return slots.map(s => s.time);
}
