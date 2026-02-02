/**
 * Patient query constants
 * Centralized column definitions for patient queries to ensure consistency
 * and avoid selecting non-existent columns (like 'name' which should be 'full_name')
 *
 * DATABASE SCHEMA: patients table has 'full_name', NOT 'name'
 *
 * @module lib/constants/patient-queries
 */

// ==============================================================================
// COLUMN SELECTIONS
// ==============================================================================

/**
 * Minimal columns for patient selection (combobox, autocomplete)
 * Used when only basic info is needed
 */
export const PATIENT_COLUMNS_MINIMAL = [
  'id',
  'full_name',
  'incomplete_registration'
] as const;

/**
 * Standard columns for patient list views
 * Used in list views, autocomplete, etc.
 */
export const PATIENT_COLUMNS_STANDARD = [
  'id',
  'full_name',
  'phone',
  'email',
  'cpf',
  'birth_date',
  'observations',
  'status',
  'incomplete_registration',
  'created_at',
  'updated_at',
  'organization_id'
] as const;

/**
 * Extended columns for detailed patient views
 * Includes all standard columns plus additional fields
 */
export const PATIENT_COLUMNS_EXTENDED = [
  ...PATIENT_COLUMNS_STANDARD,
  'gender',
  'address',
  'city',
  'state',
  'zip_code',
  'health_insurance',
  'insurance_number',
  'emergency_contact',
  'emergency_phone',
  'blood_type',
  'allergies',
  'medications',
  'weight_kg',
  'height_cm',
  'marital_status',
  'profession',
  'education_level'
] as const;

/**
 * All columns (use sparingly, only when truly needed)
 */
export const PATIENT_COLUMNS_ALL = [
  ...PATIENT_COLUMNS_EXTENDED,
  'profile_id',
  'emergency_contact_relationship',
  'insurance_plan',
  'insurance_validity',
  'rg',
  'consent_data',
  'consent_image',
  'occupation',
  'referral_source',
  'alerts',
  'photo_url',
  'user_id'
] as const;

// ==============================================================================
// TYPE DEFINITIONS (derived from constants)
// ==============================================================================

/**
 * Type-safe patient column names
 */
export type PatientColumn =
  | typeof PATIENT_COLUMNS_MINIMAL[number]
  | typeof PATIENT_COLUMNS_STANDARD[number]
  | typeof PATIENT_COLUMNS_EXTENDED[number]
  | typeof PATIENT_COLUMNS_ALL[number];

/**
 * Minimal patient data from database
 */
export type PatientDBMinimal = {
  id: string;
  full_name: string;
  incomplete_registration?: boolean | null;
};

/**
 * Standard patient data from database
 */
export type PatientDBStandard = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  observations?: string | null;
  status?: string | null;
  incomplete_registration?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  organization_id?: string | null;
};

/**
 * Extended patient data from database
 */
export type PatientDBExtended = PatientDBStandard & {
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  health_insurance?: string | null;
  insurance_number?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  medications?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  marital_status?: string | null;
  profession?: string | null;
  education_level?: string | null;
};

// ==============================================================================
// JOIN HELPERS
// ==============================================================================

/**
 * Column selection for patient joins with appointments
 */
export const PATIENT_APPOINTMENT_JOIN = [
  'id',
  'full_name',
  'phone',
  'email'
] as const;

export type PatientDBAppointmentJoin = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
};

// ==============================================================================
// QUERY BUILDERS
// ==============================================================================

/**
 * Convert column array to comma-separated string for Supabase queries
 */
export function buildSelectQuery<T extends readonly string[]>(columns: T): string {
  return columns.join(',');
}

/**
 * Pre-built select queries for common use cases
 */
export const PATIENT_SELECT = {
  minimal: buildSelectQuery(PATIENT_COLUMNS_MINIMAL),
  standard: buildSelectQuery(PATIENT_COLUMNS_STANDARD),
  extended: buildSelectQuery(PATIENT_COLUMNS_EXTENDED),
  all: buildSelectQuery(PATIENT_COLUMNS_ALL),
  appointmentJoin: buildSelectQuery(PATIENT_APPOINTMENT_JOIN)
} as const;

/**
 * Type for select query keys
 */
export type PatientSelectQueryKey = keyof typeof PATIENT_SELECT;

