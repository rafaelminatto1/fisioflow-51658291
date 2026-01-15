/**
 * Tipos para agendamentos recorrentes
 * @module types/recurring-appointment
 */

import { Appointment } from './appointment';

// =====================================================================
// ENUMS
// =====================================================================

/**
 * Tipo de recorrência
 */
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Tipo de fim de recorrência
 */
export type RecurrenceEndType = 'never' | 'date' | 'occurrences';

/**
 * Status de uma ocorrência individual
 */
export type OccurrenceStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'skipped';

/**
 * Dias da semana (0-6, onde 0 = domingo)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Semanas do mês (1-5, onde 1 = primeira semana)
 */
export type WeekOfMonth = 1 | 2 | 3 | 4 | 5;

// =====================================================================
// CORE TYPES
// =====================================================================

/**
 * Série de agendamentos recorrentes
 */
export interface RecurringAppointmentSeries {
  /** ID único da série */
  id: string;
  /** ID da organização */
  organization_id: string;
  /** ID do paciente */
  patient_id: string;
  /** ID do terapeuta (opcional) */
  therapist_id?: string;
  /** ID do serviço (opcional) */
  service_id?: string;
  /** ID da sala (opcional) */
  room_id?: string;

  // Configuração de recorrência
  /** Tipo de recorrência */
  recurrence_type: RecurrenceType;
  /** Intervalo entre ocorrências */
  recurrence_interval: number;
  /** Dias da semana (para weekly) */
  recurrence_days_of_week?: DayOfWeek[];
  /** Dia do mês (para monthly) */
  recurrence_day_of_month?: number;
  /** Semana do mês (para monthly complexo) */
  recurrence_week_of_month?: WeekOfMonth;

  // Condição de fim
  /** Quando a recorrência termina */
  recurrence_end_type: RecurrenceEndType;
  /** Data final (se end_type = 'date') */
  recurrence_end_date?: Date;
  /** Número máximo de ocorrências (se end_type = 'occurrences') */
  recurrence_max_occurrences?: number;

  // Configuração base do appointment
  /** Data do primeiro appointment */
  appointment_date: Date;
  /** Horário padrão */
  appointment_time: string;
  /** Duração em minutos */
  duration: number;
  /** Tipo de appointment */
  appointment_type: string;
  /** Notas padrão */
  notes?: string;

  // Status
  /** Indica se a série está ativa */
  is_active: boolean;
  /** Confirmar appointments automaticamente */
  auto_confirm?: boolean;

  // Metadados
  /** Data de criação */
  created_at: Date;
  /** Data de atualização */
  updated_at: Date;
  /** Usuário que criou */
  created_by?: string;
  /** Data de cancelamento */
  canceled_at?: Date;
  /** Usuário que cancelou */
  canceled_by?: string;
  /** Motivo do cancelamento */
  cancel_reason?: string;

  // Relacionamentos (opcional, para joins)
  patient?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
  };
  therapist?: {
    id: string;
    full_name: string;
  };
  service?: {
    id: string;
    name: string;
    duration: number;
    price?: number;
  };
  room?: {
    id: string;
    name: string;
  };
}

/**
 * Ocorrência individual de uma série recorrente
 */
export interface RecurringAppointmentOccurrence {
  /** ID único */
  id: string;
  /** ID da série pai */
  series_id: string;
  /** ID do appointment criado (se existir) */
  appointment_id?: string;

  /** Data da ocorrência */
  occurrence_date: Date;
  /** Horário da ocorrência */
  occurrence_time: string;

  /** Status individual */
  status: OccurrenceStatus;

  // Modificações individuais
  /** Duração modificada */
  modified_duration?: number;
  /** Notas modificadas */
  modified_notes?: string;
  /** Horário modificado */
  modified_time?: string;
  /** Sala modificada */
  modified_room_id?: string;

  // Metadados
  /** Data de criação */
  created_at: Date;
  /** Data de atualização */
  updated_at: Date;
  /** Data de confirmação */
  confirmed_at?: Date;
  /** Data de conclusão */
  completed_at?: Date;
  /** Data de cancelamento */
  canceled_at?: Date;
  /** Quem cancelou */
  canceled_by?: string;

