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
  partnerships: {
    list: CLOUD_RUN_BASE_URL('listPartnerships'),
    get: CLOUD_RUN_BASE_URL('getPartnership'),
    create: CLOUD_RUN_BASE_URL('createPartnership'),
    update: CLOUD_RUN_BASE_URL('updatePartnership'),
    delete: CLOUD_RUN_BASE_URL('deletePartnership'),
  },
  financial: {
    listRecords: CLOUD_RUN_BASE_URL('listPatientFinancialRecords'),
    getSummary: CLOUD_RUN_BASE_URL('getPatientFinancialSummaryV2'),
    createRecord: CLOUD_RUN_BASE_URL('createFinancialRecord'),
    updateRecord: CLOUD_RUN_BASE_URL('updateFinancialRecord'),
    deleteRecord: CLOUD_RUN_BASE_URL('deleteFinancialRecord'),
    markAsPaid: CLOUD_RUN_BASE_URL('markAsPaid'),
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
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAppointment {
  id: string;
  patientId?: string; // Client side or camelCase API
  patient_id?: string; // snake_case API
  patient_name?: string;
  therapistId?: string; // Client side or camelCase API
  therapist_id?: string; // snake_case API
  date: string;
  startTime?: string; // Client side or camelCase API
  start_time?: string; // snake_case API
  endTime?: string; // Client side or camelCase API
  end_time?: string; // snake_case API
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

export interface ApiPartnership {
  id: string;
  organization_id: string;
  name: string;
  cnpj?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  allows_barter: boolean;
  barter_description?: string;
  barter_sessions_limit?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiFinancialRecord {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id?: string;
  session_date: string;
  session_value: number;
  discount_value: number;
  discount_type?: 'percentage' | 'fixed' | 'partnership';
  partnership_id?: string;
  partnership?: {
    name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  };
  final_value: number;
  payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'transfer' | 'barter' | 'other';
  payment_status: 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded';
  paid_amount: number;
  paid_date?: string;
  notes?: string;
  is_barter: boolean;
  barter_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiFinancialSummary {
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
  total_value: number;
  total_paid: number;
  total_pending: number;
  average_session_value: number;
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

// ============================================================
// PARTNERSHIPS API
// ============================================================

/**
 * Get list of partnerships
 */
export async function getPartnerships(options?: {
  activeOnly?: boolean;
  limit?: number;
}): Promise<ApiPartnership[]> {
  const requestData: any = {
    limit: options?.limit || 100,
    activeOnly: options?.activeOnly ?? true,
  };

  const response = await fetchApi<ApiResponse<ApiPartnership[]>>(API_URLS.partnerships.list, requestData);
  return response.data || [];
}

/**
 * Get a single partnership by ID
 */
export async function getPartnershipById(id: string): Promise<ApiPartnership | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiPartnership>>(API_URLS.partnerships.get, {
      partnershipId: id,
    });
    return response.data || null;
  } catch {
    return null;
  }
}

/**
 * Create a new partnership
 */
export async function createPartnership(data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  const response = await fetchApi<ApiResponse<ApiPartnership>>(API_URLS.partnerships.create, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Update an existing partnership
 */
export async function updatePartnership(id: string, data: Partial<ApiPartnership>): Promise<ApiPartnership> {
  const response = await fetchApi<ApiResponse<ApiPartnership>>(API_URLS.partnerships.update, {
    partnershipId: id,
    ...data,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Delete a partnership
 */
export async function deletePartnership(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.partnerships.delete, { partnershipId: id });
}

// ============================================================
// PATIENT FINANCIAL RECORDS API
// ============================================================

/**
 * Get patient financial records
 */
export async function getPatientFinancialRecords(
  patientId: string,
  options?: { status?: string; limit?: number }
): Promise<ApiFinancialRecord[]> {
  const requestData: any = {
    patientId,
    limit: options?.limit || 100,
  };

  if (options?.status) requestData.status = options.status;

  const response = await fetchApi<ApiResponse<ApiFinancialRecord[]>>(API_URLS.financial.listRecords, requestData);
  return response.data || [];
}

/**
 * Get patient financial summary
 */
export async function getPatientFinancialSummary(patientId: string): Promise<ApiFinancialSummary | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiFinancialSummary>>(API_URLS.financial.getSummary, {
      patientId,
    });
    return response.data || null;
  } catch {
    return null;
  }
}

/**
 * Create a new financial record
 */
export async function createFinancialRecord(data: {
  patient_id: string;
  appointment_id?: string;
  session_date: string;
  session_value: number;
  payment_method?: string;
  payment_status?: string;
  paid_amount?: number;
  paid_date?: string;
  notes?: string;
  is_barter?: boolean;
  barter_notes?: string;
}): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>(API_URLS.financial.createRecord, data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Update a financial record
 */
export async function updateFinancialRecord(
  recordId: string,
  data: Partial<ApiFinancialRecord>
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>(API_URLS.financial.updateRecord, {
    recordId,
    ...data,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Delete a financial record
 */
export async function deleteFinancialRecord(recordId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(API_URLS.financial.deleteRecord, { recordId });
}

/**
 * Mark a financial record as paid
 */
export async function markFinancialRecordAsPaid(
  recordId: string,
  paymentMethod: string,
  paidDate?: string
): Promise<ApiFinancialRecord> {
  const response = await fetchApi<ApiResponse<ApiFinancialRecord>>(API_URLS.financial.markAsPaid, {
    recordId,
    payment_method: paymentMethod,
    paid_date: paidDate,
  });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}
