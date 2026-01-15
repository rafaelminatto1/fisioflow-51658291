/**
 * Constantes centralizadas para componentes de calendário
 * @module calendar/constants
 */

// =====================================================================
// CONFIGURAÇÕES DE HORÁRIO
// =====================================================================

/**
 * Horário comercial padrão
 */
export const BUSINESS_HOURS = {
  /** Horário de início (7:00) */
  START: 7,
  /** Horário de fim (21:00) */
  END: 21,
  /** Duração padrão de cada slot em minutos */
  DEFAULT_SLOT_DURATION: 30,
  /** Arredondamento para próximo slot em minutos */
  DEFAULT_ROUND: 30,
} as const;

/**
 * Altura de cada slot de tempo em pixels
 */
export const SLOT_HEIGHT = 80;

/**
 * Altura mínima para virtualização
 */
export const MIN_LIST_HEIGHT = 400;

/**
 * Altura visível padrão do calendário
 */
export const DEFAULT_LIST_HEIGHT = 600;

// =====================================================================
// CONFIGURAÇÕES DE VISUALIZAÇÃO
// =====================================================================

/**
 * Tipos de visualização disponíveis
 */
export const VIEW_TYPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

/**
 * Nomes dos dias da semana em português
 */
export const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/**
 * Nomes curtos dos dias da semana
 */
export const WEEKDAY_NAMES_SHORT = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
] as const;

/**
 * Nomes dos meses em português
 */
export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

// =====================================================================
// CONFIGURAÇÕES DE DRAG AND DROP
// =====================================================================

/**
 * Limiar de snap para drag em pixels
 */
export const DRAG_SNAP_THRESHOLD = 10;

/**
 * Offset para preview de drag
 */
export const DRAG_PREVIEW_OFFSET_Y = 20;

// =====================================================================
// CORES DE STATUS
// =====================================================================

/**
 * Cores para diferentes status de agendamento
 */
export const STATUS_COLORS = {
  confirmado: {
    bg: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-400',
    shadow: 'shadow-emerald-500/30',
  },
  agendado: {
    bg: 'from-blue-500 to-blue-600',
    border: 'border-blue-400',
    shadow: 'shadow-blue-500/30',
  },
  concluido: {
    bg: 'from-purple-500 to-purple-600',
    border: 'border-purple-400',
    shadow: 'shadow-purple-500/30',
  },
  cancelado: {
    bg: 'from-red-500 to-red-600',
    border: 'border-red-400',
    shadow: 'shadow-red-500/30',
  },
  aguardando_confirmacao: {
    bg: 'from-amber-500 to-amber-600',
    border: 'border-amber-400',
    shadow: 'shadow-amber-500/30',
  },
  em_andamento: {
    bg: 'from-cyan-500 to-cyan-600',
    border: 'border-cyan-400',
    shadow: 'shadow-cyan-500/30',
  },
  remarcado: {
    bg: 'from-orange-500 to-orange-600',
    border: 'border-orange-400',
    shadow: 'shadow-orange-500/30',
  },
  nao_compareceu: {
    bg: 'from-rose-500 to-rose-600',
    border: 'border-rose-400',
    shadow: 'shadow-rose-500/30',
  },
  em_espera: {
    bg: 'from-indigo-500 to-indigo-600',
    border: 'border-indigo-400',
    shadow: 'shadow-indigo-500/30',
  },
  atrasado: {
    bg: 'from-yellow-500 to-yellow-600',
    border: 'border-yellow-400',
    shadow: 'shadow-yellow-500/30',
  },
  excedente: {
    bg: 'from-amber-600 to-orange-600',
    border: 'border-amber-400',
    shadow: 'shadow-amber-500/40',
    ring: 'ring-2 ring-amber-400/50 ring-offset-1',
  },
} as const;

// =====================================================================
// ATALHOS DE TECLADO
// =====================================================================

/**
 * Atalhos de teclado padrão
 */
export const KEYBOARD_SHORTCUTS = {
  NEW_APPOINTMENT: 'n',
  SEARCH: 'f',
  DAY_VIEW: 'd',
  WEEK_VIEW: 'w',
  MONTH_VIEW: 'm',
  TODAY: 't',
  HELP: '/',
  HELP_ALT: '?',
  SELECTION_MODE: 'a',
  SAVE: 's',
  ZOOM_IN: '+',
  ZOOM_OUT: '-',
  SELECT_ALL: 'Ctrl+A',
} as const;

// =====================================================================
// TIPOS
// =====================================================================

export type ViewType = keyof typeof VIEW_TYPES;
export type StatusColorKey = keyof typeof STATUS_COLORS;
export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
