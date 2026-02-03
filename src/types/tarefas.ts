/**
 * Enhanced Task Types for FisioFlow Task Management
 * Inspired by Trello, Monday.com, and Microsoft Project
 */

export type TarefaStatus = 'BACKLOG' | 'A_FAZER' | 'EM_PROGRESSO' | 'REVISAO' | 'CONCLUIDO' | 'ARQUIVADO';
export type TarefaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TarefaTipo = 'TAREFA' | 'BUG' | 'FEATURE' | 'MELHORIA' | 'DOCUMENTACAO' | 'REUNIAO';

export interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export interface TarefaMention {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  position?: number; // Position in description where mention was made
}

export interface TarefaAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link' | 'image' | 'video' | 'document';
  size?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface TarefaReference {
  id: string;
  title: string;
  url?: string;
  author?: string;
  year?: string;
  type: 'article' | 'book' | 'website' | 'video' | 'internal' | 'other';
  description?: string;
  created_at: string;
}

export interface TarefaChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  due_date?: string;
  assignee_id?: string;
}

export interface TarefaChecklist {
  id: string;
  title: string;
  items: TarefaChecklistItem[];
}

export interface TarefaComment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  mentions?: TarefaMention[];
  attachments?: TarefaAttachment[];
  created_at: string;
  updated_at?: string;
  reactions?: Record<string, string[]>; // emoji -> user_ids
}

export interface TarefaActivity {
  id: string;
  type: 'created' | 'updated' | 'moved' | 'assigned' | 'commented' | 'attachment_added' | 'checklist_completed' | 'due_date_changed' | 'priority_changed';
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface TarefaTimeTracking {
  estimated_hours?: number;
  logged_hours: number;
  entries: {
    id: string;
    user_id: string;
    hours: number;
    description?: string;
    date: string;
  }[];
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  descricao_html?: string; // Rich text HTML version
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  tipo: TarefaTipo;

  // Dates
  created_at: string;
  updated_at: string;
  start_date?: string;
  data_vencimento?: string;
  hora_vencimento?: string;
  completed_at?: string;

  // Organization
  organization_id?: string;
  project_id?: string;
  parent_id?: string;
  order_index: number;

  // People
  created_by?: string;
  responsavel_id?: string;
  responsavel?: TeamMember;
  assignees?: TeamMember[]; // Multiple assignees support
  watchers?: string[]; // User IDs watching this task

  // Labels & Tags
  tags: string[];
  color?: string; // Card color
  cover_image?: string; // Card cover image

  // Checklists
  checklists?: TarefaChecklist[];

  // Attachments & References
  attachments?: TarefaAttachment[];
  references?: TarefaReference[];
  mentions?: TarefaMention[];

  // Dependencies
  dependencies?: string[]; // IDs of tasks that must be completed before this one
  blocked_by?: string[];
  blocks?: string[];

  // Comments & Activity
  comments?: TarefaComment[];
  activities?: TarefaActivity[];
  comment_count?: number;

  // Time Tracking
  time_tracking?: TarefaTimeTracking;

  // Custom Fields
  custom_fields?: Record<string, unknown>;

  // Progress (0-100)
  progress?: number;
}

export const STATUS_LABELS: Record<TarefaStatus, string> = {
  BACKLOG: 'Backlog',
  A_FAZER: 'A Fazer',
  EM_PROGRESSO: 'Em Progresso',
  REVISAO: 'Revisão',
  CONCLUIDO: 'Concluído',
  ARQUIVADO: 'Arquivado'
};

export const STATUS_COLORS: Record<TarefaStatus, { bg: string; text: string; dot: string }> = {
  BACKLOG: { bg: 'bg-gray-500/10', text: 'text-gray-500', dot: 'bg-gray-400' },
  A_FAZER: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-400' },
  EM_PROGRESSO: { bg: 'bg-blue-500/10', text: 'text-blue-500', dot: 'bg-blue-400' },
  REVISAO: { bg: 'bg-purple-500/10', text: 'text-purple-500', dot: 'bg-purple-400' },
  CONCLUIDO: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-400' },
  ARQUIVADO: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', dot: 'bg-zinc-400' }
};

export const PRIORIDADE_LABELS: Record<TarefaPrioridade, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente'
};

export const PRIORIDADE_COLORS: Record<TarefaPrioridade, string> = {
  BAIXA: 'bg-muted text-muted-foreground',
  MEDIA: 'bg-blue-500/20 text-blue-500',
  ALTA: 'bg-orange-500/20 text-orange-500',
  URGENTE: 'bg-red-500/20 text-red-500'
};

export const TIPO_LABELS: Record<TarefaTipo, string> = {
  TAREFA: 'Tarefa',
  BUG: 'Bug',
  FEATURE: 'Feature',
  MELHORIA: 'Melhoria',
  DOCUMENTACAO: 'Documentação',
  REUNIAO: 'Reunião'
};

export const TIPO_COLORS: Record<TarefaTipo, string> = {
  TAREFA: 'bg-blue-500/20 text-blue-500',
  BUG: 'bg-red-500/20 text-red-500',
  FEATURE: 'bg-purple-500/20 text-purple-500',
  MELHORIA: 'bg-green-500/20 text-green-500',
  DOCUMENTACAO: 'bg-yellow-500/20 text-yellow-500',
  REUNIAO: 'bg-cyan-500/20 text-cyan-500'
};

export interface KanbanColumn {
  id: TarefaStatus;
  title: string;
  tasks: Tarefa[];
  limit?: number; // WIP limit
}

export interface TaskFilter {
  search?: string;
  status?: TarefaStatus[];
  prioridade?: TarefaPrioridade[];
  tipo?: TarefaTipo[];
  assignees?: string[];
  tags?: string[];
  project_id?: string;
  has_due_date?: boolean;
  is_overdue?: boolean;
  date_range?: { start: string; end: string };
}

export interface TaskSort {
  field: 'created_at' | 'updated_at' | 'data_vencimento' | 'prioridade' | 'titulo' | 'order_index';
  direction: 'asc' | 'desc';
}

export interface TaskStats {
  total: number;
  by_status: Record<TarefaStatus, number>;
  by_priority: Record<TarefaPrioridade, number>;
  by_type: Record<TarefaTipo, number>;
  overdue: number;
  due_soon: number; // Due within 3 days
  completed_this_week: number;
  completion_rate: number;
  average_cycle_time: number; // Days from creation to completion
}
