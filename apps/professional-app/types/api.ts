export interface ApiPatient {
  id: string;
  name: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string;
  gender?: string;
  main_condition?: string;
  observations?: string;
  status: string;
  progress?: number;
  incomplete_registration?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAppointment {
  id: string;
  patient_id: string;
  patientId?: string;
  patient_name?: string;
  therapist_id: string;
  therapistId?: string;
  organization_id?: string;
  organizationId?: string;
  date: string;
  start_time: string;
  startTime?: string;
  end_time: string;
  endTime?: string;
  status: string;
  type?: string;
  notes?: string;
  is_group?: boolean;
  isGroup?: boolean;
  additional_names?: string;
  additionalNames?: string;
  is_unlimited?: boolean;
  isUnlimited?: boolean;
  session_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiExercise {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  instructions?: string[];
  category?: string;
  categoryId?: string;
  categoryName?: string;
  difficulty?: string;
  video_url?: string;
  videoUrl?: string;
  image_url?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  musclesPrimary?: string[];
  bodyParts?: string[];
  equipment?: string[];
  durationSeconds?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface ApiExerciseCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  orderIndex: number;
}

export interface ApiEvolution {
  id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id?: string;
  date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  pain_level?: number;
  attachments?: string[];
  observations?: string;
  exercises_performed?: unknown[];
  pain_level_before?: number;
  pain_level_after?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiConversation {
  id: string;
  participantId: string;
  participantIds?: string[];
  participantName: string;
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt?: string;
}

export interface ApiMessage {
  id: string;
  sender_id: string;
  senderId?: string;
  recipient_id: string;
  recipientId?: string;
  content: string;
  type?: string;
  attachment_url?: string | null;
  attachmentUrl?: string | null;
  attachment_name?: string | null;
  attachmentName?: string | null;
  status?: string | null;
  read_at?: string | null;
  readAt?: string | null;
  created_at: string;
  createdAt?: string;
}

export type TarefaStatus =
  | 'BACKLOG'
  | 'A_FAZER'
  | 'EM_PROGRESSO'
  | 'REVISAO'
  | 'CONCLUIDO'
  | 'ARQUIVADO';

export type TarefaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type TarefaTipo =
  | 'TAREFA'
  | 'REUNIAO'
  | 'MELHORIA'
  | 'DOCUMENTACAO'
  | 'FEATURE'
  | 'BUG';

export interface ApiTarefaChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ApiTarefaChecklist {
  id: string;
  title: string;
  items: ApiTarefaChecklistItem[];
}

export interface ApiTarefa {
  id: string;
  titulo: string;
  descricao?: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  tipo?: TarefaTipo | null;
  data_vencimento?: string | null;
  start_date?: string | null;
  completed_at?: string | null;
  progress?: number | null;
  tags?: string[];
  checklists?: ApiTarefaChecklist[];
  attachments?: unknown[];
  references?: unknown[];
  task_references?: unknown[];
  dependencies?: unknown[];
  responsavel_id?: string | null;
  project_id?: string | null;
  parent_id?: string | null;
  board_id?: string | null;
  column_id?: string | null;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPartnership {
  id: string;
  name: string;
  description?: string | null;
  active?: boolean;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDashboardStats {
  activePatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

export interface ApiLead {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  origem?: string | null;
  estagio: 'aguardando' | 'contatado' | 'interessado' | 'agendado' | 'convertido' | 'perdido';
  responsavel_id: string;
  data_primeiro_contato?: string | null;
  data_ultimo_contato?: string | null;
  interesse?: string | null;
  observacoes?: string | null;
  motivo_nao_efetivacao?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiLeadHistory {
  id: string;
  lead_id: string;
  tipo_contato: string;
  descricao?: string | null;
  resultado?: string | null;
  proximo_contato?: string | null;
  created_by: string;
  created_at: string;
}

export interface ApiTelemedicineRoom {
  id: string;
  patient_id: string;
  therapist_id?: string | null;
  appointment_id?: string | null;
  room_code: string;
  status: 'aguardando' | 'ativo' | 'encerrado';
  meeting_url?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  patients?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
  meta?: Record<string, unknown>;
}
