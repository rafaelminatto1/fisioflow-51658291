import { patientsApi } from '@/integrations/firebase/functions';
import { PatientSchema } from '@/schemas/patient';
import { AppError } from '@/lib/errors/AppError';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { Patient } from '@/types';
import { isValidCPF, isValidEmail, isValidPhone, stripNonDigits } from '@/utils/validators';
import {

    getPatientName,
    type PatientDBStandard
} from '@/lib/constants/patient-queries';

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

type PatientRecord = (PatientDBStandard | PatientDBExtended) & Record<string, unknown>;

const normalizeString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeBirthDate = (value: unknown): string | undefined => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
    }

    const str = normalizeString(value);
    if (!str) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().split('T')[0];
};

const normalizeIsoDateTime = (value: unknown): string => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }

    const str = normalizeString(value);
    if (!str) return new Date().toISOString();

    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
};

const normalizeGender = (value: unknown): 'masculino' | 'feminino' | 'outro' => {
    const raw = normalizeString(value)?.toLowerCase();
    if (!raw) return 'outro';

    if (raw === 'm' || raw === 'masculino' || raw === 'male' || raw === 'homem') {
        return 'masculino';
    }
    if (raw === 'f' || raw === 'feminino' || raw === 'female' || raw === 'mulher') {
        return 'feminino';
    }
    return 'outro';
};

const normalizeStatus = (value: unknown): string => {
    const raw = normalizeString(value)?.toLowerCase();
    if (!raw) return 'Inicial';

    if (['active', 'ativo', 'em tratamento', 'em_tratamento', 'in_progress'].includes(raw)) {
        return 'Em Tratamento';
    }
    if (['initial', 'inicial', 'inactive', 'inativo', 'novo'].includes(raw)) {
        return 'Inicial';
    }
    return String(value);
};

const normalizeProgress = (value: unknown): number => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
};

const normalizePhone = (value: unknown): string | undefined => {
    const str = normalizeString(value);
    if (!str) return undefined;
    return isValidPhone(str) ? str : undefined;
};

const normalizeCPF = (value: unknown): string | undefined => {
    const str = normalizeString(value);
    if (!str) return undefined;

    const digits = stripNonDigits(str);
    return isValidCPF(digits) ? digits : undefined;
};

const normalizeEmail = (value: unknown): string | undefined => {
    const str = normalizeString(value);
    if (!str) return undefined;
    return isValidEmail(str) ? str.toLowerCase() : undefined;
};

/**
 * Service to handle Patient business logic and data access
 */
