/**
 * Time Tracking Types
 * Sistema completo de tracking de tempo faturável
 */


/**
 * Entrada de tempo individual
 */

import { Timestamp } from '@/integrations/firebase/app';

export interface TimeEntry {
  id: string;
  user_id: string;
  organization_id: string;
  task_id?: string;           // Vinculado a tarefa
  patient_id?: string;        // Vinculado a paciente (sessão)
  project_id?: string;        // Vinculado a projeto
  appointment_id?: string;    // Vinculado a agendamento
  description: string;
  start_time: Timestamp;
  end_time?: Timestamp;
  duration_seconds: number;
  is_billable: boolean;
  hourly_rate?: number;
  total_value?: number;       // Calculado: duration_seconds / 3600 * hourly_rate
  tags: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

/**
 * Timer ativo em memória (para uso com useTimeTracker)
 */
export interface ActiveTimer {
  id: string;                 // UUID temporário
  description: string;
  start_time: Date;
  task_id?: string;
  patient_id?: string;
  project_id?: string;
  is_billable: boolean;
  hourly_rate?: number;
  tags: string[];
}

/**
 * Timesheet semanal (agregação)
 */
export interface WeeklyTimeSheet {
  user_id: string;
  week_start: Date;           // Domingo da semana
  week_end: Date;             // Sábado da semana
  entries: TimeEntry[];
  total_seconds: number;
  billable_seconds: number;
  non_billable_seconds: number;
  total_value: number;
  daily_breakdown: DailyBreakdown[];
}

/**
 * Breakdown diário de tempo
 */
export interface DailyBreakdown {
  date: string;               // YYYY-MM-DD
  total_seconds: number;
  billable_seconds: number;
  entries: TimeEntry[];
}

/**
 * Relatório de produtividade
 */
export interface ProductivityReport {
  user_id?: string;           // null = todos os usuários
  organization_id: string;
  start_date: Date;
  end_date: Date;
  total_seconds: number;
  billable_seconds: number;
  utilization_rate: number;   // billable / total
  top_projects: ProjectTimeSummary[];
  top_tasks: TaskTimeSummary[];
  hourly_average: number;     // Valor médio por hora
}

/**
 * Resumo de tempo por projeto
 */
export interface ProjectTimeSummary {
  project_id: string;
  project_title: string;
  total_seconds: number;
  total_value: number;
  entry_count: number;
}

/**
 * Resumo de tempo por tarefa
 */
export interface TaskTimeSummary {
  task_id: string;
  task_title: string;
  total_seconds: number;
  entry_count: number;
}

/**
 * Filtros para consulta de TimeEntry
 */
export interface TimeEntryFilters {
  user_id?: string;
  project_id?: string;
  task_id?: string;
  patient_id?: string;
  is_billable?: boolean;
  start_date?: Date;
  end_date?: Date;
  tags?: string[];
}

/**
 * Estatísticas de tempo para UI
 */
export interface TimeStats {
  today: {
    total_seconds: number;
    billable_seconds: number;
    entries: number;
  };
  this_week: {
    total_seconds: number;
    billable_seconds: number;
    entries: number;
  };
  this_month: {
    total_seconds: number;
    billable_seconds: number;
    entries: number;
  };
  average_daily: number;      // Média de segundos por dia (últimos 30 dias)
}

/**
 * Configuração de TimeTracking por organização
 */
export interface TimeTrackingSettings {
  organization_id: string;
  default_billable: boolean;
  default_hourly_rate?: number;
  require_description: boolean;
  allow_future_dates: boolean;
  rounding_minutes: number;   // Arredondar para X minutos mais próximo
  track_idle_time: boolean;   // Detectar tempo ocioso
}

/**
 * Tipo de periodo para relatórios
 */
export type ReportPeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom' | 'all_time';

/**
 * Tipo de view para timesheet
 */
export type TimeSheetView = 'daily' | 'weekly' | 'calendar';

/**
 * Status de sincronização offline
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';
