export type ClinicalFieldType =
    | 'short_text'
    | 'long_text'
    | 'single_select'
    | 'multi_select'
    | 'list'
    | 'scale'
    | 'date'
    | 'time'
    | 'info';

export interface ClinicalForm {
    id: string;
    organization_id: string | null;
    user_id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClinicalFormField {
    id: string;
    form_id: string;
    type: ClinicalFieldType;
    label: string;
    placeholder?: string;
    options?: string[] | null; // For select/list types
    order: number;
    required: boolean;
    created_at?: string;
}

export interface ClinicalRecord {
    id: string;
    organization_id?: string;
    patient_id: string;
    form_id: string;
    professional_id: string;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
}
