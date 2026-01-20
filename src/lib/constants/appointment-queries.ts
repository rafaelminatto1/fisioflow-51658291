/**
 * Appointment query constants
 * Centralized column definitions for appointment queries to ensure consistency
 *
 * @module lib/constants/appointment-queries
 */

// ==============================================================================
// COLUMN SELECTIONS
// ==============================================================================

/**
 * Standard columns for appointment selection
 */
export const APPOINTMENT_COLUMNS_STANDARD = [
    'id',
    'patient_id',
    'therapist_id',
    'appointment_date',
    'appointment_time',
    'duration',
    'type',
    'status',
    'room',
    'notes',
    'organization_id',
    'created_at',
    'updated_at',
    'date',
    'start_time',
    'end_time',
    'session_type'
] as const;

/**
 * Type-safe appointment column names
 */
export type AppointmentColumn = typeof APPOINTMENT_COLUMNS_STANDARD[number];

/**
 * Standard appointment data from database
 */
export type AppointmentDBStandard = {
    id: string;
    patient_id: string;
    therapist_id: string;
    appointment_date: string;
    appointment_time: string;
    duration?: number | null;
    type?: string | null;
    status?: string | null;
    room?: string | null;
    notes?: string | null;
    organization_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    session_type?: string | null;
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
export const APPOINTMENT_SELECT = {
    standard: buildSelectQuery(APPOINTMENT_COLUMNS_STANDARD),
} as const;

/**
 * Type for select query keys
 */
export type AppointmentSelectQueryKey = keyof typeof APPOINTMENT_SELECT;

// ==============================================================================
// VALIDATION
// ==============================================================================

/**
 * Columns that exist in the database schema
 */
export const VALID_APPOINTMENT_COLUMNS = new Set<AppointmentColumn>(APPOINTMENT_COLUMNS_STANDARD);

/**
 * Common mistakes
 */
export const INVALID_APPOINTMENT_COLUMNS = new Set([
    'patientId',
    'therapistId',
    'appointmentDate',
    'appointmentTime'
] as const);

/**
 * Validate a select query string for invalid columns
 */
export function validateAppointmentSelectQuery(query: string): void {
    if (process.env.NODE_ENV === 'production') return;

    const columns = query.split(',').map(c => c.trim());

    for (const column of columns) {
        const baseColumn = column.split(':')[0].trim();

        if (INVALID_APPOINTMENT_COLUMNS.has(baseColumn as any)) {
            throw new Error(
                `❌ Invalid appointment column: '${column}'.\n` +
                `Column '${baseColumn}' does not exist in the appointments table (use snake_case).\n` +
                `Valid columns include: ${Array.from(VALID_APPOINTMENT_COLUMNS).slice(0, 10).join(', ')}...`
            );
        }
    }
}

/**
 * Development-only validation wrapper
 */
export const devValidateAppointment = (query: string): void => {
    if (process.env.NODE_ENV !== 'production') {
        validateAppointmentSelectQuery(query);
    }
};
