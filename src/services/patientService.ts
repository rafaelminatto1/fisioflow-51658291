
import { patientsApi } from '@/integrations/firebase/functions';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { AppError } from '@/lib/errors/AppError';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { logger } from '@/lib/errors/logger';
import {
    getPatientName,
    type PatientDBStandard
} from '@/lib/constants/patient-queries';

/**
 * Service to handle Patient business logic and data access
 */
export const PatientService = {
    /**
     * Map database patient record to application Patient type
     */
    mapToApp(dbPatient: PatientDBStandard): Patient {
        return {
            id: dbPatient.id,
            name: getPatientName(dbPatient),
            email: dbPatient.email ?? undefined,
            phone: dbPatient.phone ?? undefined,
            cpf: dbPatient.cpf ?? undefined,
            birthDate: dbPatient.birth_date ?? new Date().toISOString(),
            gender: (dbPatient as any).gender || 'outro', // Use DB value if exists (cast to any for extended compatibility)
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
                    console.warn(`Patient validation failed for ${dbPatient.id}:`, result.error);
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
    async getActivePatients(organizationId: string) {
        if (!organizationId) throw AppError.badRequest('Organization ID is required');

        try {
            logger.info('PatientService: fetching patients from Firebase Functions', { organizationId }, 'PatientService');
            // TEMP: Removendo filtro de status para debug
            const response = await patientsApi.list({ limit: 1000 });

            console.log('📊 [PatientService] Raw response:', response);
            console.log('📊 [PatientService] response.data:', response.data);
            console.log('📊 [PatientService] response.data type:', typeof response.data);
            console.log('📊 [PatientService] Is array?:', Array.isArray(response.data));

            const patients = response.data || [];
            logger.info('PatientService: patients fetched from Firebase Functions', {
                count: patients.length,
                organizationId,
                hasData: Array.isArray(response.data),
            }, 'PatientService');

            return { data: patients, error: null };
        } catch (error: any) {
            logger.error('PatientService: error fetching patients from Firebase Functions', {
                error: error?.message || error,
                organizationId,
                errorName: error?.name,
            }, 'PatientService');
            return { data: [], error };
        }
    },

    /**
     * Fetch a single patient by ID
     */
    async getPatientById(id: string) {
        if (!id) throw AppError.badRequest('Patient ID is required');

        try {
            const response = await patientsApi.get(id);
            return { data: response.data, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Create a new patient
     */
    async createPatient(patient: any) {
        try {
            const response = await patientsApi.create({
                ...patient,
                status: patient.status || 'active',
                progress: patient.progress || 0,
            });
            return { data: response.data, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Update a patient
     */
    async updatePatient(id: string, updates: any) {
        try {
            const response = await patientsApi.update(id, {
                ...updates,
                updated_at: new Date().toISOString(),
            });
            return { data: response.data, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Delete a patient
     */
    async deletePatient(id: string) {
        try {
            await patientsApi.delete(id);
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    }
};
