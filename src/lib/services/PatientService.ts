import type { Patient } from '@/types';

export class PatientService {
  static async getPatients(): Promise<Patient[]> {
    // Stub implementation
    return [];
  }

  static async getPatientById(id: string): Promise<Patient | null> {
    // Stub implementation
    return null;
  }

  static async createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    // Stub implementation
    return { ...patient, id: 'stub-id' } as Patient;
  }

  static async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    // Stub implementation
    return { id, ...updates } as Patient;
  }

  static async deletePatient(id: string): Promise<void> {
    // Stub implementation
    console.log('Deleting patient:', id);
  }
}