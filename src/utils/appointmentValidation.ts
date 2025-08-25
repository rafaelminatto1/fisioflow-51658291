import { Appointment } from '@/types';

interface ConflictCheckParams {
  date: Date;
  time: string;
  duration: number;
  excludeId?: string;
  appointments: Appointment[];
}

export function checkAppointmentConflict({
  date,
  time,
  duration,
  excludeId,
  appointments
}: ConflictCheckParams): { hasConflict: boolean; conflictingAppointment?: Appointment } {
  // Convert time to minutes for easier comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const newStartTime = timeToMinutes(time);
  const newEndTime = newStartTime + duration;

  // Get appointments for the same date
  const sameDateAppointments = appointments.filter(apt => {
    // Skip the appointment we're editing
    if (excludeId && apt.id === excludeId) return false;
    
    // Check if it's the same date
    return apt.date.toDateString() === date.toDateString();
  });

  // Check for conflicts
  for (const appointment of sameDateAppointments) {
    const existingStartTime = timeToMinutes(appointment.time);
    const existingEndTime = existingStartTime + appointment.duration;

    // Check if appointments overlap
    const hasOverlap = (
      (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
      (newEndTime > existingStartTime && newEndTime <= existingEndTime) ||
      (newStartTime <= existingStartTime && newEndTime >= existingEndTime)
    );

    if (hasOverlap) {
      return {
        hasConflict: true,
        conflictingAppointment: appointment
      };
    }
  }

  return { hasConflict: false };
}

export function formatTimeRange(time: string, duration: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${time} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}