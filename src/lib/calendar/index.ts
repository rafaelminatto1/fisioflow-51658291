// Calendar utility functions and helpers for the appointment scheduling system

import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  getDay,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  EnhancedAppointment, 
  CalendarEvent, 
  TimeSlot,
  CalendarSettings,
  DayOfWeek,
  RecurrencePattern
} from '@/types/appointment';

// Default calendar settings
export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  workingHours: {
    start: '08:00',
    end: '18:00'
  },
  timeSlotDuration: 30, // minutes
  bufferTime: 10, // minutes between appointments
  maxAdvanceBooking: 90, // days
  allowWeekendBooking: false,
  defaultAppointmentDuration: 60,
  autoConfirmAppointments: false,
  requireDepositForBooking: false,
  cancellationDeadline: 24, // hours
  rescheduleDeadline: 24 // hours
};

/**
 * Generate time slots for a given day based on working hours
 */
export function generateTimeSlots(
  date: Date, 
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = settings.workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = settings.workingHours.end.split(':').map(Number);
  
  let currentTime = setMinutes(setHours(date, startHour), startMinute);
  const endTime = setMinutes(setHours(date, endHour), endMinute);
  
  while (currentTime < endTime) {
    const nextTime = addMinutes(currentTime, settings.timeSlotDuration);
    
    slots.push({
      date,
      startTime: format(currentTime, 'HH:mm'),
      endTime: format(nextTime, 'HH:mm'),
      isAvailable: true,
      appointments: []
    });
    
    currentTime = nextTime;
  }
  
  return slots;
}

/**
 * Convert appointments to calendar events
 */
export function appointmentsToCalendarEvents(appointments: EnhancedAppointment[]): CalendarEvent[] {
  return appointments.map(appointment => {
    const startTime = parseTimeString(appointment.time);
    const start = setMinutes(setHours(appointment.date, startTime.hours), startTime.minutes);
    const end = addMinutes(start, appointment.duration);
    
    return {
      id: appointment.id,
      title: `${appointment.patientName} - ${appointment.type}`,
      start,
      end,
      allDay: false,
      resource: {
        appointment,
      },
      color: appointment.color,
      textColor: '#ffffff',
      borderColor: appointment.color,
      className: `appointment-${appointment.status.toLowerCase().replace(' ', '-')}`
    };
  });
}

/**
 * Parse time string (HH:mm) to hours and minutes
 */
export function parseTimeString(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if a time slot is available (no conflicting appointments)
 */
export function isTimeSlotAvailable(
  date: Date,
  startTime: string,
  duration: number,
  appointments: EnhancedAppointment[],
  excludeAppointmentId?: string
): boolean {
  const slotStart = parseTimeString(startTime);
  const appointmentStart = setMinutes(setHours(date, slotStart.hours), slotStart.minutes);
  const appointmentEnd = addMinutes(appointmentStart, duration);
  
  return !appointments.some(appointment => {
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
      return false;
    }
    
    if (!isSameDay(appointment.date, date)) {
      return false;
    }
    
    const existingStart = parseTimeString(appointment.time);
    const existingStartTime = setMinutes(setHours(appointment.date, existingStart.hours), existingStart.minutes);
    const existingEndTime = addMinutes(existingStartTime, appointment.duration);
    
    // Check for overlap
    return appointmentStart < existingEndTime && appointmentEnd > existingStartTime;
  });
}

/**
 * Get available time slots for a specific date
 */
export function getAvailableTimeSlots(
  date: Date,
  appointments: EnhancedAppointment[],
  duration: number = 60,
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): TimeSlot[] {
  const allSlots = generateTimeSlots(date, settings);
  const dayAppointments = appointments.filter(apt => isSameDay(apt.date, date));
  
  return allSlots.map(slot => ({
    ...slot,
    isAvailable: isTimeSlotAvailable(date, slot.startTime, duration, dayAppointments),
    appointments: dayAppointments.filter(apt => {
      const aptStart = parseTimeString(apt.time);
      const aptStartTime = format(setMinutes(setHours(date, aptStart.hours), aptStart.minutes), 'HH:mm');
      return aptStartTime === slot.startTime;
    })
  }));
}

