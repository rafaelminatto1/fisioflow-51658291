/**
 * Database Schema Documentation
 *
 * This file contains documentation for the database schema.
 * Keep this in sync with the actual Supabase migrations.
 *
 * @module database/schema
 */

// ============================================================================
// TABLE: PATIENTS
// ============================================================================

/**
 * Patients table schema
 *
 * @description
 * Stores patient information for the physiotherapy clinic.
 *
 * @example
 * ```typescript
 * // Query active patients
 * const { data } = await supabase
 *   .from('patients')
 *   .select('*')
 *   .eq('organization_id', orgId)
 *   .in('status', [PATIENT_STATUS.ACTIVE]);
 * ```
 */
export const PATIENTS_TABLE_SCHEMA = {
  /** Primary key - UUID */
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',

  /** Organization this patient belongs to */
  organization_id: 'UUID REFERENCES organizations(id)',

  /** Patient's full name (renamed from 'name' for consistency) */
  full_name: 'TEXT NOT NULL',

  /** Legacy 'name' column - use full_name instead */
  name: 'TEXT (deprecated)',

  /** Contact information */
  email: 'TEXT',
  phone: 'TEXT',
  cpf: 'TEXT',

  /** Personal information */
  birth_date: 'DATE',
  observations: 'TEXT',

  /** Status: active | inactive | archived (English - legacy) */
  status: "TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'))",

  /** Registration tracking */
  incomplete_registration: 'BOOLEAN DEFAULT false',

  /** Timestamps */
  created_at: 'TIMESTAMPTZ DEFAULT now()',
  updated_at: 'TIMESTAMPTZ DEFAULT now()',
} as const;

// ============================================================================
// TABLE: APPOINTMENTS
// ============================================================================

/**
 * Appointments table schema
 *
 * @description
 * Stores appointment/schedule information.
 *
 * @example
 * ```typescript
 * // Query upcoming confirmed appointments
 * const { data } = await supabase
 *   .from('appointments')
 *   .select('*')
 *   .gte('date', new Date().toISOString())
 *   .in('status', [APPOINTMENT_STATUS.AGENDADO, APPOINTMENT_STATUS.CONFIRMADO]);
 * ```
 */
export const APPOINTMENTS_TABLE_SCHEMA = {
  /** Primary key */
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',

  /** References */
  patient_id: 'UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL',
  therapist_id: 'UUID REFERENCES profiles(id) ON DELETE SET NULL',

  /** Schedule information */
  date: 'DATE NOT NULL',
  start_time: 'TIME NOT NULL',
  end_time: 'TIME',
  duration: 'INTEGER DEFAULT 60',

  /** Appointment details */
  type: 'TEXT NOT NULL',
  status: "TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'falta'))",

  /** Additional information */
  notes: 'TEXT',
  room: 'TEXT',

  /** Payment tracking */
  payment_status: 'TEXT',
  cancellation_reason: 'TEXT',

  /** Notifications */
  reminder_sent: 'BOOLEAN DEFAULT false',

  /** Timestamps */
  created_at: 'TIMESTAMPTZ DEFAULT now()',
  updated_at: 'TIMESTAMPTZ DEFAULT now()',
} as const;

// ============================================================================
// TABLE: SESSIONS
// ============================================================================

/**
 * Sessions table schema
 *
 * @description
 * Stores treatment session records (SOAP notes, measurements, etc).
 *
 * @example
 * ```typescript
 * // Query completed sessions
 * const { data } = await supabase
 *   .from('sessions')
 *   .select('*')
 *   .eq('patient_id', patientId)
 *   .eq('status', SESSION_STATUS.COMPLETED);
 * ```
 */
export const SESSIONS_TABLE_SCHEMA = {
  /** Primary key */
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',

  /** References */
  patient_id: 'UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL',
  therapist_id: 'UUID REFERENCES profiles(id) ON DELETE SET NULL',
  appointment_id: 'UUID REFERENCES appointments(id) ON DELETE SET NULL',

  /** Session details */
  session_number: 'INTEGER',
  session_date: 'DATE',
  status: "TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed'))",

  /** SOAP notes */
  subjective: 'TEXT',
  objective: 'TEXT',
  assessment: 'TEXT',
  plan: 'TEXT',

  /** Measurements */
  pain_level: 'INTEGER CHECK (pain_level BETWEEN 0 AND 10)',

  /** Timestamps */
  created_at: 'TIMESTAMPTZ DEFAULT now()',
  updated_at: 'TIMESTAMPTZ DEFAULT now()',
} as const;

