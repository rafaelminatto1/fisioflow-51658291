import { executeGQL } from '../lib/dataConnect';
import { Patient } from '../types/schema';

export const PatientService = {
  async getAll(): Promise<Patient[]> {
    const query = `
      query ListPatients {
        patients {
          id
          name
          main_condition
          status
          progress
        }
      }
    `;
    const data = await executeGQL(query);
    return data.patients;
  },

  async getById(id: string): Promise<Patient> {
    const query = `
      query GetPatient($id: UUID!) {
        patient(id: $id) {
          id
          name
          cpf
          email
          phone
          main_condition
          status
          progress
          medical_history
        }
      }
    `;
    const data = await executeGQL(query, { id });
    return data.patient;
  }
};