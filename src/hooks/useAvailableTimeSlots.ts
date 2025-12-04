import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { BusinessHour, BlockedTime } from './useScheduleSettings';

interface TimeSlotInfo {
  time: string;
  isAvailable: boolean;
  isBlocked: boolean;
  blockReason?: string;
  isOutsideBusinessHours: boolean;
}

// Default business hours fallback
const DEFAULT_BUSINESS_HOURS = {
  weekdays: { start: '07:00', end: '21:00' },
  saturday: { start: '07:00', end: '13:00' },
};

export function useAvailableTimeSlots(date: Date | null) {
  const { user } = useAuth();

  // Get organization ID from profiles
  const { data: profile } = useQuery({
    queryKey: ['profile-org', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
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

  // Generate time slots based on business hours and blocked times
  const timeSlots = useMemo(() => {
    if (!date) return [];

    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    // Get business hours for this day
    const dayConfig = businessHours?.find(h => h.day_of_week === dayOfWeek);
    
    // If no config or closed, return empty or default
    if (dayConfig && !dayConfig.is_open) {
      return [];
    }

    // Determine start and end times
    let startTime = '07:00';
    let endTime = dayOfWeek === 6 ? '13:00' : '21:00'; // Default Saturday vs weekday
    let breakStart: string | null = null;
    let breakEnd: string | null = null;

    if (dayConfig) {
      startTime = dayConfig.open_time;
      endTime = dayConfig.close_time;
      breakStart = dayConfig.break_start || null;
      breakEnd = dayConfig.break_end || null;
    }

    // Generate slots
    const slots: TimeSlotInfo[] = [];
    const slotDuration = 30; // minutes

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Break times
    let breakStartMinutes = 0;
    let breakEndMinutes = 0;
    if (breakStart && breakEnd) {
      const [bsH, bsM] = breakStart.split(':').map(Number);
      const [beH, beM] = breakEnd.split(':').map(Number);
      breakStartMinutes = bsH * 60 + bsM;
      breakEndMinutes = beH * 60 + beM;
    }

    for (let mins = startMinutes; mins < endMinutes; mins += slotDuration) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Check if in break time
      const isInBreak = breakStart && breakEnd && mins >= breakStartMinutes && mins < breakEndMinutes;

      // Check if blocked
      let isBlocked = false;
      let blockReason = '';
      
      if (blockedTimes) {
        for (const block of blockedTimes) {
          // Check date range
          const blockStart = new Date(block.start_date);
          const blockEnd = new Date(block.end_date);
          blockStart.setHours(0, 0, 0, 0);
          blockEnd.setHours(23, 59, 59, 999);
          
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          
          if (checkDate >= blockStart && checkDate <= blockEnd) {
            // Date is within block range
            if (block.is_all_day) {
              isBlocked = true;
              blockReason = block.title;
              break;
            }
            
            // Check time range
            if (block.start_time && block.end_time) {
              const [btH, btM] = block.start_time.split(':').map(Number);
              const [etH, etM] = block.end_time.split(':').map(Number);
              const blockTimeStart = btH * 60 + btM;
              const blockTimeEnd = etH * 60 + etM;
              
              if (mins >= blockTimeStart && mins < blockTimeEnd) {
                isBlocked = true;
                blockReason = block.title;
                break;
              }
            }
          }

          // Check recurring blocks
          if (block.is_recurring && block.recurring_days?.includes(dayOfWeek)) {
            if (block.is_all_day) {
              isBlocked = true;
              blockReason = block.title;
              break;
            }
            if (block.start_time && block.end_time) {
              const [btH, btM] = block.start_time.split(':').map(Number);
              const [etH, etM] = block.end_time.split(':').map(Number);
              const blockTimeStart = btH * 60 + btM;
              const blockTimeEnd = etH * 60 + etM;
              
              if (mins >= blockTimeStart && mins < blockTimeEnd) {
                isBlocked = true;
                blockReason = block.title;
                break;
              }
            }
          }
        }
      }

      slots.push({
        time: timeStr,
        isAvailable: !isInBreak && !isBlocked,
        isBlocked: isBlocked,
        blockReason: blockReason || undefined,
        isOutsideBusinessHours: false,
      });
    }

    return slots;
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
  blockedTimes?: BlockedTime[]
): string[] {
  const dayOfWeek = date.getDay();
  const dayConfig = businessHours?.find(h => h.day_of_week === dayOfWeek);
  
  if (dayConfig && !dayConfig.is_open) {
    return [];
  }

  let startTime = '07:00';
  let endTime = dayOfWeek === 6 ? '13:00' : '21:00';

  if (dayConfig) {
    startTime = dayConfig.open_time;
    endTime = dayConfig.close_time;
  }

  const slots: string[] = [];
  const slotDuration = 30;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  for (let mins = startMinutes; mins < endMinutes; mins += slotDuration) {
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeStr);
  }

  return slots;
}
