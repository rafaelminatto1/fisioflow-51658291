import type { Appointment } from '@/types/appointment';

export interface PendingOptimisticUpdate {
  id: string;
  originalDate: Appointment['date'];
  originalTime: string;
  targetDate: Appointment['date'];
  targetTime: string;
}

const padDatePart = (value: number): string => String(value).padStart(2, '0');

const normalizeSlotTime = (time: string | undefined | null): string => {
  if (!time || typeof time !== 'string') return '00:00';
  return time.substring(0, 5);
};

const getDateKey = (dateValue: Appointment['date']): string | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null;
    return `${dateValue.getFullYear()}-${padDatePart(dateValue.getMonth() + 1)}-${padDatePart(dateValue.getDate())}`;
  }

  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`;
  }

  return null;
};

export const applyOptimisticAppointmentOverlay = (
  appointments: Appointment[],
  pendingUpdate: PendingOptimisticUpdate | null
): Appointment[] => {
  if (!pendingUpdate) return appointments;

  return appointments.map((appointment) => {
    if (appointment.id !== pendingUpdate.id) return appointment;

    return {
      ...appointment,
      date: pendingUpdate.targetDate,
      time: pendingUpdate.targetTime,
    };
  });
};

export const hasOptimisticUpdateSynced = (
  appointments: Appointment[],
  pendingUpdate: PendingOptimisticUpdate | null
): boolean => {
  if (!pendingUpdate) return true;

  const appointment = appointments.find((item) => item.id === pendingUpdate.id);
  if (!appointment) return true;

  return (
    getDateKey(appointment.date) === getDateKey(pendingUpdate.targetDate) &&
    normalizeSlotTime(appointment.time) === normalizeSlotTime(pendingUpdate.targetTime)
  );
};
