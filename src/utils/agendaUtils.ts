import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, isWithinInterval, addWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, WeeklyCalendarData } from "@/types/agenda";

// Date formatting utilities
export const formatDate = (date: Date | string, formatStr: string = "yyyy-MM-dd"): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: ptBR });
};

export const formatTime = (time: string): string => {
  return time;
};

export const formatDateTime = (date: string, time: string): string => {
  return `${formatDate(date, "dd/MM/yyyy")} às ${time}`;
};

// Week navigation utilities
export const getWeekStart = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday as first day
};

export const getWeekEnd = (date: Date): Date => {
  return endOfWeek(date, { weekStartsOn: 1 }); // Sunday as last day
};

export const getWeekDays = (weekStart: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
};

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  return { start, end };
};

// Week navigation
export { addWeeks };

// Appointment utilities
export const getAppointmentsForDay = (appointments: Appointment[], date: Date): Appointment[] => {
  return appointments.filter(appointment => {
    const appointmentDate = parseISO(appointment.date);
    return isSameDay(appointmentDate, date);
  });
};

export const getAppointmentsForWeek = (appointments: Appointment[], weekStart: Date): WeeklyCalendarData => {
  const weekEnd = getWeekEnd(weekStart);
  
  const weekAppointments = appointments.filter(appointment => {
    const appointmentDate = parseISO(appointment.date);
    return isWithinInterval(appointmentDate, { start: weekStart, end: weekEnd });
  });

  return {
    weekStart,
    weekEnd,
    appointments: weekAppointments,
    timeSlots: generateTimeSlots()
  };
};

// Time slot utilities
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const startHour = 7;
  const endHour = 19;
  const slotDuration = 30;
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  
  return slots;
};

export const getTimeSlotIndex = (time: string): number => {
  const timeSlots = generateTimeSlots();
  return timeSlots.indexOf(time);
};

export const isTimeSlotOccupied = (appointments: Appointment[], date: Date, time: string): boolean => {
  const dayAppointments = getAppointmentsForDay(appointments, date);
  
  return dayAppointments.some(appointment => {
    const startTime = appointment.start_time;
    const endTime = appointment.end_time;
    
    // Check if the time slot overlaps with the appointment
    return isTimeInRange(time, startTime, endTime);
  });
};

export const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
  const [timeHour, timeMin] = time.split(':').map(Number);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const timeMinutes = timeHour * 60 + timeMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};

// Conflict detection
export const hasTimeConflict = (
  appointments: Appointment[],
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): boolean => {
  const dateObj = parseISO(date);
  const dayAppointments = getAppointmentsForDay(appointments, dateObj);
  
  return dayAppointments.some(appointment => {
    // Skip the appointment being edited
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
      return false;
    }
    
    // Check for time overlap
    return hasTimeOverlap(
      startTime,
      endTime,
      appointment.start_time,
      appointment.end_time
    );
  });
};

export const hasTimeOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const [start1Hour, start1Min] = start1.split(':').map(Number);
  const [end1Hour, end1Min] = end1.split(':').map(Number);
  const [start2Hour, start2Min] = start2.split(':').map(Number);
  const [end2Hour, end2Min] = end2.split(':').map(Number);
  
  const start1Minutes = start1Hour * 60 + start1Min;
  const end1Minutes = end1Hour * 60 + end1Min;
  const start2Minutes = start2Hour * 60 + start2Min;
  const end2Minutes = end2Hour * 60 + end2Min;
  
  // Check if intervals overlap
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
};

// Suggestion utilities
export const suggestAlternativeTimeSlots = (
  appointments: Appointment[],
  date: string,
  preferredStartTime: string,
  sessionDuration: number = 60 // minutes
): string[] => {
  const dateObj = parseISO(date);
  const timeSlots = generateTimeSlots();
  const suggestions: string[] = [];
  
  for (const slot of timeSlots) {
    const endTime = addMinutesToTime(slot, sessionDuration);
    
    // Check if this slot would fit within business hours
    if (!isWithinBusinessHours(slot, endTime)) {
      continue;
    }
    
    // Check if this slot conflicts with existing appointments
    if (!hasTimeConflict(appointments, date, slot, endTime)) {
      suggestions.push(slot);
    }
    
    // Limit suggestions to avoid overwhelming the user
    if (suggestions.length >= 5) {
      break;
    }
  }
  
  return suggestions;
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hour, min] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + min + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;
  
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
};

export const isWithinBusinessHours = (startTime: string, endTime: string): boolean => {
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);
  
  return startHour >= 7 && endHour <= 19;
};

// Display utilities
export const getWeekDisplayText = (weekStart: Date): string => {
  const weekEnd = getWeekEnd(weekStart);
  const startText = formatDate(weekStart, "dd/MM");
  const endText = formatDate(weekEnd, "dd/MM/yyyy");
  
  return `${startText} - ${endText}`;
};

export const getDayDisplayText = (date: Date): string => {
  return formatDate(date, "EEE dd/MM");
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

// Sorting utilities
export const sortAppointmentsByTime = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => {
    const timeA = a.start_time;
    const timeB = b.start_time;
    
    return timeA.localeCompare(timeB);
  });
};

export const groupAppointmentsByDate = (appointments: Appointment[]): Record<string, Appointment[]> => {
  return appointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);
};