// ============================================================================
// TABLE: PATIENT_PATHOLOGIES
// ============================================================================

/**
 * Patient pathologies table schema
 *
 * @description
 * Stores patient pathologies/conditions being treated.
 *
 * @example
 * ```typescript
 * // Query active pathologies
 * const { data } = await supabase
 *   .from('patient_pathologies')
 *   .select('*')
 *   .eq('patient_id', patientId)
 *   .eq('status', PATHOLOGY_STATUS.EM_TRATAMENTO);
 * ```
 */
export const PATIENT_PATHOLOGIES_TABLE_SCHEMA = {
  /** Primary key */
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',

  /** References */
  patient_id: 'UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL',

  /** Pathology details */
  pathology_name: 'TEXT NOT NULL',
  diagnosis_date: 'DATE',

  /** Status: em_tratamento | tratada | cronica (Portuguese) */
  status: "TEXT NOT NULL DEFAULT 'em_tratamento' CHECK (status IN ('em_tratamento', 'tratada', 'cronica'))",

  /** Additional notes */
  notes: 'TEXT',

  /** Timestamps */
  created_at: 'TIMESTAMPTZ DEFAULT now()',
  updated_at: 'TIMESTAMPTZ DEFAULT now()',
} as const;

// ============================================================================
// TABLE: PAYMENTS
// ============================================================================

/**
 * Payments table schema
 *
 * @description
 * Stores payment records for appointments and sessions.
 *
 * @example
 * ```typescript
 * // Query paid payments
 * const { data } = await supabase
 *   .from('payments')
 *   .select('*')
 *   .eq('status', PAYMENT_STATUS.PAID)
 *   .gte('paid_at', startDate);
 * ```
 */
export const PAYMENTS_TABLE_SCHEMA = {
  /** Primary key */
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',

  /** References */
  patient_id: 'UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL',
  appointment_id: 'UUID REFERENCES appointments(id) ON DELETE SET NULL',

  /** Payment details */
  amount: 'NUMERIC(10, 2) NOT NULL',
  status: "TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded'))",

  /** Payment information */
  payment_method: 'TEXT',
  payment_date: 'DATE',
  paid_at: 'TIMESTAMPTZ',

  /** Additional information */
  notes: 'TEXT',

  /** Timestamps */
  created_at: 'TIMESTAMPTZ DEFAULT now()',
  updated_at: 'TIMESTAMPTZ DEFAULT now()',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database table names
 */
export type DatabaseTable =
  | 'patients'
  | 'appointments'
  | 'sessions'
  | 'patient_pathologies'
  | 'payments'
  | 'profiles'
  | 'organizations'
  | 'soap_records'
  | 'medical_records'
  | 'evolution_measurements'
  | 'patient_goals'
  | 'patient_surgeries'
  | 'conduct_library'
  | 'exercises';

/**
 * Common query patterns for the database
 */
export const QueryPatterns = {
  /**
   * Get active patients for an organization
   */
  activePatients: (organizationId: string) => ({
    table: 'patients' as const,
    select: '*',
    filter: {
      organization_id: organizationId,
      status: 'active',
    },
  }),

  /**
   * Get upcoming appointments for a patient
   */
  upcomingAppointments: (patientId: string, fromDate: Date = new Date()) => ({
    table: 'appointments' as const,
    select: '*',
    filter: {
      patient_id: patientId,
      date: `gte.${fromDate.toISOString()}`,
      status: 'in.(agendado,confirmado)',
    },
  }),

  /**
   * Get completed sessions for a patient
   */
  completedSessions: (patientId: string) => ({
    table: 'sessions' as const,
    select: '*',
    filter: {
      patient_id: patientId,
      status: 'completed',
    },
  }),

  /**
   * Get active pathologies for a patient
   */
  activePathologies: (patientId: string) => ({
    table: 'patient_pathologies' as const,
    select: '*',
    filter: {
      patient_id: patientId,
      status: 'em_tratamento',
    },
  }),

  /**
   * Get paid payments within a date range
   */
  paidPayments: (startDate: string, endDate: string) => ({
    table: 'payments' as const,
    select: '*',
    filter: {
      status: 'paid',
      paid_at: `gte.${startDate}&lte.${endDate}`,
    },
  }),
} as const;
