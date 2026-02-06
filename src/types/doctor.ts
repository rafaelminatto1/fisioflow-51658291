// Doctor Management Types

export interface Doctor {
    id: string;
    name: string; // Nome completo do médico (obrigatório)
    specialty?: string; // Especialidade médica
    crm?: string; // Número do CRM
    crm_state?: string; // Estado do CRM (ex: SP, RJ)
    phone?: string; // Telefone de contato
    email?: string; // Email
    clinic_name?: string; // Nome da clínica
    clinic_address?: string; // Endereço da clínica
    clinic_phone?: string; // Telefone da clínica
    notes?: string; // Observações gerais
    is_active: boolean; // Se o médico está ativo
    created_at: string;
    updated_at: string;
}

export type DoctorFormData = Omit<Doctor, 'id' | 'created_at' | 'updated_at' | 'is_active'>;

export interface DoctorAutocompleteOption {
    id: string;
    name: string;
    phone?: string;
    specialty?: string;
    clinic_name?: string;
}
