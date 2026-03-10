/**
 * useAvailableTimeSlots - Migrated to Neon/Cloudflare
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BusinessHour, BlockedTime } from './useScheduleSettings';
import { useAuth } from './useAuth';
import { generateTimeSlots, TimeSlotInfo } from '@/utils/scheduleHelpers';
import { profileApi, schedulingApi } from '@/lib/api/workers-client';

export type { TimeSlotInfo };

export function useAvailableTimeSlots(date: Date | null) {
  const { user } = useAuth();

  // Get organization ID from profiles in Firestore
  const { data: profile } = useQuery({
    queryKey: ['profile-org', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const res = await profileApi.me();
      return res.data ?? null;
    },
    enabled: !!user?.uid,
  });

  const organizationId = profile?.organization_id ?? profile?.organizationId;

  // Fetch business hours
  const { data: businessHours } = useQuery({
    queryKey: ['business-hours', organizationId],
    queryFn: async () => {
      const res = await schedulingApi.settings.businessHours.list();
      return (res?.data ?? []).map((hour) => ({
        id: String(hour.id),
        day_of_week: Number(hour.day_of_week ?? 0),
        is_open: hour.is_open !== false,
        open_time: String(hour.open_time ?? '07:00'),
        close_time: String(hour.close_time ?? '19:00'),
        break_start: hour.break_start ?? undefined,
        break_end: hour.break_end ?? undefined,
      })) as BusinessHour[];
    },
    enabled: !!organizationId,
  });

  // Fetch blocked times
  const { data: blockedTimes } = useQuery({
    queryKey: ['blocked-times', organizationId],
    queryFn: async () => {
      const res = await schedulingApi.blockedTimes.list();
      return (res?.data ?? []) as BlockedTime[];
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
