/**
 * Domain Models for Cloud Functions
 * 
 * Local version of shared types for the functions environment.
 */

export interface Exercise {
    id: string;
    name: string;
    category: string;
    description?: string;
    tags?: string[];
    difficulty?: 'facil' | 'medio' | 'dificil' | 'beginner' | 'intermediate' | 'advanced';
    videoUrl?: string;
    relevanceScore?: number;
}

export interface Evolution {
    id: string;
    patientId: string;
    professionalId: string;
    painLevel?: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Appointment {
    id: string;
    patientId: string;
    professionalId: string;
    date: string; // ISO string
    status: string;
    type?: string;
    notes?: string;
}

export interface Patient {
    id: string;
    name: string;
    cpf?: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    gender?: string;
    main_condition?: string;
    status?: string;
    progress?: number;
    is_active: boolean;
    organization_id: string;
    address?: any;
    emergency_contact?: any;
    medical_history?: string;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    user_id: string;
    organization_id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    role: string;
    crefito?: string;
    specialties?: string[];
    bio?: string;
    birth_date?: string;
    is_active: boolean;
    last_login_at?: string;
    email_verified: boolean;
    preferences?: any;
    created_at: string;
    updated_at: string;
}

export interface PatientInsights {
    painTrend: 'improving' | 'stable' | 'worsening';
    adherenceRate: number;
    progressRate: number;
    recommendations: string[];
    riskFactors: string[];
}

export interface MedicalRecord {
    id: string;
    patient_id: string;
    created_by: string;
    organization_id: string;
    type: string;
    title: string;
    content?: string;
    record_date: string;
    created_at: string;
    updated_at: string;
}

export interface TreatmentSession {
    id: string;
    patient_id: string;
    therapist_id: string;
    appointment_id?: string;
    organization_id: string;
    pain_level_before?: number;
    pain_level_after?: number;
    observations?: string;
    evolution?: string;
    next_session_goals?: string;
    session_date: string;
    created_at: string;
    updated_at: string;
}

export interface PainRecord {
    id: string;
    patient_id: string;
    pain_level: number;
    pain_type: string;
    body_part: string;
    notes?: string;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    patient_id: string;
    appointment_id?: string;
    amount_cents: number;
    method: string;
    payment_date: string;
    status: string;
    notes?: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface PatientSessionPackage {
    id: string;
    patient_id: string;
    sessions_count: number;
    sessions_used: number;
    amount_cents: number;
    purchase_date: string;
    valid_until?: string;
    is_active: boolean;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

// Assessment Types
export interface AssessmentTemplate {
    id: string;
    name: string;
    description?: string;
    category: string;
    is_global: boolean;
    display_order: number;
    is_active: boolean;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface AssessmentSection {
    id: string;
    template_id: string;
    title: string;
    order: number;
    is_active: boolean;
    questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
    id: string;
    section_id: string;
    question_text: string;
    answer_type: string;
    options?: any;
    order: number;
    is_active: boolean;
}

export interface PatientAssessment {
    id: string;
    patient_id: string;
    template_id: string;
    title: string;
    assessment_date: string;
    performed_by: string;
    status: string;
    conclusion?: string;
    recommendations?: string;
    next_assessment_date?: string;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface AssessmentResponse {
    id: string;
    assessment_id: string;
    question_id: string;
    answer_text?: string;
    answer_number?: number;
    answer_json?: any;
    created_at: string;
}

// Financial Transaction
export interface Transaction {
    id: string;
    tipo: 'receita' | 'despesa';
    descricao?: string;
    valor: number;
    status: string;
    metadata?: any;
    organization_id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface Doctor {
    id: string;
    organization_id: string;
    created_by: string;
    name: string;
    specialty?: string;
    crm?: string;
    crm_state?: string;
    phone?: string;
    email?: string;
    clinic_name?: string;
    clinic_address?: string;
    clinic_phone?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
