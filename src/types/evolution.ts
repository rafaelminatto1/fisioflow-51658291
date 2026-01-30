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

// Additional types to replace `any` in evolution components
export type TimelineEventType = 'session' | 'surgery' | 'goal' | 'pathology' | 'measurement' | 'attachment';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  description?: string;
  data?: TimelineEventData;
  expanded?: boolean;
}

export type TimelineEventData =
  | SessionEventData
  | SurgeryEventData
  | GoalEventData
  | PathologyEventData
  | MeasurementEventData
  | AttachmentEventData;

export interface SessionEventData {
  sessionId: string;
  appointmentId?: string;
  soap: {
    subjective?: string;
    objective?: Record<string, unknown>;
    assessment?: string;
    plan?: Record<string, unknown>;
  };
  vitalSigns?: VitalSigns;
  exercises?: SessionExerciseData[];
  measurements?: MeasurementData[];
  attachments?: AttachmentData[];
  painLevel?: number;
  sessionNumber: number;
  createdBy: string;
  signedAt?: Date;
}

export interface SurgeryEventData {
  surgeryId: string;
  procedure: string;
  date: Date;
  surgeon?: string;
  hospital?: string;
  notes?: string;
  complications?: string;
  followUp?: string;
}

export interface GoalEventData {
  goalId: string;
  title: string;
  description: string;
  targetDate?: Date;
  status: 'pending' | 'in_progress' | 'achieved' | 'cancelled';
  category?: 'functional' | 'pain' | 'mobility' | 'strength' | 'other';
  progress?: number; // 0-100
  milestones?: MilestoneData[];
}

export interface PathologyEventData {
  pathologyId: string;
  name: string;
  code?: string; // ICD-10 code
  category: string;
  severity?: 'mild' | 'moderate' | 'severe';
  chronic: boolean;
  diagnosisDate?: Date;
  notes?: string;
  relatedConditions?: string[];
}

export interface MeasurementEventData {
  measurementId: string;
  location: string;
  value: number;
  unit: 'cm' | 'kg' | 'degrees' | 'score' | 'mmHg' | 'bpm';
  type: 'circumference' | 'range_of_motion' | 'strength' | 'vital_sign' | 'other';
  notes?: string;
  comparedTo?: {
    value: number;
    date: Date;
    difference: number;
  };
}

export interface AttachmentEventData {
  attachmentId: string;
  name: string;
  type: 'image' | 'pdf' | 'document' | 'video' | 'dicom';
  url: string;
  size: number;
  thumbnailUrl?: string;
  uploadedBy: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painLevel?: number; // 0-10 scale
}

export interface SessionExerciseData {
  exerciseId: string;
  exerciseName: string;
  setsCompleted: number;
  repsCompleted: number;
  weight?: number;
  duration?: number; // seconds
  restTime?: number; // seconds
  difficulty: 'easy' | 'adequate' | 'hard';
  observations?: string;
  side?: 'left' | 'right' | 'bilateral';
}

export interface MeasurementData {
  id: string;
  location: string;
  value: number;
  unit: string;
  type: string;
  timestamp?: Date;
  notes?: string;
}

export interface AttachmentData {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
}

export interface MilestoneData {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  achievedAt?: Date;
  status: 'pending' | 'achieved' | 'missed';
}

// For EvolutionHeader component
export interface EvolutionHeaderPatient {
  id: string;
  name: string;
  full_name?: string;
  birthDate: string;
  age?: number;
  gender: 'masculino' | 'feminino' | 'outro';
  photoUrl?: string;
  status?: string;
  mainCondition?: string;
}

export interface EvolutionHeaderAppointment {
  id: string;
  date: string;
  time: string;
  type?: string;
  status?: string;
}

// For drag and drop grid
export interface MeasurementTemplateField {
  id: string;
  name: string;
  location: string;
  unit: string;
  type: 'circumference' | 'range_of_motion' | 'strength' | 'vital_sign' | 'other';
  required?: boolean;
  defaultValue?: number;
  instructions?: string;
}

// For alerts
export interface EvolutionAlertData {
  id: string;
  type: 'overdue_goal' | 'upcoming_goal' | 'missed_session' | 'pain_increase' | 'plateau' | 'improvement';
  severity: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  relatedData?: Record<string, unknown>;
  createdAt: Date;
  dismissed?: boolean;
}

// Re-export existing types with aliases for common usage
export type { Surgery as SurgeryData, PatientGoal as GoalData, Pathology as PathologyData };
