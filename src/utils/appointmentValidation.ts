import { AppointmentBase } from '@/types/appointment';
import { parseISO } from 'date-fns';

interface ConflictCheckParams {
  date: Date;
  time: string;
  duration: number;
  excludeId?: string;
  appointments: AppointmentBase[];
}

export function checkAppointmentConflict({
  date,
  time,
  duration,
  excludeId,
  appointments
}: ConflictCheckParams): { hasConflict: boolean; conflictingAppointment?: AppointmentBase; conflictCount?: number } {
  // Convert time to minutes for easier comparison
  const timeToMinutes = (timeStr: string | undefined | null): number => {
    if (!timeStr) {
      return 0;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const newStartTime = timeToMinutes(time);
  const newEndTime = newStartTime + duration;

  // Get appointments for the same date and time
  const sameDateTimeAppointments = appointments.filter(apt => {
    // Skip the appointment we're editing
    if (excludeId && apt.id === excludeId) return false;

    // Check if it's the same date - handle both Date objects and strings
    const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
    const checkDate = typeof date === 'string' ? parseISO(date) : date;

    if (!aptDate || !checkDate || aptDate.toDateString() !== checkDate.toDateString()) return false;

    // Valide que o horário existe antes de tentar converter
    if (!apt.time || apt.time === '') {
      return false;
    }

    const existingStartTime = timeToMinutes(apt.time);
    const existingEndTime = existingStartTime + apt.duration;

    // Check if appointments overlap
    return (
      (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
      (newEndTime > existingStartTime && newEndTime <= existingEndTime) ||
      (newStartTime <= existingStartTime && newEndTime >= existingEndTime)
    );
  });

  // Retorna informações sobre conflitos (mas não bloqueia mais)
  return { 
    hasConflict: sameDateTimeAppointments.length > 0, 
    conflictingAppointment: sameDateTimeAppointments[0],
    conflictCount: sameDateTimeAppointments.length
  };
}

export function formatTimeRange(time: string | undefined | null, duration: number): string {
  if (!time) {
    return '';
  }
  const [hours, minutes] = time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${time} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}