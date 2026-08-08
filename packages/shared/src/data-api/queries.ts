import type { PatientDataApiClient } from "./client";
import type { 
  PatientProfile, 
  PatientAppointment, 
  PatientSession, 
  PatientExercise,
  PatientPaymentStatus
} from "./types";

export async function getMyProfile(client: PatientDataApiClient): Promise<PatientProfile | null> {
  const result = await client.query<PatientProfile>(
    `SELECT id, full_name as "fullName", email, phone, photo_url as "photoUrl", next_appointment_date as "nextAppointmentDate" 
     FROM patients LIMIT 1`
  );
  return result[0] || null;
}

export async function getMyAppointments(client: PatientDataApiClient, startDate?: string, endDate?: string): Promise<PatientAppointment[]> {
  let query = `SELECT id, date, start_time as "startTime", end_time as "endTime", status, type FROM appointments`;
  const params: any[] = [];
  
  if (startDate && endDate) {
    query += ` WHERE date >= $1 AND date <= $2`;
    params.push(startDate, endDate);
  }
  
  query += ` ORDER BY date DESC, start_time DESC`;
  
  return client.query<PatientAppointment>(query, params);
}

export async function getMyProgress(client: PatientDataApiClient): Promise<PatientSession[]> {
  return client.query<PatientSession>(
    `SELECT id, date, duration_minutes as duration, home_exercises as "homeExercises", status 
     FROM sessions 
     ORDER BY date DESC`
  );
}

export async function getMyExercises(client: PatientDataApiClient): Promise<PatientExercise[]> {
  return client.query<PatientExercise>(
    `SELECT id, name, description, instructions, image_url as "imageUrl", video_url as "videoUrl" 
     FROM exercises 
     WHERE is_active = true`
  );
}

export async function getMyPaymentStatus(client: PatientDataApiClient): Promise<PatientPaymentStatus[]> {
  return client.query<PatientPaymentStatus>(
    `SELECT id, amount, status, paid_at as "paidAt", null as "dueDate", 'payment' as source 
     FROM payments
     UNION ALL
     SELECT id, amount, status, paid_at as "paidAt", due_date as "dueDate", 'account' as source
     FROM financial_accounts
     ORDER BY "paidAt" DESC NULLS FIRST`
  );
}