export const PatientService = {
    /**
     * Map database patient record to application Patient type
     */
    mapToApp(dbPatient: PatientDBStandard | PatientDBExtended): Patient {
        const raw = dbPatient as PatientRecord;
        const fallbackName = getPatientName({
            full_name: normalizeString(raw.full_name),
            name: normalizeString(raw.name),
            phone: normalizeString(raw.phone),
        });
        const fullName = normalizeString(raw.full_name) || normalizeString(raw.name) || fallbackName || 'Sem nome';
        const birthDate = normalizeBirthDate(raw.birth_date);
        const createdAt = normalizeIsoDateTime(raw.created_at);
        const updatedAt = normalizeIsoDateTime(raw.updated_at);
        const mainCondition = normalizeString(raw.main_condition) || normalizeString(raw.observations) || '';

        return {
            id: String(raw.id),
            full_name: fullName,
            name: fullName,
            email: normalizeEmail(raw.email),
            phone: normalizePhone(raw.phone),
            cpf: normalizeCPF(raw.cpf),
            birthDate: birthDate || '',
            birth_date: birthDate,
            gender: normalizeGender(raw.gender),
            mainCondition,
            observations: normalizeString(raw.observations),
            status: normalizeStatus(raw.status),
            progress: normalizeProgress(raw.progress),
            incomplete_registration: Boolean(raw.incomplete_registration),
            createdAt,
            created_at: createdAt,
            updatedAt,
            updated_at: updatedAt
        };
    },

    /**
     * Validate and map multiple patients from database
     */
    mapPatientsFromDB(dbPatients: PatientDBStandard[] | Patient[] | null | undefined): Patient[] {
        if (!dbPatients || dbPatients.length === 0) return [];

        const normalizedPatients: Patient[] = [];
        const invalidPatientIds: string[] = [];

        for (const dbPatient of dbPatients) {
            try {
                const mapped = this.mapToApp(dbPatient as PatientDBStandard);
                const result = PatientSchema.safeParse({
                    id: mapped.id,
                    full_name: mapped.full_name || mapped.name,
                    name: mapped.name,
                    email: mapped.email ?? null,
                    phone: mapped.phone ?? null,
                    cpf: mapped.cpf ?? null,
                    birth_date: mapped.birth_date ?? null,
                    gender: mapped.gender,
                    main_condition: mapped.mainCondition || null,
                    status: mapped.status,
                    progress: mapped.progress,
                    incomplete_registration: mapped.incomplete_registration ?? false,
                    created_at: mapped.createdAt,
                    updated_at: mapped.updatedAt,
                    organization_id: normalizeString((dbPatient as PatientRecord).organization_id) ?? null,
                });

                if (result.success) {
                    normalizedPatients.push(mapped);
                } else {
                    if (mapped.id && mapped.name) {
                        normalizedPatients.push(mapped);
                        invalidPatientIds.push(mapped.id);
                    }
                }
            } catch (error) {
                ErrorHandler.handle(error, 'PatientService');
            }
        }

        if (invalidPatientIds.length > 0) {
            logger.warn('Patient validation failed for normalized legacy records', {
                invalidCount: invalidPatientIds.length,
                total: dbPatients.length,
                sampleIds: invalidPatientIds.slice(0, 10),
            }, 'PatientService');
        }

        return normalizedPatients;
    },

    /**
     * Fetch active patients for an organization
     * Uses Firebase Cloud Functions API
     */
    async getActivePatients(organizationId: string): Promise<ServiceResult<Patient[]>> {
        if (!organizationId) throw AppError.badRequest('Organization ID is required');

        try {
            logger.info('PatientService: fetching patients from Firebase Functions', { organizationId }, 'PatientService');
            // TEMP: Removendo filtro de status para debug
            const response = await patientsApi.list({ organizationId, limit: 1000 });

            logger.debug('📊 [PatientService] Raw response received', {
                count: response.data?.length,
                error: response.error
            }, 'PatientService');

            // Map from API model to domain model and validate
            const patientsRaw = response.data || [];
            const patients = this.mapPatientsFromDB(patientsRaw as PatientDBStandard[]);

            logger.info('PatientService: patients mapped and validated', {
                count: patients.length,
                organizationId
            }, 'PatientService');

            return { data: patients, error: null };
        } catch (error: UnknownError) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('PatientService: error fetching patients', {
                error: errorMessage,
                organizationId
            }, 'PatientService');
            return { data: [], error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Fetch a single patient by ID
     */
    async getPatientById(id: string): Promise<ServiceResult<Patient>> {
        if (!id) throw AppError.badRequest('Patient ID is required');

        try {
            const response = await patientsApi.get(id);
            const mapped = this.mapToApp(response as unknown);
            return { data: mapped, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Create a new patient
     */
    async createPatient(patient: PatientInput): Promise<ServiceResult<Patient>> {
        try {
            const response = await patientsApi.create({
                ...patient,
                name: patient.name || 'Sem Nome',
                status: patient.status || 'active',
                progress: patient.progress || 0,
            });
            const mapped = this.mapToApp(response as unknown);
            return { data: mapped, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Update a patient
     */
    async updatePatient(id: string, updates: Partial<PatientInput>): Promise<ServiceResult<Patient>> {
        try {
            const response = await patientsApi.update(id, {
                ...updates,
                updated_at: new Date().toISOString(),
            });
            const mapped = this.mapToApp(response as unknown);
            return { data: mapped, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    },

    /**
     * Delete a patient
     */
    async deletePatient(id: string): Promise<ServiceResult<null>> {
        try {
            await patientsApi.delete(id);
            return { data: null, error: null };
        } catch (error: UnknownError) {
            return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
        }
    }
};
