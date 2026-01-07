// Mapped to 'evaluation_forms' and 'evaluation_form_fields' tables

export type ClinicalFieldType =
    | 'texto_curto'
    | 'texto_longo'
    | 'opcao_unica' // single select
    | 'selecao' // multi select (or generic select)
    | 'lista'
    | 'escala' // Added support for scale
    | 'data' // Added support for date
    | 'hora' // Added support for time
    | 'info'; // Added support for info text

export interface EvaluationForm {
    id: string;
    organization_id: string | null;
    created_by?: string | null;
    nome: string; // title
    descricao?: string | null; // description
    tipo: string; // e.g., 'anamnese'
    ativo: boolean;
    created_at: string;
    updated_at: string;
    fields?: EvaluationFormField[];
}

export interface EvaluationFormField {
    id: string;
    form_id: string;
    tipo_campo: ClinicalFieldType;
    label: string;
    placeholder?: string | null;
    opcoes?: string[] | null; // stored as jsonb
    ordem: number;
    obrigatorio: boolean; // required
    created_at?: string;
}

export interface EvaluationFormWithFields extends EvaluationForm {
    fields: EvaluationFormField[];
}

// Helper to map UI types to DB types if needed, currently 1:1 mapped above where possible
