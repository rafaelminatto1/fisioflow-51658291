import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

export class PatientFunctions {
  static async createPatient(data: {
    name: string;
    email?: string;
    phone?: string;
    birthDate: string;
  }) {
    const fn = httpsCallable(functions, 'createPatient');
    const result = await fn(data);
    return result.data;
  }

  static async listPatients(options?: {
    limit?: number;
    activeOnly?: boolean;
  }) {
    const fn = httpsCallable(functions, 'listPatients');
    const result = await fn(options || {});
    return result.data;
  }

  static async getPatient(patientId: string) {
    const fn = httpsCallable(functions, 'getPatient');
    const result = await fn({ patientId });
    return result.data;
  }

  static async updatePatient(patientId: string, updates: any) {
    const fn = httpsCallable(functions, 'updatePatient');
    const result = await fn({ patientId, ...updates });
    return result.data;
  }

  static async deletePatient(patientId: string) {
    const fn = httpsCallable(functions, 'deletePatient');
    const result = await fn({ patientId });
    return result.data;
  }
}
