export type QuestionType = 'text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'scale' | 'date' | 'body_map';

export interface AssessmentTemplate {
    id: string;
    title: string;
    type: 'anamnesis' | 'physical_exam' | 'evolution' | 'pilates';
    description?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    organization_id: string;
    is_active: boolean;
    sections: AssessmentSection[];
}

export interface AssessmentSection {
    id: string;
    template_id: string;
    title: string;
    order_index: number;
    description?: string;
    questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
    id: string;
    section_id: string;
    type: QuestionType;
    question_text: string;
    order_index: number;
    required: boolean;
    options?: string[]; // For choice types
    scale_config?: {
        min: number;
        max: number;
        labels?: { [key: number]: string };
    };
    body_map_config?: {
        image_url?: string;
        points?: { x: number; y: number; label: string }[];
    };
}

export interface PatientAssessment {
    id: string;
    patient_id: string;
    template_id: string;
    appointment_id?: string;
    status: 'draft' | 'completed';
    conducted_by: string;
    assessment_date: string;
    created_at: string;
    updated_at: string;
    responses: AssessmentResponse[];
}

export interface AssessmentResponse {
    id: string;
    assessment_id: string;
    question_id: string;
    value: any; // Dependent on question type
    notes?: string;
}
