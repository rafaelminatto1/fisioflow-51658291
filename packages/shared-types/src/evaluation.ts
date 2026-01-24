export interface EvaluationTemplate {
  id: string;
  professionalId: string;
  name: string;
  description?: string;
  fields: EvaluationField[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'measurement';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  unit?: string;
  defaultValue?: any;
}

export interface Evaluation {
  id: string;
  patientId: string;
  professionalId: string;
  templateId?: string;
  date: Date;
  type: 'initial' | 'followup' | 'discharge';
  data: Record<string, any>;
  notes?: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}
