export interface PaginatedResponse<T> {
	data: T[];
	meta: { page: number; limit: number; total: number; pages: number };
}

export interface Exercise {
	id: string;
	slug: string;
	name: string;
	categoryId: string;
	difficulty: "iniciante" | "intermediario" | "avancado";
	imageUrl: string | null;
	thumbnailUrl: string | null;
	videoUrl: string | null;
	musclesPrimary: string[];
	bodyParts: string[];
	equipment: string[];
	durationSeconds: number | null;
	duration?: number | null;
	description: string | null;
	sets?: number | null;
	repetitions?: number | null;
	indicated_pathologies?: string[] | null;
	contraindicated_pathologies?: string[] | null;
	scientific_references?: string | null;
	aliasesPt?: string[] | null;
	aliasesEn?: string[] | null;
	dictionaryId?: string | null;
	progressionSuggestion?: string | null;
	suggestedSets?: string | null;
	suggestedReps?: string | null;
	suggestedRpe?: string | null;
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

export type PatientProfileCategory =
	| 'ortopedico'
	| 'esportivo'
	| 'pos_operatorio'
	| 'prevencao'
	| 'idosos';

export interface ExerciseTemplate {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	conditionName: string | null;
	difficultyLevel?: string | null;
	treatmentPhase?: string | null;
	bodyPart?: string | null;
	estimatedDuration?: number | null;
	templateVariant: string | null;
	clinicalNotes: string | null;
	contraindications: string | null;
	precautions: string | null;
	progressionNotes: string | null;
	evidenceLevel: "A" | "B" | "C" | "D" | null;
	bibliographicReferences: string[];
	isActive: boolean;
	isPublic: boolean;
	organizationId: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
	templateType: 'system' | 'custom';
	patientProfile: PatientProfileCategory | null;
	sourceTemplateId: string | null;
	isDraft: boolean;
	exerciseCount: number;
	items?: ExerciseTemplateItem[];
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
	exercise?: {
		id: string;
		name: string;
		description?: string | null;
		category?: string | null;
		difficulty?: string | null;
		imageUrl?: string | null;
		thumbnailUrl?: string | null;
		videoUrl?: string | null;
	};
}

export interface ExerciseTemplateRecord {
	id: string;
	name: string;
	description?: string | null;
	category?: string | null;
	conditionName?: string | null;
	difficultyLevel?: string | null;
	treatmentPhase?: string | null;
	bodyPart?: string | null;
	estimatedDuration?: number | null;
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
	status: "draft" | "finalized" | "cancelled";
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
	dre_categoria?: string | null;
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
	dre_categoria?: string | null;
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
	type: "email" | "whatsapp" | "sms" | "push";
	recipient: string;
	subject?: string | null;
	body: string;
	status: "pendente" | "enviado" | "entregue" | "lido" | "falha";
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
		push: number;
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
	scope: "organization" | "user";
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
	action: "create_annotation" | "update_annotation" | "update_curation";
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
	name?: string | null;
	email: string | null;
	phone: string | null;
	cpf: string | null;
	birth_date: string | null;
	date_of_birth: string | null;
	gender: string | null;
	nickname: string | null;
	social_name: string | null;
	address: string | null;
	status: string;
	main_condition: string | null;
	is_active: boolean;
	progress: number | null;
	notes: string | null;
	avatar_url: string | null;
	medical_return_date?: string | null;
	created_at: string;
	updated_at: string;
	mainCondition?: string | null;
	origin?: string | null;
	referred_by?: string | null;
	referredBy?: string | null;
	professional_id?: string | null;
	professionalId?: string | null;
	professional_name?: string | null;
	professionalName?: string | null;
	health_insurance?: string | null;
	care_profiles?: string[] | null;
	careProfiles?: string[] | null;
	sports_practiced?: string[] | null;
	sportsPracticed?: string[] | null;
	therapy_focuses?: string[] | null;
	therapyFocuses?: string[] | null;
	payer_model?: string | null;
	payerModel?: string | null;
	partner_company_name?: string | null;
	partnerCompanyName?: string | null;
	pathology_names?: string[] | null;
	pathologyNames?: string[] | null;
	active_pathology_names?: string[] | null;
	activePathologyNames?: string[] | null;
	primary_pathology?: string | null;
	primaryPathology?: string | null;
	pathology_statuses?: string[] | null;
	pathologyStatuses?: string[] | null;
	has_surgery?: boolean;
	hasSurgery?: boolean;
	recent_surgery?: boolean;
	recentSurgery?: boolean;
	classification?: "active" | "new_patient" | "at_risk" | "completed" | null;
	financial_status?:
		| "current"
		| "pending_balance"
		| "in_collection"
		| "credit"
		| "uninvoiced"
		| null;
	financialStatus?:
		| "current"
		| "pending_balance"
		| "in_collection"
		| "credit"
		| "uninvoiced"
		| null;
	sessions_completed?: number | null;
	sessionsCompleted?: number | null;
	total_appointments?: number | null;
	totalAppointments?: number | null;
	no_show_count?: number | null;
	noShowCount?: number | null;
	upcoming_appointments_count?: number | null;
	upcomingAppointmentsCount?: number | null;
	last_appointment_date?: string | null;
	lastAppointmentDate?: string | null;
	next_appointment_date?: string | null;
	nextAppointmentDate?: string | null;
	open_balance?: number | null;
	openBalance?: number | null;
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

export interface TherapistSummary {
	id: string;
	full_name: string;
	name?: string;
	role?: string;
	specialty: string | null;
	avatar_url: string | null;
	birth_date?: string | null;
	active?: boolean;
}

export interface FinancialMetric {
	total: number;
	paid: number;
	pending: number;
	overdue: number;
}

export interface Transacao {
	id: string;
	organization_id: string;
	tipo: "receita" | "despesa";
	valor: number;
	data_transacao: string;
	descricao: string | null;
	dre_categoria?: string | null;
	status: "concluido" | "pendente" | "cancelado";
	created_at?: string;
	updated_at?: string;
}

export interface ContaFinanceira {
	id: string;
	valor: number;
	data_vencimento: string;
	pago_em?: string | null;
	tipo: "receita" | "despesa";
	status: "pendente" | "pago" | "atrasado";
}

export interface Pagamento {
	id: string;
	appointment_id?: string;
	valor: number;
	data_pagamento: string;
	metodo_pagamento: string | null;
	status?: string;
}

export interface CentroCusto {
	id: string;
	nome: string;
	ativo: boolean;
}

export interface Convenio {
	id: string;
	nome: string;
	ativo: boolean;
}

export interface EmpresaParceira {
	id: string;
	nome: string;
	ativo: boolean;
}

export interface Fornecedor {
	id: string;
	nome: string;
	ativo: boolean;
}

export interface FormaPagamento {
	id: string;
	nome: string;
	ativo: boolean;
}

export type AppointmentPaymentStatus = "pending" | "paid" | "partial" | "refunded";

export interface AppointmentRow {
	id: string;
	patient_id: string;
	therapist_id: string;
	date: string;
	start_time: string;
	end_time: string;
	status: string;
	notes: string | null;
	payment_status: AppointmentPaymentStatus | null;
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
	status_pagamento?: "PENDENTE" | "PAGO";
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
	dre_categoria?: string | null;
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
	status_pagamento: "PENDENTE" | "PAGO";
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
	dre_categoria?: string | null;
	token: string;
	ativo: boolean;
	max_usos: number | null;
	usos_atuais: number;
	expires_at: string | null;
	campos_obrigatorios: string[];
	campos_opcionais: string[];
	ui_style?: Record<string, any>;
	created_at: string;
	updated_at?: string;
}

export interface EvolutionMeasurementRecord {
	id: string;
	patient_id: string;
	evolution_id: string;
	name: string;
	value: number;
	unit?: string | null;
	side?: "left" | "right" | "bilateral" | null;
	created_at: string;
	updated_at: string;
}

export interface TreatmentSessionRecord {
	id: string;
	patient_id: string;
	therapist_id: string;
	date: string;
	status: string;
	notes?: string | null;
	created_at: string;
	updated_at: string;
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

export interface Notification {
	id: string;
	user_id: string;
	title: string;
	message: string;
	type: string;
	read: boolean;
	data?: Record<string, any>;
	created_at: string;
}

export interface GamificationNotification extends Notification {
	points?: number;
	badge_id?: string;
	level_up?: boolean;
}

export interface NotificationPreferences {
	user_id: string;
	email: boolean;
	push: boolean;
	whatsapp: boolean;
	marketing: boolean;
}

export interface ClinicalTestTemplateRecord {
	id: string;
	organization_id?: string | null;
	name: string;
	name_en?: string | null;
	category: string | null;
	target_joint: string | null;
	type: "special_test" | "functional_test";
	purpose: string | null;
	instructions: string | null;
	execution?: string | null;
	positive_criteria: string | null;
	positive_sign?: string | null;
	fields_definition: any[];
	tags: string[];
	image_url?: string | null;
	initial_position_image_url?: string | null;
	final_position_image_url?: string | null;
	media_urls?: string[] | null;
	aliases_pt?: string[] | null;
	aliases_en?: string[] | null;
	dictionary_id?: string | null;
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
	key_findings: Array<{ text: string; confidence: "HIGH" | "MEDIUM" | "LOW" }>;
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

export interface TarefaRow {
	id: string;
	organization_id: string;
	created_by: string;
	responsavel_id: string | null;
	project_id: string | null;
	parent_id: string | null;
	titulo: string;
	descricao: string | null;
	dre_categoria?: string | null;
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

export interface GoalProfileRow {
	id: string;
	organization_id: string;
	name: string;
	description: string | null;
	category_id: string | null;
	is_global: boolean;
	created_at: string;
	updated_at: string;
}

export interface FeriadoRow {
	id: string;
	organization_id: string;
	date: string;
	name: string;
	type: string;
}

export interface AutomationLogEntry {
	id: string;
	organization_id: string;
	automation_id: string;
	event_type: string;
	status: string;
	created_at: string;
}

export interface PushSubscription {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	created_at: string;
}

export interface WhatsAppMessage {
	id: string;
	organization_id: string;
	phone_number: string;
	message_content: string;
	status: string;
	created_at: string;
}

export interface PendingConfirmation {
	id: string;
	phone_number: string;
	last_message: string;
	created_at: string;
}

export interface WhatsAppTemplateRecord {
	id: string;
	organization_id?: string;
	name: string;
	template_key?: string;
	content: string;
	variables?: string[];
	category?: string;
	status: string;
	created_at?: string;
	updated_at?: string;
}

export interface WhatsAppWebhookLog {
	id: string;
	payload: Record<string, unknown>;
	created_at: string;
}

export interface Lead {
	id: string;
	organization_id: string;
	name: string;
	status: string;
}

export interface LeadHistorico {
	id: string;
	lead_id: string;
	notes: string;
	created_at: string;
}

export interface CrmTarefa {
	id: string;
	lead_id: string;
	title: string;
	status: string;
}

export interface CrmCampanha {
	id: string;
	name: string;
	status: string;
}

export interface PainMap {
	id: string;
	patient_id: string;
	created_at: string;
}

export interface PainMapPoint {
	id: string;
	pain_map_id: string;
	x: number;
	y: number;
}

export interface EvolutionTemplate {
	id: string;
	name: string;
	content: string;
	aliases_pt?: string[];
	aliases_en?: string[];
	dictionary_id?: string;
}

export interface ConductLibraryRecord {
	id: string;
	name: string;
	description: string;
}

export interface ExercisePrescription {
	id: string;
	patient_id: string;
	status: string;
}

export interface PrescribedExercise {
	id: string;
	exercise_id: string;
	sets: number;
	reps: number;
}

export interface StandardizedTestResultRow {
	id: string;
	test_name: string;
	score: number;
}

export interface EvaluationFormRow {
	id: string;
	organization_id?: string | null;
	created_by?: string | null;
	nome: string;
	name?: string;
	descricao?: string | null;
	referencias?: string | null;
	tipo?: string;
	ativo?: boolean;
	is_favorite?: boolean;
	usage_count?: number;
	last_used_at?: string | null;
	cover_image?: string | null;
	estimated_time?: number | null;
	created_at?: string;
	updated_at?: string;
}

export interface EvaluationFormFieldRow {
	id: string;
	form_id: string;
	tipo_campo?: string;
	label: string;
	placeholder?: string | null;
	opcoes?: unknown[] | null;
	ordem?: number;
	obrigatorio?: boolean;
	grupo?: string | null;
	descricao?: string | null;
	minimo?: number | null;
	maximo?: number | null;
	created_at?: string;
	updated_at?: string;
}

export interface EvaluationFormWithFieldsRow extends EvaluationFormRow {
	fields?: EvaluationFormFieldRow[];
}

export type PatientEvaluationResponseStatus =
	| "scheduled"
	| "in_progress"
	| "completed"
	| "cancelled";

export interface PatientEvaluationResponseRow {
	id: string;
	organization_id: string | null;
	patient_id: string;
	form_id: string;
	appointment_id?: string | null;
	responses: Record<string, unknown>;
	status: PatientEvaluationResponseStatus;
	scheduled_for?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
	created_by?: string | null;
	created_at: string;
	updated_at: string;
	form_nome?: string | null;
	form_tipo?: string | null;
	form_descricao?: string | null;
	form_referencias?: string | null;
	fields_count?: number;
	answered_count?: number;
	form?: Partial<EvaluationFormRow>;
	fields?: EvaluationFormFieldRow[];
}

export interface AssetAnnotationVersionRecord {
	id: string;
	asset_id: string;
	version: number;
}

export interface Evento {
	id: string;
	name: string;
}

export interface EventoTemplateRow {
	id: string;
	name: string;
}

export interface TelemedicineRoomRecord {
	id: string;
	room_name: string;
}

export interface SessionAttachment {
	id: string;
	session_id: string;
	file_url: string;
}

export interface SessionTemplate {
	id: string;
	name: string;
}

export interface DoctorRecord {
	id: string;
	name: string;
}

// ─── Gamification Row types (DB-layer) ───────────────────────────────────────

export interface GamificationProfileRow {
	id: string;
	patient_id: string;
	organization_id?: string;
	current_xp: number;
	level: number;
	current_streak: number;
	longest_streak: number;
	total_points: number;
	last_activity_date: string | null;
	created_at: string;
	updated_at: string;
}

export interface StaffPerformanceMetric {
	id: string;
	organization_id: string;
	therapist_id: string;
	therapist_name?: string;
	total_appointments: number;
	rebook_rate: number;
	metric_date: string;
}

export interface PatientPrediction {
	id: string;
	patient_id: string;
	no_show_probability: number;
	risk_factors: string[];
	recommended_actions: string[] | null;
	prediction_date: string;
	created_at: string;
}

export interface RevenueForecast {
	id: string;
	forecast_date: string;
	predicted_revenue: number;
	actual_revenue?: number;
}

export interface PatientSelfAssessment {
	id: string;
	patient_id: string;
	pain_level: number;
	mobility_score: number;
	recovery_perception: number;
	notes?: string;
	created_at: string;
}

export interface DailyQuestRow {
	id: string;
	patient_id: string;
	quest_id?: string;
	date: string;
	quests_data?: unknown[];
	completed?: boolean;
	completed_at?: string | null;
	completed_count?: number;
	xp_awarded?: number;
	created_at: string;
	updated_at: string;
}

export interface AchievementRow {
	id: string;
	code?: string;
	title: string;
	description: string | null;
	xp_reward: number;
	icon?: string | null;
	category?: string;
	requirements?: unknown;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface AchievementLogRow {
	id: string;
	patient_id: string;
	achievement_id: string;
	xp_reward: number;
	unlocked_at: string;
}

export interface XpTransactionRow {
	id: string;
	patient_id: string;
	amount: number;
	reason: string;
	description?: string | null;
	created_at: string;
	created_by?: string | null;
}

export interface GamificationLeaderboardRow {
	patient_id: string;
	patient_name?: string;
	full_name?: string | null;
	email?: string | null;
	avatar_url?: string | null;
	level: number;
	total_points: number;
	current_streak?: number;
	longest_streak?: number;
	achievements_count?: number;
	last_activity_date?: string | null;
	rank?: number;
}

export interface ShopItemRow {
	id: string;
	code?: string;
	name: string;
	description: string | null;
	cost?: number;
	price?: number;
	type?: string;
	item_type?: string;
	icon?: string | null;
	metadata?: Record<string, unknown>;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface UserInventoryRow {
	id: string;
	user_id?: string;
	patient_id?: string;
	item_id: string;
	quantity: number;
	is_equipped?: boolean;
	equipped?: boolean;
	acquired_at?: string;
	item_name?: string | null;
	item_code?: string;
	item_description?: string | null;
	item_cost?: number | null;
	item_type?: string | null;
	item_icon?: string | null;
}

export interface GamificationSettingRow {
	id?: string;
	key: string;
	value: unknown;
	description?: string | null;
	updated_at?: string;
}

export interface GamificationStats {
	totalPatients?: number;
	total_players?: number;
	active_players?: number;
	totalXpAwarded: number;
	total_xp_awarded?: number;
	averageLevel: number;
	avg_level?: number;
	averageStreak?: number;
	activeLast30Days?: number;
	activeLast7Days?: number;
	achievementsUnlocked: number;
	engagementRate?: number;
	atRiskPatients?: number;
	top_players?: GamificationLeaderboardRow[];
}

export interface AtRiskPatient {
	patient_id: string;
	patient_name?: string;
	name?: string; // Alias
	full_name?: string | null;
	email?: string | null;
	level?: number;
	lastActivity?: string;
	last_activity_date?: string | null;
	daysInactive?: number;
	days_inactive?: number;
	days_since_last?: number; // Alias
	risk_score?: number;
	avg_frequency?: number;
	status?: string;
}

export interface PopularAchievement {
	id?: string;
	achievement_id?: string;
	title: string | null;
	unlockedCount?: number;
	unlock_count?: number;
	totalPatients?: number;
	unlockRate?: number;
}

export interface QuestDefinitionRow {
	id: string;
	title: string;
	description?: string | null;
	category?: string;
	quest_type?: string;
	xp_reward: number;
	icon?: string | null;
	target?: Record<string, unknown> | null;
	is_active?: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface WeeklyChallengeRow {
	id: string;
	title: string;
	description?: string | null;
	target?: Record<string, unknown> | null;
	xp_reward: number;
	point_reward?: number;
	challenge_type?: string;
	start_date: string;
	end_date: string;
	is_active?: boolean;
	patient_progress?: PatientChallengeRow | null;
	created_at?: string;
	updated_at?: string;
}

export interface PatientChallengeRow {
	id?: string;
	patient_id?: string;
	challenge_id: string;
	progress: number;
	completed: boolean;
	completed_at?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface DashboardResponse {
	data: {
		appointmentsToday: number;
		pendingEvolutions: number;
		whatsappConfirmationsPending: number;
		financialToday: {
			received: number;
			projected: number;
		};
		revenueChart: Array<{
			date: string;
			revenue: number;
		}>;
		engagementScore: number;
		noShowRate: number;
		activePatients?: number;
		monthlyRevenue?: number;
		patientsAtRisk?: number;
	};
}

export interface FinancialReportResponse {
	data: {
		summary: {
			totalRevenue: number;
			totalExpenses: number;
			netProfit: number;
			pendingPayments: number;
		};
		details: Array<{
			category: string;
			amount: number;
			percentage: number;
		}>;
	};
}

export interface AnalyticsExerciseUsage {
	exercise_id: string;
	name: string;
	usage_count: number;
}

export interface AnalyticsPainRegion {
	region: string;
	count: number;
	avg_intensity: number;
}

export interface IntelligentReportRecord {
	id: string;
	patient_id: string;
	type: string;
	status: string;
	created_at: string;
}

export interface IntelligentReportResponse {
	id: string;
	type: string;
	content: string;
	generated_at: string;
}

export interface PatientEvolutionPoint {
	date: string;
	value: number;
	label: string;
}

export interface PatientProgressSummary {
	adherence_rate: number;
	improvement_percentage: number;
	next_milestone?: string;
}

export interface PatientLifecycleEvent {
	id: string;
	patient_id: string;
	event_type: string;
	event_date: string;
	notes?: string;
}

export interface PatientOutcomeMeasure {
	id: string;
	patient_id: string;
	measure_type: string;
	measure_name: string;
	score: number;
	measurement_date: string;
}

export interface PatientSessionMetrics {
	id: string;
	session_id?: string;
	pain_before?: number;
	pain_after?: number;
	duration_minutes?: number;
}

export interface PatientRiskScore {
	patient_id: string;
	risk_score: number;
	factors: string[];
}

export interface PatientInsight {
	id: string;
	type: string;
	message: string;
	priority: "low" | "medium" | "high";
	acknowledged: boolean;
}

export interface PatientGoalTracking {
	id: string;
	description: string;
	target_value?: number;
	current_value?: number;
	status: string;
}

export interface ClinicalBenchmark {
	id: string;
	metric_name: string;
	category: string;
	average_value: number;
}

export interface MLTrainingData {
	id: string;
	patient_id: string;
	features: Record<string, unknown>;
	label: unknown;
}

export interface MlTrainingStats {
	total_records: number;
	model_accuracy: number;
}

export interface MlTrainingPatientRecord {
	id: string;
	patient_name: string;
	last_train_date: string;
}

export interface PopulationHealthResponse {
	total_patients: number;
	prevalent_conditions: Array<{ name: string; count: number }>;
}

export interface InventoryItemRow {
	id: string;
	name: string;
	quantity: number;
	min_quantity?: number;
}

export interface InventoryMovementRow {
	id: string;
	item_id: string;
	type: "in" | "out";
	quantity: number;
}

export interface WhatsAppExerciseQueueRow {
	id: string;
	patient_id: string;
	exercise_id: string;
	scheduled_at: string;
	status: "pending" | "sent" | "failed";
}

export interface GeneratedReport {
	id: string;
	organization_id: string;
	patient_id: string;
	report_type: string;
	report_content: string;
	date_range_start?: string | null;
	date_range_end?: string | null;
	created_by?: string | null;
	created_at: string;
}
