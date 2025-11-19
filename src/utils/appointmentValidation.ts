import { AppointmentBase } from '@/types/appointment';

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
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const newStartTime = timeToMinutes(time);
  const newEndTime = newStartTime + duration;

  // Get appointments for the same date and time
  const sameDateTimeAppointments = appointments.filter(apt => {
    // Skip the appointment we're editing
    if (excludeId && apt.id === excludeId) return false;
    
    // Check if it's the same date
    if (apt.date.toDateString() !== date.toDateString()) return false;

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

export function formatTimeRange(time: string, duration: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${time} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}