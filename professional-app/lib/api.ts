/**
 * API Client for Professional App
 * Uses the same Cloud Functions V2 endpoints as the web app
 */

import { auth } from './firebase';

// Cloud Functions V2 URLs (same as web app)
const HASH = 'tfecm5cqoq';
const CLOUD_RUN_BASE_URL = (func: string) => `https://${func.toLowerCase()}-${HASH}-rj.a.run.app`;

const API_URLS = {
  patients: {
    list: CLOUD_RUN_BASE_URL('listPatientsV2'),
    get: CLOUD_RUN_BASE_URL('getPatientHttp'),
    create: CLOUD_RUN_BASE_URL('createPatientV2'),
    update: CLOUD_RUN_BASE_URL('updatePatientV2'),
    delete: CLOUD_RUN_BASE_URL('deletePatientV2'),
  },
  appointments: {
    list: CLOUD_RUN_BASE_URL('listAppointments'),
    get: CLOUD_RUN_BASE_URL('getAppointmentV2'),
    create: CLOUD_RUN_BASE_URL('createAppointmentV2'),
    update: CLOUD_RUN_BASE_URL('updateAppointmentV2'),
    cancel: CLOUD_RUN_BASE_URL('cancelAppointmentV2'),
  },
  exercises: {
    list: CLOUD_RUN_BASE_URL('listExercisesV2'),
    get: CLOUD_RUN_BASE_URL('getExerciseV2'),
    create: CLOUD_RUN_BASE_URL('createExerciseV2'),
    update: CLOUD_RUN_BASE_URL('updateExerciseV2'),
    delete: CLOUD_RUN_BASE_URL('deleteExerciseV2'),
  },
};

// Types
export interface ApiPatient {
  id: string;
  name: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string;
  gender?: string;
  main_condition?: string;
  observations?: string;
  status: string;
  progress?: number;
  incomplete_registration?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAppointment {
  id: string;
  patientId: string;
  patient_name?: string;
  therapistId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

// Generic fetch wrapper
async function fetchApi<T>(url: string, data?: any): Promise<T> {
  const token = await getAuthToken();

  console.log('[API] Request to:', url, 'with data:', data);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log('[API] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Error:', errorText);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json() as Promise<T>;
  console.log('[API] Response data:', result);
  return result;
}

// Response wrapper type
interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

// ============================================================
// PATIENTS API
// ============================================================

export async function getPatients(
  organizationId?: string,
  options?: { status?: string; search?: string; limit?: number }
): Promise<ApiPatient[]> {
  const response = await fetchApi<ApiResponse<ApiPatient[]>>(API_URLS.patients.list, {
    organizationId,
    ...options,
    limit: options?.limit || 100,
  });

  return response.data || [];
}

export async function getPatientById(id: string): Promise<ApiPatient | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiPatient>>(API_URLS.patients.get, {
      patientId: id,
    });
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createPatient(data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(API_URLS.patients.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function updatePatient(id: string, data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(API_URLS.patients.update, {
    patientId: id,
    ...data,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function deletePatient(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.patients.delete, { patientId: id });
}

// ============================================================
// APPOINTMENTS API
// ============================================================

export async function getAppointments(
  organizationId?: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    therapistId?: string;
    status?: string;
    patientId?: string;
    limit?: number;
  }
): Promise<ApiAppointment[]> {
  const response = await fetchApi<ApiResponse<ApiAppointment[]>>(API_URLS.appointments.list, {
    organizationId,
    ...options,
    limit: options?.limit || 100,
  });

  return response.data || [];
}

export async function getAppointmentById(id: string): Promise<ApiAppointment | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiAppointment>>(API_URLS.appointments.get, {
      appointmentId: id,
    });
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createAppointment(data: {
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  therapistId?: string;
  type?: string;
  notes?: string;
}): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(API_URLS.appointments.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function updateAppointment(
  id: string,
  data: Partial<ApiAppointment>
): Promise<ApiAppointment> {
  const response = await fetchApi<ApiResponse<ApiAppointment>>(API_URLS.appointments.update, {
    appointmentId: id,
    ...data,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function cancelAppointment(id: string, reason?: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.appointments.cancel, {
    appointmentId: id,
    reason,
  });
}

// ============================================================
// EXERCISES API
// ============================================================

export interface ApiExercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string[];
  category?: string;
  difficulty?: string;
  videoUrl?: string;
  imageUrl?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getExercises(
  options?: { category?: string; difficulty?: string; search?: string; limit?: number }
): Promise<ApiExercise[]> {
  const response = await fetchApi<ApiResponse<ApiExercise[]>>(API_URLS.exercises.list, {
    ...options,
    limit: options?.limit || 100,
  });

  return response.data || [];
}

export async function getExerciseById(id: string): Promise<ApiExercise | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiExercise>>(API_URLS.exercises.get, {
      exerciseId: id,
    });
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createExercise(data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(API_URLS.exercises.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function updateExercise(id: string, data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(API_URLS.exercises.update, {
    id,
    ...data,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

export async function deleteExercise(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.exercises.delete, { id });
}
