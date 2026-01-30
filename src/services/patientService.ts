
import { patientsApi } from '@/integrations/firebase/functions';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { AppError } from '@/lib/errors/AppError';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { logger } from '@/lib/errors/logger';
import {
    getPatientName,
    type PatientDBStandard
} from '@/lib/constants/patient-queries';
import type { UnknownError } from '@/types/common';

// Extended patient DB record with optional gender
interface PatientDBExtended extends PatientDBStandard {
    gender?: string;
}

// Patient input for create/update operations
interface PatientInput {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birth_date?: string;
    gender?: string;
    observations?: string;
    status?: string;
    progress?: number;
    organization_id?: string;
}

// Service result wrapper
interface ServiceResult<T> {
    data: T | null;
    error: Error | null;
}

/**
 * Service to handle Patient business logic and data access
 */
export const PatientService = {
    /**
     * Map database patient record to application Patient type
     */
    mapToApp(dbPatient: PatientDBStandard | PatientDBExtended): Patient {
        const extendedPatient = dbPatient as PatientDBExtended;
        return {
            id: dbPatient.id,
            name: getPatientName(dbPatient),
            email: dbPatient.email ?? undefined,
            phone: dbPatient.phone ?? undefined,
            cpf: dbPatient.cpf ?? undefined,
            birthDate: dbPatient.birth_date ?? new Date().toISOString(),
            gender: extendedPatient.gender || 'outro',
            mainCondition: dbPatient.observations ?? '',
            status: (dbPatient.status === 'active' ? 'Em Tratamento' : 'Inicial'),
            progress: 0,
            incomplete_registration: dbPatient.incomplete_registration ?? false,
            createdAt: dbPatient.created_at ?? new Date().toISOString(),
            updatedAt: dbPatient.updated_at ?? new Date().toISOString(),
            organization_id: dbPatient.organization_id
        };
    },

    /**
     * Validate and map multiple patients from database
     */
    mapPatientsFromDB(dbPatients: PatientDBStandard[] | null | undefined): Patient[] {
        if (!dbPatients || dbPatients.length === 0) return [];

        const validPatients: Patient[] = [];

        for (const dbPatient of dbPatients) {
            try {
                const mapped = this.mapToApp(dbPatient);
                const result = PatientSchema.safeParse(mapped);

                if (result.success) {
                    validPatients.push(result.data);
                } else {
                    logger.warn(`Patient validation failed for ${dbPatient.id}`, { error: result.error }, 'PatientService');
                    // Fallback: use mapped object even if incomplete, to ensure it appears in UI
                    // We only strictly require ID and Name for the combobox
                    if (mapped.id && mapped.name) {
                        validPatients.push(mapped);
                    }
                }
            } catch (error) {
                ErrorHandler.handle(error, 'PatientService');
            }
        }

        return validPatients;
    },

    /**
     * Fetch active patients for an organization
     * Uses Firebase Cloud Functions API
     */
    async getActivePatients(organizationId: string): ServiceResult<Patient[]> {
        if (!organizationId) throw AppError.badRequest('Organization ID is required');

        try {
            logger.info('PatientService: fetching patients from Firebase Functions', { organizationId }, 'PatientService');
            // TEMP: Removendo filtro de status para debug
            const response = await patientsApi.list({ limit: 1000 });

            logger.debug('📊 [PatientService] Raw response', { response }, 'PatientService');
            logger.debug('📊 [PatientService] response.data', { data: response.data }, 'PatientService');
            logger.debug('📊 [PatientService] response.data type', { type: typeof response.data }, 'PatientService');
            logger.debug('📊 [PatientService] Is array?', { isArray: Array.isArray(response.data) }, 'PatientService');

            const patients = response.data || [];
            logger.info('PatientService: patients fetched from Firebase Functions', {
                count: patients.length,
                organizationId,
                hasData: Array.isArray(response.data),
            }, 'PatientService');

            return { data: patients, error: null };
        } catch (error: UnknownError) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('PatientService: error fetching patients from Firebase Functions', {
                error: errorMessage,
                organizationId,
                errorName: error instanceof Error ? error.name : 'Unknown',
            }, 'PatientService');
            return { data: [], error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Fetch a single patient by ID
     */
    async getPatientById(id: string): ServiceResult<Patient> {
        if (!id) throw AppError.badRequest('Patient ID is required');

        try {
            const response = await patientsApi.get(id);
            return { data: response.data, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Create a new patient
     */
    async createPatient(patient: PatientInput): ServiceResult<Patient> {
        try {
            const response = await patientsApi.create({
                ...patient,
                status: patient.status || 'active',
                progress: patient.progress || 0,
            });
            return { data: response.data, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Update a patient
     */
    async updatePatient(id: string, updates: Partial<PatientInput>): ServiceResult<Patient> {
        try {
            const response = await patientsApi.update(id, {
                ...updates,
                updated_at: new Date().toISOString(),
            });
            return { data: response.data, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Delete a patient
     */
    async deletePatient(id: string): ServiceResult<null> {
        try {
            await patientsApi.delete(id);
            return { data: null, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    }
};
