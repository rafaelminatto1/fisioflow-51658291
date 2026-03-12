export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  imageUrl: string | null;
  videoUrl: string | null;
  musclesPrimary: string[];
  bodyParts: string[];
  equipment: string[];
  durationSeconds: number | null;
  description: string | null;
}

export interface ExerciseImageAnalysisResult {
  success: boolean;
  analysis?: {
    labels?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ExerciseCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  orderIndex: number;
}

export interface Protocol {
  id: string;
  slug: string | null;
  name: string;
  conditionName: string | null;
  protocolType: string;
  evidenceLevel: string | null;
  description: string | null;
  weeksTotal: number | null;
  tags: string[];
  icd10Codes: string[];
  wikiPageId?: string | null;
  milestones?: any[];
  restrictions?: any[];
  phases?: any[];
  progressionCriteria?: any[];
  references?: any[];
  clinicalTests?: string[];
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  viewCount: number;
  version: number;
  updatedAt: string;
}

export interface WikiPageFull extends WikiPage {
  content: string | null;
  htmlContent: string | null;
  parentId: string | null;
  isPublished: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  conditionName: string | null;
  templateVariant: string | null;
  clinicalNotes: string | null;
  contraindications: string | null;
  precautions: string | null;
  progressionNotes: string | null;
  evidenceLevel: 'A' | 'B' | 'C' | 'D' | null;
  bibliographicReferences: string[];
  isActive: boolean;
  isPublic: boolean;
  organizationId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTemplateItem {
  id: string;
  templateId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number | null;
  repetitions: number | null;
  duration: number | null;
  notes: string | null;
  weekStart: number | null;
  weekEnd: number | null;
  clinicalNotes: string | null;
  focusMuscles: string[];
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseTemplateRecord {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  conditionName?: string | null;
  templateVariant?: string | null;
  evidenceLevel?: string | null;
  items?: Array<{
    id: string;
    exerciseId: string;
    orderIndex?: number | null;
    sets?: number | null;
    repetitions?: number | null;
    duration?: number | null;
    notes?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  status: 'draft' | 'finalized' | 'cancelled';
  pain_level?: number;
  pain_location?: string;
  pain_character?: string;
  duration_minutes?: number;
  last_auto_save_at?: string;
  finalized_at?: string;
  finalized_by?: string;
  record_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  category: string;
  description?: string;
  storage_url?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AtestadoTemplateRecord {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContratoTemplateRecord {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  conteudo: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPatientRecord {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CommunicationLogRecord {
  id: string;
  organization_id: string;
  patient_id?: string | null;
  appointment_id?: string | null;
  type: 'email' | 'whatsapp' | 'sms' | 'push';
  recipient: string;
  subject?: string | null;
  body: string;
  status: 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falha';
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  patient?: CommunicationPatientRecord | null;
}

export interface CommunicationStatsRecord {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: {
    email: number;
    whatsapp: number;
    sms: number;
  };
}

export interface KnowledgeProfileSummary {
  full_name?: string;
  avatar_url?: string;
}

export interface KnowledgeSemanticResultRow {
  article_id: string;
  score: number;
}

export interface KnowledgeArticleRow {
  id: string;
  title: string;
  group: string;
  subgroup: string;
  focus: string[];
  evidence: string;
  year?: number;
  source?: string;
  url?: string;
  status: string;
  tags: string[];
  highlights: string[];
  observations: string[];
  keyQuestions: string[];
}

export interface KnowledgeAnnotationRow {
  id: string;
  article_id: string;
  organization_id: string;
  scope: 'organization' | 'user';
  user_id?: string;
  highlights: string[];
  observations: string[];
  status?: string;
  evidence?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCurationRow {
  id: string;
  article_id: string;
  organization_id: string;
  status: string;
  notes?: string;
  assigned_to?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeAuditRow {
  id: string;
  article_id: string;
  organization_id: string;
  actor_id: string;
  action: 'create_annotation' | 'update_annotation' | 'update_curation';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
  context?: Record<string, unknown>;
}

export interface PatientExamFile {
  id: string;
  exam_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_url?: string;
}

export interface PatientExam {
  id: string;
  patient_id: string;
  title: string;
  exam_date?: string;
  exam_type?: string;
  description?: string;
  created_at: string;
  files?: PatientExamFile[];
}

export interface MedicalRequestFile {
  id: string;
  medical_request_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_url?: string;
}

export interface MedicalRequest {
  id: string;
  patient_id: string;
  doctor_name?: string;
  request_date?: string;
  notes?: string;
  created_at: string;
  files?: MedicalRequestFile[];
}

export interface PatientGoal {
  id: string;
  patient_id: string;
  organization_id: string;
  description: string;
  target_date?: string;
  status: string;
  priority?: string;
  achieved_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PatientRow {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientStats {
  total_appointments: number;
  completed_appointments: number;
  missed_appointments: number;
  last_appointment_date: string | null;
  next_appointment_date: string | null;
}

export interface PatientMedicalRecord {
  id: string;
  patient_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PatientPhysicalExamination {
  id: string;
  patient_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PatientTreatmentPlan {
  id: string;
  patient_id: string;
  start_date: string;
  end_date: string | null;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PatientMedicalAttachment {
  id: string;
  patient_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface PatientSurgery {
  id: string;
  patient_id: string;
  surgery_name: string;
  surgery_date: string | null;
  surgeon_name: string | null;
  notes: string | null;
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  therapist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
}

export interface AppointmentsLastUpdated {
  last_updated_at: string | null;
}

// Additional types from workers-client.ts

export interface Sala {
  id: string;
  organization_id: string;
  nome: string;
  capacidade?: number;
  descricao?: string;
  cor?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Servico {
  id: string;
  organization_id: string;
  nome: string;
  descricao?: string;
  duracao?: number;
  valor?: number;
  cor?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contratado {
  id: string;
  organization_id?: string;
  nome: string;
  contato?: string | null;
  cpf_cnpj?: string | null;
  especialidade?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventoContratado {
  id: string;
  evento_id: string;
  contratado_id: string;
  funcao?: string | null;
  valor_acordado?: number | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  status_pagamento?: 'PENDENTE' | 'PAGO';
  created_at?: string;
  updated_at?: string;
}

export interface Participante {
  id: string;
  evento_id: string;
  nome: string;
  contato?: string | null;
  instagram?: string | null;
  segue_perfil?: boolean;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  id: string;
  evento_id: string;
  titulo: string;
  descricao: string | null;
  concluido: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Prestador {
  id: string;
  evento_id: string;
  nome: string;
  contato?: string | null;
  cpf_cnpj?: string | null;
  valor_acordado: number;
  status_pagamento: 'PENDENTE' | 'PAGO';
  created_at: string;
  updated_at: string;
}

export interface PrestadoresMetrics {
  count: number;
  last_updated_at: string | null;
}

export interface AuditLog {
  id: string;
  organization_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  changes?: unknown;
  ip_address?: string;
  created_at: string;
}

export interface PrecadastroToken {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  token: string;
  ativo: boolean;
  max_usos: number | null;
  usos_atuais: number;
  expires_at: string | null;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  created_at: string;
  updated_at?: string;
}

export interface Precadastro {
  id: string;
  token_id: string;
  organization_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: string;
  converted_at: string | null;
  patient_id: string | null;
  dados_adicionais: Record<string, unknown> | null;
  cpf?: string;
  convenio?: string;
  queixa_principal?: string;
  token_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalReportTemplateRecord {
  id: string;
  nome: string;
  descricao: string;
  tipo_relatorio: string;
  campos: string[];
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalReportRecord {
  id: string;
  patientId?: string;
  tipo_relatorio: string;
  paciente: Record<string, unknown>;
  profissional_emissor: Record<string, unknown>;
  profissional_destino?: Record<string, unknown>;
  clinica: Record<string, unknown>;
  historico_clinico?: Record<string, unknown>;
  avaliacao?: Record<string, unknown>;
  plano_tratamento?: Record<string, unknown>;
  evolucoes?: unknown[];
  resumo_tratamento?: string;
  conduta_sugerida?: string;
  recomendacoes?: string;
  data_emissao: string;
  urgencia?: string;
  relatorio_feito?: boolean;
  relatorio_enviado?: boolean;
}

export interface ConvenioReportRecord {
  id: string;
  patientId?: string;
  paciente: Record<string, unknown>;
  profissional: Record<string, unknown>;
  convenio: Record<string, unknown>;
  clinica: Record<string, unknown>;
  atendimentos: unknown[];
  observacoes?: string;
  evolucao?: string;
  prognostico?: string;
  conduta?: string;
  data_emissao: string;
}

export interface PublicBookingProfile {
  id: string;
  user_id: string;
  full_name: string;
  specialty?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  slug: string;
  organization_id?: string | null;
}

export interface PublicBookingRequestResult {
  id: string;
  status: string;
  created_at: string;
}

export interface ExerciseSessionRow {
  id: string;
  patient_id?: string;
  exercise_id?: string;
  exercise_type?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  repetitions: number;
  completed: boolean;
  metrics: Record<string, number>;
  posture_issues_summary: Record<string, number>;
  created_at: string;
}

export interface ExerciseSessionStats {
  total_sessions: string;
  total_reps: string;
  avg_score: string;
  last_session?: string;
}

export interface AIClinicalReport {
  summary: string;
  technical_analysis: string;
  patient_summary: string;
  confidence_overall_0_100: number;
  key_findings: Array<{ text: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  metrics_table_markdown: string;
  improvements: string[];
  still_to_improve: string[];
  suggested_exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    goal: string;
    progression: string;
    regression: string;
  }>;
  limitations: string[];
  red_flags_generic: string[];
  disclaimer: string;
}

export interface AITreatmentAssistantResult {
  suggestion?: string;
}

export interface AISessionTranscriptionResult {
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface AIDocumentAnalysisResult {
  extractedData: Record<string, unknown>;
  classification?: Record<string, unknown> | null;
  summary?: Record<string, unknown> | null;
  comparison?: Record<string, unknown> | null;
  translation?: Record<string, unknown> | null;
  tags?: Array<Record<string, unknown>>;
}

export interface DicomStudyRecord {
  [tag: string]: unknown;
}

export interface TarefaRow {
  id: string;
  organization_id: string;
  created_by: string;
  responsavel_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  tipo: string;
  data_vencimento: string | null;
  start_date: string | null;
  completed_at: string | null;
  order_index: number;
  tags: string[];
  checklists: unknown[];
  attachments: unknown[];
  references: unknown[];
  dependencies: unknown[];
  created_at: string;
  updated_at: string;
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface SatisfactionSurveyRow {
  id: string;
  organization_id: string;
  patient_id: string;
  appointment_id: string | null;
  therapist_id: string | null;
  nps_score: number | null;
  q_care_quality: number | null;
  q_professionalism: number | null;
  q_facility_cleanliness: number | null;
  q_scheduling_ease: number | null;
  q_communication: number | null;
  comments: string | null;
  suggestions: string | null;
  sent_at: string;
  responded_at: string | null;
  response_time_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyStatsRow {
  total: number;
  responded_count: number;
  response_rate: number;
  nps: number;
  promotores: number;
  neutros: number;
  detratores: number;
  avg_nps: number;
  avg_care_quality: number;
  avg_professionalism: number;
  avg_communication: number;
}

export interface WearableDataRow {
  id: string;
  organization_id: string;
  patient_id: string;
  source: string;
  data_type: string;
  value: number;
  unit: string | null;
  timestamp: string;
  created_at: string;
}

export interface DocumentSignatureRow {
  id: string;
  document_id: string;
  document_type: string;
  document_title: string;
  signer_name: string;
  signer_id: string | null;
  signature_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  created_at: string;
}

export interface TreatmentCycleRow {
  id: string;
  patient_id: string;
  therapist_id: string | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  goals: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EvolutionVersionRow {
  id: string;
  soap_record_id: string;
  saved_by: string;
  change_type: string;
  content: Record<string, unknown>;
  saved_at: string;
}

export interface ExercisePlanRow {
  id: string;
  patient_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  items?: ExercisePlanItemRow[];
}

export interface ExercisePlanItemRow {
  id: string;
  plan_id: string;
  exercise_id: string | null;
  order_index: number;
  sets: number | null;
  repetitions: number | null;
  duration: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