  // Relacionamentos
  series?: RecurringAppointmentSeries;
  appointment?: Appointment;
}

/**
 * Série com estatísticas calculadas
 */
export interface RecurringAppointmentSeriesWithStats extends RecurringAppointmentSeries {
  /** Número total de ocorrências */
  occurrence_count?: number;
  /** Data da primeira ocorrência */
  first_occurrence?: Date;
  /** Data da última ocorrência */
  last_occurrence?: Date;
  /** Número de ocorrências concluídas */
  completed_count?: number;
  /** Número de ocorrências canceladas */
  cancelled_count?: number;
  /** Número de no-shows */
  no_show_count?: number;
}

// =====================================================================
// FORM TYPES
// =====================================================================

/**
 * Dados para criar/editar uma série recorrente
 */
export interface RecurringAppointmentFormData {
  /** ID para edição */
  id?: string;

  // Dados do paciente
  patient_id: string;
  therapist_id?: string;
  service_id?: string;
  room_id?: string;

  // Configuração de recorrência
  recurrence: {
    type: RecurrenceType;
    interval: number;
    daysOfWeek?: DayOfWeek[];
    dayOfMonth?: number;
    weekOfMonth?: WeekOfMonth;
    endType: RecurrenceEndType;
    endDate?: Date;
    maxOccurrences?: number;
  };

  // Configuração do appointment
  firstDate: Date;
  time: string;
  duration: number;
  type: string;
  notes?: string;

  // Opções
  auto_confirm?: boolean;
}

/**
 * Dados para modificar uma ocorrência individual
 */
export interface ModifyOccurrenceFormData {
  /** ID da ocorrência */
  occurrence_id: string;

  /** Campos modificados */
  duration?: number;
  notes?: string;
  time?: string;
  room_id?: string;
}

// =====================================================================
// PREVIEW TYPES
// =====================================================================

/**
 * Preview de uma ocorrência gerada
 */
export interface OccurrencePreview {
  /** Data da ocorrência */
  date: Date;
  /** Horário */
  time: string;
  /** Índice na sequência */
  index: number;
  /** ID da série */
  seriesId: string;
  /** Status atual */
  status?: OccurrenceStatus;
  /** Appointment criado */
  appointment?: Appointment;
}

/**
 * Resultado da geração de previews
 */
export interface GenerateOccurrencesResult {
  /** Ocorrências geradas */
  occurrences: OccurrencePreview[];
  /** Número total de ocorrências */
  totalCount: number;
  /** Data da primeira ocorrência */
  firstDate: Date;
  /** Data da última ocorrência */
  lastDate: Date;
  /**Warnings */
  warnings?: string[];
}

// =====================================================================
// API TYPES
// =====================================================================

/**
 * Parâmetros para buscar séries recorrentes
 */
export interface FetchRecurringSeriesParams {
  /** ID da organização */
  organization_id?: string;
  /** ID do paciente */
  patient_id?: string;
  /** Apenas séries ativas */
  is_active?: boolean;
  /** Data de início */
  start_date?: Date;
  /** Data de fim */
  end_date?: Date;
  /** Paginação */
  page?: number;
  per_page?: number;
}

/**
 * Resultado de fetch de séries
 */
export interface FetchRecurringSeriesResult {
  /** Séries encontradas */
  series: RecurringAppointmentSeriesWithStats[];
  /** Total de registros */
  total: number;
  /** Número da página */
  page: number;
  /** Registros por página */
  per_page: number;
}

/**
 * Resposta de criação de série
 */
export interface CreateSeriesResult {
  /** Série criada */
  series: RecurringAppointmentSeries;
  /** Ocorrências geradas */
  occurrences: RecurringAppointmentOccurrence[];
  /** Appointments criados */
  appointments?: Appointment[];
  /**Warnings */
  warnings?: string[];
}

// =====================================================================
// EXPORTS
// =====================================================================

export type {
  RecurringAppointmentSeries,
  RecurringAppointmentOccurrence,
  RecurringAppointmentSeriesWithStats,
  RecurringAppointmentFormData,
  ModifyOccurrenceFormData,
  OccurrencePreview,
  GenerateOccurrencesResult,
  FetchRecurringSeriesParams,
  FetchRecurringSeriesResult,
  CreateSeriesResult,
};
