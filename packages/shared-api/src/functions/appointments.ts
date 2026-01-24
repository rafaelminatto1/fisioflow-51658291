import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export class AppointmentFunctions {
  static async createAppointment(data: {
    patientId: string;
    startTime: string;
    endTime: string;
    type: string;
    notes?: string;
    price?: number;
  }) {
    const fn = httpsCallable(functions, 'createAppointment');
    const result = await fn(data);
    return result.data;
  }

  static async updateAppointment(appointmentId: string, updates: any) {
    const fn = httpsCallable(functions, 'updateAppointment');
    const result = await fn({ appointmentId, ...updates });
    return result.data;
  }

  static async cancelAppointment(appointmentId: string, reason?: string) {
    const fn = httpsCallable(functions, 'cancelAppointment');
    const result = await fn({ appointmentId, reason });
    return result.data;
  }

  static async listAppointments(options?: {
    startDate?: string;
    endDate?: string;
    patientId?: string;
  }) {
    const fn = httpsCallable(functions, 'listAppointments');
    const result = await fn(options || {});
    return result.data;
  }

  static async getAppointment(appointmentId: string) {
    const fn = httpsCallable(functions, 'getAppointment');
    const result = await fn({ appointmentId });
    return result.data;
  }
}
