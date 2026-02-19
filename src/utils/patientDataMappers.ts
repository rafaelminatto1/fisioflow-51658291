import { Patient } from '@/types';

/**
 * Maps raw database/API patient data to the application's Patient interface.
 * Handles both snake_case (DB) and camelCase (App/API) input formats.
 * Provides safe defaults for required fields.
 *
 * @param data - The raw data object from API or DB
 * @returns A strictly typed Patient object
 */
export function mapPatientDBToApp(data: any): Patient {
    if (!data) {
        throw new Error('Cannot map null or undefined patient data');
    }

    // Extract ID (handle both potential locations if wrapper exists)
    const id = data.id || data.patientId || data.patient_id;
    if (!id) {
        console.warn('Mapping patient data without ID', data);
    }

    // Name resolution
    const name = data.full_name || data.name || 'Paciente Sem Nome';
    const fullName = data.full_name || data.name || name;

    // Date resolution
    const birthDate = data.birth_date || data.birthDate || '';

    return {
        ...data, // Spread original data to keep extra fields
        id: id || 'unknown-id',
        name,
        full_name: fullName,
        birthDate,
        birth_date: birthDate, // Keep for compatibility if needed

        // Ensure critical fields have defaults
        gender: data.gender || 'outro',
        mainCondition: data.mainCondition || 'Não informada',
        status: data.status || 'Em Tratamento',
        progress: typeof data.progress === 'number' ? data.progress : 0,

        // Handle contact info safely
        email: data.email || '',
        phone: data.phone || '',

        // Timestamps
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
    } as Patient;
}
