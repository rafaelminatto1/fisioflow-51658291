import { AppointmentBase } from '@/types/appointment';
import { parseISO, isSameDay } from 'date-fns';

interface ConflictCheckParams {
  date: Date;
  time: string;
  duration: number;
  excludeId?: string;
  /** Quando informado, conta apenas conflitos deste terapeuta (alinhado com a regra do backend) */
  therapistId?: string;
  appointments: AppointmentBase[];
}

// Helper para converter horário em minutos
const timeToMinutes = (timeStr: string | undefined | null): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
};

// Helper para verificar sobreposição de intervalos
const isOverlapping = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return (
    (start1 >= start2 && start1 < end2) ||
    (end1 > start2 && end1 <= end2) ||
    (start1 <= start2 && end1 >= end2)
  );
};

export function checkAppointmentConflict({
  date,
  time,
  duration,
  excludeId,
  therapistId,
  appointments
}: ConflictCheckParams): { 
  hasConflict: boolean; 
  conflictingAppointment?: AppointmentBase; 
  conflictCount?: number;
  totalConflictCount?: number;
} {
  const newStartTime = timeToMinutes(time);
  const newEndTime = newStartTime + duration;
  const checkDate = typeof date === 'string' ? parseISO(date) : date;

  // 1. Calculate TOTAL conflicts (Clinic-wide)
  // Used for checking max capacity per slot
  const totalConflictingAppointments = appointments.filter(apt => {
    // Skip self
    if (excludeId && apt.id === excludeId) return false;

    // Skip cancelled
    if (apt.status === 'cancelado') return false;

    // Validate Date
    const aptDate = typeof apt.date === 'string' ? parseISO(apt.date) : apt.date;
    if (!aptDate || !checkDate || !isSameDay(aptDate, checkDate)) return false;

    // Validate Time
    if (!apt.time || apt.time === '') return false;

    const existingStartTime = timeToMinutes(apt.time);
    const existingEndTime = existingStartTime + (apt.duration || 60);

    return isOverlapping(newStartTime, newEndTime, existingStartTime, existingEndTime);
  });

  // 2. Filter by therapist if provided (Double-booking check)
  const therapistConflictingAppointments = therapistId !== undefined
    ? totalConflictingAppointments.filter(apt => (apt.therapistId ?? '') === (therapistId ?? ''))
    : totalConflictingAppointments;

  return { 
    hasConflict: therapistConflictingAppointments.length > 0, 
    conflictingAppointment: therapistConflictingAppointments[0],
    conflictCount: therapistConflictingAppointments.length,
    totalConflictCount: totalConflictingAppointments.length
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