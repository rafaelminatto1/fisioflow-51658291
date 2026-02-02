import { AppointmentBase } from '@/types/appointment';
import { parseISO } from 'date-fns';

interface ConflictCheckParams {
  date: Date;
  time: string;
  duration: number;
  excludeId?: string;
  /** Quando informado, conta apenas conflitos deste terapeuta (alinhado com a regra do backend) */
  therapistId?: string;
  appointments: AppointmentBase[];
}

export function checkAppointmentConflict({
  date,
  time,
  duration,
  excludeId,
  therapistId,
  appointments
}: ConflictCheckParams): { hasConflict: boolean; conflictingAppointment?: AppointmentBase; conflictCount?: number } {
  // Convert time to minutes for easier comparison (aceita "HH:mm" ou "HH:mm:ss")
  const timeToMinutes = (timeStr: string | undefined | null): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.trim().split(':');
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    return hours * 60 + minutes;
  };

  const newStartTime = timeToMinutes(time);
  const newEndTime = newStartTime + duration;

  // Filtrar por terapeuta quando informado (mesma regra do backend: conflito = mesmo terapeuta no mesmo horário)
  const baseList = therapistId !== undefined
    ? appointments.filter(apt => (apt.therapistId ?? '') === (therapistId ?? ''))
    : appointments;

  // Get appointments for the same date and time
  const sameDateTimeAppointments = baseList.filter(apt => {
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

/** Formata intervalo de horário (aceita "HH:mm" ou "HH:mm:ss"). */
export function formatTimeRange(time: string | undefined | null, duration: number): string {
  if (!time || typeof time !== 'string') return '';
  const parts = time.trim().split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const displayStart = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return `${displayStart} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}