import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';
import { perf } from '@/lib/performance';

export function subscribeToAppointments(
  userId: string,
  callback: (appointments: any[]) => void,
): () => void {
  const load = async () => {
    try {
      const appointments = await patientApi.getAppointments();
      callback(appointments);
    } catch (error) {
      log.error('APPOINTMENT', 'Error polling appointments (no cache available)', error);
    }
  };

  load();
  const interval = setInterval(load, 30000);
  return () => clearInterval(interval);
}

export async function getUpcomingAppointments(_userId: string): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('api_get_upcoming_appointments');
    const appointments = await patientApi.getAppointments(true);
    perf.end('api_get_upcoming_appointments', true);
    return appointments;
  }, 'getUpcomingAppointments');
}

export async function getPastAppointments(_userId: string): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('api_get_past_appointments');
    const appointments = await patientApi.getAppointments();
    const now = Date.now();
    const pastAppointments = appointments.filter((appointment: any) => {
      const appointmentDate = new Date(appointment.date).getTime();
      return (
        appointmentDate < now ||
        appointment.status === 'completed' ||
        appointment.status === 'cancelled'
      );
    });
    perf.end('api_get_past_appointments', true);
    return pastAppointments;
  }, 'getPastAppointments');
}

export async function getNextAppointment(userId: string): Promise<Result<any | null>> {
  return asyncResult(async () => {
    const result = await getUpcomingAppointments(userId);
    if (!result.success || !result.data?.length) {
      return null;
    }
    return result.data[0];
  }, 'getNextAppointment');
}

export async function getAppointmentById(
  _userId: string,
  appointmentId: string,
): Promise<Result<any | null>> {
  return asyncResult(async () => {
    perf.start('api_get_appointment_by_id');
    const appointments = await patientApi.getAppointments();
    perf.end('api_get_appointment_by_id', true);
    return appointments.find((appointment: any) => appointment.id === appointmentId) ?? null;
  }, 'getAppointmentById');
}

export interface AppointmentUpdate {
  confirmed?: boolean;
  patientNotes?: string;
  responseToReminder?: boolean;
}

export async function updateAppointment(
  _userId: string,
  appointmentId: string,
  updates: AppointmentUpdate,
): Promise<Result<void>> {
  return asyncResult(async () => {
    perf.start('api_update_appointment');

    if (updates.confirmed === true || updates.responseToReminder === true) {
      await patientApi.confirmAppointment(appointmentId);
    }

    if (updates.confirmed === false) {
      await patientApi.cancelAppointment(appointmentId, updates.patientNotes);
    }

    perf.end('api_update_appointment', true);
    log.info('APPOINTMENT', 'Appointment updated by patient', { appointmentId, updates });
  }, 'updateAppointment');
}

export async function confirmAppointment(
  userId: string,
  appointmentId: string,
): Promise<Result<void>> {
  return updateAppointment(userId, appointmentId, { confirmed: true });
}