// ==============================================================================
// VALIDATION
// ==============================================================================

/**
 * Columns that exist in the database schema
 * Use this to validate queries at development time
 */
export const VALID_PATIENT_COLUMNS = new Set<PatientColumn>([
  ...PATIENT_COLUMNS_ALL,
  'clinical_history_embedding',
  'insurance_info',
  'created_at',
  'updated_at'
] as const);

/**
 * Common mistakes - these columns do NOT exist in the patients table
 */
export const INVALID_PATIENT_COLUMNS = new Set([
  'name', // Use 'full_name' instead
  'nome', // Use 'full_name' instead
  'whatsapp', // Use 'phone' instead
  'first_name',
  'last_name',
  'patient_name'
] as const);

type InvalidPatientColumn = 'name' | 'nome' | 'whatsapp' | 'first_name' | 'last_name' | 'patient_name';

/**
 * Validate a select query string for invalid columns
 * @throws Error if invalid columns are detected
 *
 * @example
 * validatePatientSelectQuery('id, full_name, phone'); // OK
 * validatePatientSelectQuery('id, name, phone'); // Throws Error
 */
export function validatePatientSelectQuery(query: string): void {
  // Skip validation in production for performance
  if (process.env.NODE_ENV === 'production') return;

  const columns = query.split(',').map(c => c.trim());

  for (const column of columns) {
    // Extract base column name (handle aliases like 'name:full_name')
    const baseColumn = column.split(':')[0].trim();

    if (INVALID_PATIENT_COLUMNS.has(baseColumn as InvalidPatientColumn)) {
      throw new Error(
        `❌ Invalid patient column: '${column}'.\n` +
        `Column '${baseColumn}' does not exist in the patients table.\n` +
        `Did you mean 'full_name'?\n` +
        `Valid columns: ${Array.from(VALID_PATIENT_COLUMNS).join(', ')}`
      );
    }
  }
}

/**
 * Development-only validation wrapper
 * Validates queries only in development mode
 */
export const devValidate = (query: string): void => {
  if (process.env.NODE_ENV !== 'production') {
    validatePatientSelectQuery(query);
  }
};

// ==============================================================================
// DEFAULT VALUES & CONFIG
// ==============================================================================

/**
 * Default patient status values
 */
export const PATIENT_STATUS_VALUES = ['active', 'inactive', 'archived'] as const;

export type PatientStatus = typeof PATIENT_STATUS_VALUES[number];

/**
 * Default sort order for patient queries
 */
export const PATIENT_DEFAULT_ORDER = {
  column: 'full_name',
  ascending: true
} as const;

/**
 * Query configuration presets
 */
export const PATIENT_QUERY_CONFIG = {
  /** Standard cache time for patient queries */
  staleTime: 5 * 60 * 1000, // 5 minutes
  /** Extended cache time for individual patient data */
  staleTimeLong: 10 * 60 * 1000, // 10 minutes
  /** Query timeout */
  timeout: 10000, // 10 seconds
  /** Max retries for failed queries */
  maxRetries: 2,
} as const;

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Check if a column is a valid patient column
 */
export function isValidPatientColumn(column: string): column is PatientColumn {
  return VALID_PATIENT_COLUMNS.has(column as PatientColumn);
}

/**
 * Get a safe patient name with fallback
 * Supports both DB field full_name and API field name (e.g. listPatientsV2 returns name)
 */
export function getPatientName(patient: { full_name?: string | null; name?: string | null; phone?: string | null } | null | undefined): string {
  if (!patient) return 'Paciente';
  const p = patient as Record<string, unknown>;
  return patient.full_name || (p?.name != null ? String(p.name) : (patient.phone ? `Paciente (${patient.phone})` : 'Paciente sem nome'));
}

/**
 * Create a search filter for patient queries
 * Searches in full_name, email, and phone
 */
export function createPatientSearchFilter(searchTerm: string): string {
  const searchLower = searchTerm.trim().toLowerCase();
  return `full_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`;
}

/**
 * Build a patient query with common filters
 */
export interface PatientQueryFilters {
  organizationId?: string | null;
  status?: string | null;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Get select query based on requested columns
 */
export function getPatientSelect(columns?: PatientSelectQueryKey): string {
  return PATIENT_SELECT[columns || 'standard'];
}
