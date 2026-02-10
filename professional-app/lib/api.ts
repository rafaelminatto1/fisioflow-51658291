/**
 * API Client for Professional App
 * Uses the same Cloud Functions V2 endpoints as the web app
 *
 * @module lib/api
 */

import { auth } from './firebase';

// ============================================================
// CONFIGURATION
// ============================================================

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

// ============================================================
// TYPES
// ============================================================

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
  session_type?: string;
  created_at?: string;
  updated_at?: string;
}

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

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

class ApiError extends Error {
  constructor(
    public endpoint: string,
    public status: number,
    public message: string
  ) {
    super(`API Error [${endpoint}]: ${status} - ${message}`);
    this.name = 'ApiError';
  }
}

// ============================================================
// AUTH TOKEN
// ============================================================

async function getAuthToken(forceRefresh = false): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken(forceRefresh);
}

// ============================================================
// FETCH HELPERS
// ============================================================

/**
 * Clean request data by removing undefined values
 */
function cleanRequestData(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Generic fetch with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  data: any,
  retries = 1
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await getAuthToken(attempt > 0); // Force refresh token on retry

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      // If error is 401 Unauthorized, try with refreshed token
      if (response.status === 401 && attempt < retries) {
        continue;
      }

      // Parse error response
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMessage = errorText;
      }

      throw new ApiError(
        url.split('/').pop() || url,
        response.status,
        errorMessage
      );
    } catch (error) {
      lastError = error as Error;
      if (attempt === retries) {
        break;
      }
      // Exponential backoff before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new Error('Unknown error in fetchWithRetry');
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  data?: any
): Promise<T> {
  const cleanedData = data ? cleanRequestData(data) : {};

  console.log(`[API] ${endpoint}:`, cleanedData);

  try {
    const result = await fetchWithRetry<T>(endpoint, cleanedData);
    console.log(`[API] ${endpoint}: Success`);
    return result;
  } catch (error) {
    console.error(`[API] ${endpoint}:`, error);
    throw error;
  }
}

// ============================================================
// PATIENTS API
// ============================================================

/**
 * Get list of patients
 * @param organizationId - Filter by organization (optional)
 * @param options - Additional filters (status, search, limit)
 */
export async function getPatients(
  organizationId?: string,
  options?: { status?: string; search?: string; limit?: number }
): Promise<ApiPatient[]> {
  const requestData: any = {
    limit: options?.limit || 100,
  };

  if (options?.search) requestData.search = options.search;
  if (options?.status) requestData.status = options.status;
  if (organizationId) requestData.organizationId = organizationId;

  const response = await fetchApi<ApiResponse<ApiPatient[]>>(API_URLS.patients.list, requestData);
  return response.data || [];
}

/**
 * Get a single patient by ID
 */
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

/**
 * Create a new patient
 */
export async function createPatient(data: Partial<ApiPatient>): Promise<ApiPatient> {
  const response = await fetchApi<ApiResponse<ApiPatient>>(API_URLS.patients.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Update an existing patient
 */
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

/**
 * Delete (soft-delete) a patient
 */
export async function deletePatient(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.patients.delete, { patientId: id });
}

// ============================================================
// APPOINTMENTS API
// ============================================================

/**
 * Get list of appointments
 * @param organizationId - Filter by organization (optional)
 * @param options - Additional filters
 */
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
  const requestData: any = {
    limit: options?.limit || 100,
  };

  if (options?.dateFrom) requestData.dateFrom = options.dateFrom;
  if (options?.dateTo) requestData.dateTo = options.dateTo;
  if (options?.therapistId) requestData.therapistId = options.therapistId;
  if (options?.status) requestData.status = options.status;
  if (options?.patientId) requestData.patientId = options.patientId;
  if (organizationId) requestData.organizationId = organizationId;

  const response = await fetchApi<ApiResponse<ApiAppointment[]>>(API_URLS.appointments.list, requestData);
  return response.data || [];
}

/**
 * Get a single appointment by ID
 */
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

/**
 * Create a new appointment
 */
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

/**
 * Update an existing appointment
 */
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

/**
 * Cancel an appointment
 */
export async function cancelAppointment(id: string, reason?: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.appointments.cancel, {
    appointmentId: id,
    reason,
  });
}

// ============================================================
// EXERCISES API
// ============================================================

/**
 * Get list of exercises
 */
export async function getExercises(
  options?: { category?: string; difficulty?: string; search?: string; limit?: number }
): Promise<ApiExercise[]> {
  const requestData: any = {
    limit: options?.limit || 100,
  };

  if (options?.category) requestData.category = options.category;
  if (options?.difficulty) requestData.difficulty = options.difficulty;
  if (options?.search) requestData.search = options.search;

  const response = await fetchApi<ApiResponse<ApiExercise[]>>(API_URLS.exercises.list, requestData);
  return response.data || [];
}

/**
 * Get a single exercise by ID
 */
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

/**
 * Create a new exercise
 */
export async function createExercise(data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(API_URLS.exercises.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Update an existing exercise
 */
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

/**
 * Delete an exercise
 */
export async function deleteExercise(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.exercises.delete, { id });
}

// ============================================================
// BATCH OPERATIONS (for optimization)
// ============================================================

/**
 * Fetch multiple data sources in parallel
 */
export async function fetchDashboardData(organizationId?: string) {
  const [patients, appointments] = await Promise.all([
    getPatients(organizationId, { limit: 10 }).catch(() => []),
    getAppointments(organizationId, {
      therapistId: auth.currentUser?.uid,
      limit: 10,
    }).catch(() => []),
  ]);

  return { patients, appointments };
}

/**
 * Export for testing
 */
export const api = {
  patients: {
    list: getPatients,
    get: getPatientById,
    create: createPatient,
    update: updatePatient,
    delete: deletePatient,
  },
  appointments: {
    list: getAppointments,
    get: getAppointmentById,
    create: createAppointment,
    update: updateAppointment,
    cancel: cancelAppointment,
  },
  exercises: {
    list: getExercises,
    get: getExerciseById,
    create: createExercise,
    update: updateExercise,
    delete: deleteExercise,
  },
};