/**
 * Get week days for calendar view
 */
export function getWeekDays(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

/**
 * Get month days for calendar view
 */
export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

/**
 * Get calendar grid days (including previous/next month days for complete weeks)
 */
export function getCalendarGridDays(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });
  
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

/**
 * Format date for display in different locales
 */
export function formatDateForDisplay(date: Date, formatStr: string = 'PPP'): string {
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Format time for display
 */
export function formatTimeForDisplay(time: string): string {
  return time;
}

/**
 * Check if appointment can be cancelled (based on cancellation deadline)
 */
export function canCancelAppointment(
  appointment: EnhancedAppointment,
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): boolean {
  const appointmentDateTime = setMinutes(
    setHours(appointment.date, parseTimeString(appointment.time).hours),
    parseTimeString(appointment.time).minutes
  );
  
  const cancellationDeadline = addMinutes(appointmentDateTime, -settings.cancellationDeadline * 60);
  return new Date() < cancellationDeadline;
}

/**
 * Check if appointment can be rescheduled
 */
export function canRescheduleAppointment(
  appointment: EnhancedAppointment,
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): boolean {
  const appointmentDateTime = setMinutes(
    setHours(appointment.date, parseTimeString(appointment.time).hours),
    parseTimeString(appointment.time).minutes
  );
  
  const rescheduleDeadline = addMinutes(appointmentDateTime, -settings.rescheduleDeadline * 60);
  return new Date() < rescheduleDeadline;
}

/**
 * Calculate appointment duration in hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Get next available appointment slot
 */
export function getNextAvailableSlot(
  startDate: Date,
  appointments: EnhancedAppointment[],
  duration: number = 60,
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): { date: Date; time: string } | null {
  let currentDate = startDate;
  const maxDate = addDays(startDate, settings.maxAdvanceBooking);
  
  while (currentDate <= maxDate) {
    // Skip weekends if not allowed
    if (!settings.allowWeekendBooking && (getDay(currentDate) === 0 || getDay(currentDate) === 6)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }
    
    const availableSlots = getAvailableTimeSlots(currentDate, appointments, duration, settings);
    const firstAvailable = availableSlots.find(slot => slot.isAvailable);
    
    if (firstAvailable) {
      return {
        date: currentDate,
        time: firstAvailable.startTime
      };
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return null;
}

/**
 * Generate recurring appointment dates
 */
export function generateRecurringDates(
  startDate: Date,
  pattern: RecurrencePattern
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;
  
  while (count < (pattern.maxOccurrences || 52) && 
         (!pattern.endDate || currentDate <= pattern.endDate)) {
    
    // Skip excluded dates
    if (!pattern.excludedDates?.some(excluded => 
      isSameDay(excluded, currentDate)
    )) {
      dates.push(new Date(currentDate));
    }
    
    // Calculate next occurrence
    switch (pattern.type) {
      case 'Daily':
        currentDate = addDays(currentDate, pattern.frequency);
        break;
      case 'Weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // For weekly patterns with specific days
          const dayOfWeekMap: Record<DayOfWeek, number> = {
            'Sunday': 0,
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6
          };
          
          const currentDayOfWeek = getDay(currentDate);
          const targetDays = pattern.daysOfWeek.map(day => dayOfWeekMap[day]).sort();
          
          // Find next target day
          let nextTargetDay = targetDays.find(day => day > currentDayOfWeek);
          if (!nextTargetDay) {
            // Go to first day of next week
            nextTargetDay = targetDays[0];
            currentDate = addWeeks(currentDate, pattern.frequency);
            currentDate = addDays(currentDate, nextTargetDay - getDay(currentDate));
          } else {
            currentDate = addDays(currentDate, nextTargetDay - currentDayOfWeek);
          }
        } else {
          currentDate = addWeeks(currentDate, pattern.frequency);
        }
        break;
      case 'Monthly':
        if (pattern.dayOfMonth) {
          currentDate = addMonths(currentDate, pattern.frequency);
          currentDate.setDate(pattern.dayOfMonth);
        } else {
          currentDate = addMonths(currentDate, pattern.frequency);
        }
        break;
      default:
        currentDate = addDays(currentDate, pattern.frequency);
        break;
    }
    
    count++;
  }
  
  return dates;
}

/**
 * Check for appointment conflicts
 */
export function checkAppointmentConflicts(
  appointment: Partial<EnhancedAppointment>,
  existingAppointments: EnhancedAppointment[],
  excludeId?: string
): EnhancedAppointment[] {
  if (!appointment.date || !appointment.time || !appointment.duration) {
    return [];
  }
  
  const appointmentStart = parseTimeString(appointment.time);
  const start = setMinutes(setHours(appointment.date, appointmentStart.hours), appointmentStart.minutes);
  const end = addMinutes(start, appointment.duration);
  
  return existingAppointments.filter(existing => {
    if (excludeId && existing.id === excludeId) return false;
    if (!isSameDay(existing.date, appointment.date)) return false;
    
    const existingStart = parseTimeString(existing.time);
    const existingStartTime = setMinutes(setHours(existing.date, existingStart.hours), existingStart.minutes);
    const existingEndTime = addMinutes(existingStartTime, existing.duration);
    
    // Check for time overlap
    const hasTimeOverlap = start < existingEndTime && end > existingStartTime;
    if (!hasTimeOverlap) return false;
    
    // Check for resource conflicts
    if (appointment.therapistId && appointment.therapistId === existing.therapistId) return true;
    if (appointment.roomId && appointment.roomId === existing.roomId) return true;
    
    return false;
  });
}

/**
 * Calculate optimal appointment spacing
 */
export function calculateOptimalSpacing(
  appointments: EnhancedAppointment[],
  bufferTime: number = 10
): number {
  if (appointments.length < 2) return bufferTime;
  
  const sortedAppointments = [...appointments].sort((a, b) => {
    const timeA = parseTimeString(a.time);
    const timeB = parseTimeString(b.time);
    return (timeA.hours * 60 + timeA.minutes) - (timeB.hours * 60 + timeB.minutes);
  });
  
  let totalGap = 0;
  let gapCount = 0;
  
  for (let i = 1; i < sortedAppointments.length; i++) {
    const prevAppointment = sortedAppointments[i - 1];
    const currentAppointment = sortedAppointments[i];
    
    if (isSameDay(prevAppointment.date, currentAppointment.date)) {
      const prevEnd = parseTimeString(prevAppointment.time);
      const prevEndTime = setMinutes(setHours(prevAppointment.date, prevEnd.hours), prevEnd.minutes);
      const prevEndWithDuration = addMinutes(prevEndTime, prevAppointment.duration);
      
      const currentStart = parseTimeString(currentAppointment.time);
      const currentStartTime = setMinutes(setHours(currentAppointment.date, currentStart.hours), currentStart.minutes);
      
      const gap = differenceInMinutes(currentStartTime, prevEndWithDuration);
      if (gap > 0) {
        totalGap += gap;
        gapCount++;
      }
    }
  }
  
  return gapCount > 0 ? Math.round(totalGap / gapCount) : bufferTime;
}

/**
 * Get appointment statistics for a date range
 */
export function getAppointmentStatistics(
  appointments: EnhancedAppointment[],
  startDate: Date,
  endDate: Date
) {
  const rangeAppointments = appointments.filter(apt => 
    isWithinInterval(apt.date, { start: startDate, end: endDate })
  );
  
  const byStatus = rangeAppointments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byType = rangeAppointments.reduce((acc, apt) => {
    acc[apt.type] = (acc[apt.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalDuration = rangeAppointments.reduce((sum, apt) => sum + apt.duration, 0);
  const averageDuration = rangeAppointments.length > 0 ? totalDuration / rangeAppointments.length : 0;
  
  return {
    total: rangeAppointments.length,
    byStatus,
    byType,
    totalDuration,
    averageDuration: Math.round(averageDuration),
    utilizationRate: 0 // Would need working hours to calculate
  };
}

/**
 * Find best appointment slot based on patient preferences
 */
export function findBestSlot(
  preferredDate: Date,
  preferredTime?: string,
  preferredDays?: DayOfWeek[],
  duration: number = 60,
  appointments: EnhancedAppointment[] = [],
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): { date: Date; time: string; score: number } | null {
  const candidates: Array<{ date: Date; time: string; score: number }> = [];
  
  // Check preferred date and time first
  if (preferredTime && isTimeSlotAvailable(preferredDate, preferredTime, duration, appointments)) {
    candidates.push({
      date: preferredDate,
      time: preferredTime,
      score: 100
    });
  }
  
  // Check other slots on preferred date
  const slotsOnPreferredDate = getAvailableTimeSlots(preferredDate, appointments, duration, settings);
  slotsOnPreferredDate.filter(slot => slot.isAvailable).forEach(slot => {
    if (!preferredTime || slot.startTime !== preferredTime) {
      candidates.push({
        date: preferredDate,
        time: slot.startTime,
        score: 80
      });
    }
  });
  
  // Check preferred days in the next weeks
  if (preferredDays && preferredDays.length > 0) {
    const dayOfWeekMap: Record<DayOfWeek, number> = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    
    let checkDate = addDays(preferredDate, 1);
    const maxCheckDate = addDays(preferredDate, 14); // Check 2 weeks ahead
    
    while (checkDate <= maxCheckDate) {
      const dayOfWeek = Object.keys(dayOfWeekMap).find(
        key => dayOfWeekMap[key as DayOfWeek] === getDay(checkDate)
      ) as DayOfWeek;
      
      if (preferredDays.includes(dayOfWeek)) {
        const slots = getAvailableTimeSlots(checkDate, appointments, duration, settings);
        slots.filter(slot => slot.isAvailable).forEach(slot => {
          let score = 60;
          if (preferredTime && slot.startTime === preferredTime) {
            score = 70;
          }
          
          candidates.push({
            date: checkDate,
            time: slot.startTime,
            score
          });
        });
      }
      
      checkDate = addDays(checkDate, 1);
    }
  }
  
  // Sort by score and return best option
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Validate appointment time constraints
 */
export function validateAppointmentTime(
  date: Date,
  time: string,
  duration: number,
  settings: CalendarSettings = DEFAULT_CALENDAR_SETTINGS
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if date is in the past
  if (date < startOfDay(new Date())) {
    errors.push('Não é possível agendar consultas em datas passadas');
  }
  
  // Check max advance booking
  const maxDate = addDays(new Date(), settings.maxAdvanceBooking);
  if (date > maxDate) {
    errors.push(`Não é possível agendar com mais de ${settings.maxAdvanceBooking} dias de antecedência`);
  }
  
  // Check weekend booking
  if (!settings.allowWeekendBooking && (getDay(date) === 0 || getDay(date) === 6)) {
    errors.push('Agendamentos em fins de semana não são permitidos');
  }
  
  // Check working hours
  const appointmentTime = parseTimeString(time);
  const workingStart = parseTimeString(settings.workingHours.start);
  const workingEnd = parseTimeString(settings.workingHours.end);
  
  const appointmentMinutes = appointmentTime.hours * 60 + appointmentTime.minutes;
  const workingStartMinutes = workingStart.hours * 60 + workingStart.minutes;
  const workingEndMinutes = workingEnd.hours * 60 + workingEnd.minutes;
  const appointmentEndMinutes = appointmentMinutes + duration;
  
  if (appointmentMinutes < workingStartMinutes) {
    errors.push(`Agendamentos devem começar após às ${settings.workingHours.start}`);
  }
  
  if (appointmentEndMinutes > workingEndMinutes) {
    errors.push(`Agendamentos devem terminar antes das ${settings.workingHours.end}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get navigation dates for calendar views
 */
export function getNavigationDates(currentDate: Date, view: 'month' | 'week' | 'day') {
  switch (view) {
    case 'month':
      return {
        previous: subMonths(currentDate, 1),
        next: addMonths(currentDate, 1),
        current: currentDate
      };
    case 'week':
      return {
        previous: subWeeks(currentDate, 1),
        next: addWeeks(currentDate, 1),
        current: currentDate
      };
    case 'day':
      return {
        previous: addDays(currentDate, -1),
        next: addDays(currentDate, 1),
        current: currentDate
      };
    default:
      return {
        previous: currentDate,
        next: currentDate,
        current: currentDate
      };
  }
}