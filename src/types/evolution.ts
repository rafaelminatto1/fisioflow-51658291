// Evolution System Types

export interface Surgery {
  id: string;
  patient_id: string;
  surgery_name: string;
  surgery_date: string;
  affected_side: 'direito' | 'esquerdo' | 'bilateral' | 'nao_aplicavel';
  notes?: string;
  surgeon?: string;
  surgeon_name?: string;
  hospital?: string;
  surgery_type?: string;
  complications?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientGoal {
  id: string;
  patient_id: string;
  goal_title: string;
  goal_description?: string;
  category?: string;
  target_date?: string;
  target_value?: string;
  current_value?: string;
  current_progress: number;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'em_andamento' | 'concluido' | 'cancelado';
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Pathology {
  id: string;
  patient_id: string;
  pathology_name: string;
  cid_code?: string;
  diagnosis_date?: string;
  severity?: 'leve' | 'moderada' | 'grave';
  affected_region?: string;
  status: 'em_tratamento' | 'tratada' | 'cronica';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentTestConfig {
  id: string;
  pathology_name: string;
  test_name: string;
  test_type: string;
  frequency_sessions: number;
  is_mandatory: boolean;
  alert_level: 'critico' | 'importante' | 'leve';
  instructions?: string;
  min_value?: number;
  max_value?: number;
  unit?: string;
}

export interface TestResult {
  id: string;
  session_id: string;
  patient_id: string;
  test_name: string;
  test_type: string;
  value: number;
  unit?: string;
  notes?: string;
  measured_by: string;
  measured_at: string;
  created_at: string;
}

export interface TestEvolutionData {
  id: string;
  patient_id: string;
  test_name: string;
  date: string;
  value: number;
  unit?: string;
  session_number: number;
  variation?: number;
}

export interface TestStatistics {
  test_name: string;
  count: number;
  min_value: number;
  max_value: number;
  avg_value: number;
  last_value: number;
  first_value: number;
  total_variation: number;
  improvement_percentage: number;
}

export interface SessionEvolution {
  id: string;
  session_id: string;
  patient_id: string;
  session_date: string;
  session_number: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level?: number;
  evolution_notes?: string;
  test_results?: TestResult[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConductTemplate {
  id: string;
  patient_id: string;
  template_name: string;
  conduct_data: {
    plan: string;
    techniques?: string[];
    exercises?: string[];
    recommendations?: string;
  };
  created_by: string;
  created_at: string;
}

export interface MandatoryTestAlert {
  id: string;
  patient_id: string;
  session_number: number;
  test_config: AssessmentTestConfig;
  is_completed: boolean;
  exception_reason?: string;
  alert_level: 'critico' | 'importante' | 'leve';
}

export interface MedicalInsight {
  id: string;
  patient_id: string;
  insight_type: 'pain_reduction' | 'range_improvement' | 'strength_gain' | 'functional_milestone';
  insight_text: string;
  data_points: {
    initial_value: number;
    final_value: number;
    variation: number;
    percentage: number;
    period_days: number;
  };
  created_at: string;
}

// Form Data Types
export type SurgeryFormData = Omit<Surgery, 'id' | 'created_at' | 'updated_at'>;
export type PatientGoalFormData = Omit<PatientGoal, 'id' | 'created_at' | 'updated_at'>;
export type PathologyFormData = Omit<Pathology, 'id' | 'created_at' | 'updated_at'>;
export type SessionEvolutionFormData = Omit<SessionEvolution, 'id' | 'created_at' | 'updated_at'>;
