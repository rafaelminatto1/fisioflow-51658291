import { executeGQL } from '../lib/dataConnect';
import { Appointment } from '../types/schema';

export const AppointmentService = {
  async getAll(): Promise<Appointment[]> {
    const query = `
      query ListAppointments {
        appointments {
          id
          patient_id
          date
          status
          session_type
          patient {
            name
          }
        }
      }
    `;
    const data = await executeGQL(query);
    return data.appointments;
  }
};