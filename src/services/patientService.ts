
import { supabase } from '@/integrations/supabase/client';
import { PatientSchema, type Patient } from '@/schemas/patient';
import { AppError } from '@/lib/errors/AppError';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import {
    PATIENT_SELECT,
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
            full_name: dbPatient.full_name, // Explicitly map full_name
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
     */
    async getActivePatients(organizationId: string) {
        if (!organizationId) throw AppError.badRequest('Organization ID is required');

        const query = supabase
            .from('patients')
            .select<string, PatientDBStandard>(PATIENT_SELECT.standard)
            // Filter by active statuses in the application (matching database values)
            .in('status', ['active', 'Inicial', 'Em Tratamento', 'Recuperação', 'Concluído'])
            .eq('organization_id', organizationId);

        return query.order('full_name', { ascending: true });
    },

    /**
     * Fetch a single patient by ID
     */
    async getPatientById(id: string) {
        if (!id) throw AppError.badRequest('Patient ID is required');

        const { data, error } = await supabase
            .from('patients')
            .select<string, PatientDBStandard>(PATIENT_SELECT.standard)
            .eq('id', id)
            .maybeSingle();

        if (error) throw AppError.internal(error.message);
        return { data };
    },

    /**
     * Create a new patient
     */
    async createPatient(patient: any) {
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                ...patient,
                status: patient.status || 'active',
                progress: patient.progress || 0,
            }])
            .select()
            .single();

        if (error) throw AppError.internal(error.message);
        return { data };
    },

    /**
     * Update a patient
     */
    async updatePatient(id: string, updates: any) {
        const { data, error } = await supabase
            .from('patients')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw AppError.internal(error.message);
        return { data };
    },

    /**
     * Delete a patient
     */
    async deletePatient(id: string) {
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw AppError.internal(error.message);
        return { error: null };
    }
};
