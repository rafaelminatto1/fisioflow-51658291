/**
 * Tipos centralizados para componentes de calendário
 * @module calendar/types
 */

import { ReactNode } from 'react';

// =====================================================================
// TIPOS BÁSICOS
// =====================================================================

/**
 * Tipo de visualização do calendário
 */
export type CalendarViewType = 'day' | 'week' | 'month';

/**
 * Status de um agendamento
 */
export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'remarcado'
  | 'nao_compareceu'
  | 'aguardando_confirmacao'
  | 'em_espera'
  | 'atrasado';

/**
 * Tipo de um agendamento
 */
export type AppointmentType =
  | 'avaliacao'
  | 'sessao'
  | 'retorno'
  | 'procedimento'
  | 'telemedicina';

// =====================================================================
// FILTROS
// =====================================================================

/**
 * Filtros aplicáveis ao calendário
 */
export interface CalendarFilters {
  /** Status para filtrar */
  status: string[];
  /** Tipos para filtrar */
  types: string[];
  /** IDs de terapeutas para filtrar */
  therapists: string[];
  /** Intervalo de datas */
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Estado dos filtros
 */
export interface FilterState extends CalendarFilters {
  /** Indica se algum filtro está ativo */
  hasActiveFilters: boolean;
}

// =====================================================================
// DRAG AND DROP
// =====================================================================

/**
 * Estado de drag and drop
 */
export interface DragState {
  /** Appointment sendo arrastado */
  appointment: DraggedAppointment | null;
  /** Indica se está em processo de drag */
  isDragging: boolean;
}

/**
 * Appointment sendo arrastado
 */
export interface DraggedAppointment {
  id: string;
  date: string | Date;
  time: string;
  patientName: string;
  type: string;
  status: string;
  duration: number;
}

/**
 * Alvo de drop
 */
export interface DropTarget {
  /** Data do alvo */
  date: Date;
  /** Horário do alvo */
  time: string;
  /** Dia da semana (0-6) */
  dayIndex?: number;
}

/**
 * Resultado de uma operação de drag
 */
export interface DragResult {
  /** ID do appointment movido */
  appointmentId: string;
  /** Data original */
  oldDate: Date;
  /** Horário original */
  oldTime: string;
  /** Nova data */
  newDate: Date;
  /** Novo horário */
  newTime: string;
}

// =====================================================================
// SELEÇÃO MÚLTIPLA
// =====================================================================

/**
 * Estado de seleção múltipla
 */
export interface SelectionState {
  /** IDs dos itens selecionados */
  selectedIds: Set<string>;
  /** Indica se o modo de seleção está ativo */
  isSelectionMode: boolean;
}

/**
 * Ação disponível para seleção múltipla
 */
export type SelectionAction =
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_SELECTION_MODE'; payload: boolean };

// =====================================================================
// TIME SLOTS
// =====================================================================

/**
 * Slot de tempo disponível
 */
export interface TimeSlot {
  /** Horário no formato HH:MM */
  time: string;
  /** Indica se está disponível */
  available: boolean;
  /** Motivo da indisponibilidade */
  unavailableReason?: string;
  /** Capacidade do slot */
  capacity?: number;
  /** Número atual de agendamentos */
  currentCount?: number;
}

/**
 * Intervalo de tempo
 */
export interface TimeWindow {
  /** Horário de início */
  startTime: string;
  /** Horário de fim */
  endTime: string;
}

// =====================================================================
// POSITIONING
// =====================================================================

/**
 * Posição e estilo de um appointment no grid
 */
export interface AppointmentPosition {
  /** Índice da coluna (grid column) */
  gridColumn: string;
  /** Índice da linha (grid row) */
  gridRow: string;
  /** Altura em pixels */
  height: string;
  /** Largura calculada */
  width: string;
  /** Posição left */
  left: string;
  /** Posição top */
  top: string;
  /** Z-index */
  zIndex: number;
}

/**
 * Dimensões do grid
 */
export interface GridDimensions {
  /** Altura total em pixels */
  height: number;
  /** Número de linhas */
  rows: number;
  /** Altura de cada slot */
  slotHeight: number;
  /** Número de colunas */
  columns: number;
}

// =====================================================================
// VIEW SETTINGS
// =====================================================================

/**
 * Configurações de visualização do calendário
 */
export interface CalendarViewSettings {
  /** Tipo de visualização atual */
  viewType: CalendarViewType;
  /** Data atual sendo visualizada */
  currentDate: Date;
  /** Zoom level (1-3) */
  zoomLevel: number;
  /** Indica se deve mostrar fins de semana */
  showWeekends: boolean;
  /** Indica se deve mostrar horários bloqueados */
  showBlockedSlots: boolean;
  /** Horário de início exibido */
  startHour: number;
  /** Horário de fim exibido */
  endHour: number;
}

// =====================================================================
// VIRTUALIZATION
// =====================================================================

/**
 * Item renderizado no grid virtualizado
 */
export interface VirtualGridItem<T = unknown> {
  /** Índice do item */
  index: number;
  /** Dados do item */
  data: T;
  /** Estilo do item */
  style: React.CSSProperties;
}

/**
 * Propriedades do grid virtualizado
 */
export interface VirtualGridProps<T = unknown> {
  /** Altura do container */
  height: number;
  /** Largura do container */
  width: number | string;
  /** Número total de itens */
  itemCount: number;
  /** Altura de cada item */
  itemSize: number;
  /** Função de renderização */
  renderItem: (props: VirtualGridItem<T>) => ReactNode;
  /** Overscan em pixels */
  overscanCount?: number;
}

// =====================================================================
// KEYBOARD NAVIGATION
// =====================================================================

/**
 * Estado de navegação por teclado
 */
export interface KeyboardNavigationState {
  /** Célula focada atualmente */
  focusedCell: { row: number; col: number } | null;
  /** Indica se o modo de navegação está ativo */
  isNavigationMode: boolean;
}

/**
 * Ação de teclado
 */
export interface KeyboardAction {
  /** Tipo da ação */
  type:
    | 'NAVIGATE'
    | 'SELECT'
    | 'CREATE'
    | 'EDIT'
    | 'DELETE'
    | 'CANCEL';
  /** Dados da ação */
  payload?: Record<string, unknown>;
}

// =====================================================================
// PRESETS
// =====================================================================

/**
 * Preset de filtro rápido
 */
export interface FilterPreset {
  /** Nome do preset */
  name: string;
  /** Filtros aplicados */
  filters: CalendarFilters;
  /** Ícone do preset */
  icon?: string;
  /** Cor do preset */
  color?: string;
}

/**
 * Preset de visualização
 */
export interface ViewPreset {
  /** Nome do preset */
  name: string;
  /** Configurações de visualização */
  settings: Partial<CalendarViewSettings>;
}

// =====================================================================
// EXPORTS
// =====================================================================

export type {
  CalendarViewType,
  AppointmentStatus,
  AppointmentType,
  CalendarFilters,
  FilterState,
  DragState,
  DraggedAppointment,
  DropTarget,
  DragResult,
  SelectionState,
  SelectionAction,
  TimeSlot,
  TimeWindow,
  AppointmentPosition,
  GridDimensions,
  CalendarViewSettings,
  VirtualGridItem,
  VirtualGridProps,
  KeyboardNavigationState,
  KeyboardAction,
  FilterPreset,
  ViewPreset,
};
