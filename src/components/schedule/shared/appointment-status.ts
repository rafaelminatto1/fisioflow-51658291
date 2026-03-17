/**
 * Shared Appointment Status Configuration
 *
 * @description
 * Centralized status styling and configuration for all appointment card variants.
 * This ensures consistency across schedule, calendar, and mobile views.
 *
 * @module components/schedule/shared/appointment-status
 */

import type { LucideIcon } from 'lucide-react';
import {

  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
} from 'lucide-react';

/**
 * Appointment status configuration
 */
export interface AppointmentStatusConfig {
  /** Border color class */
  borderColor: string;
  /** Badge background class */
  badgeBg: string;
  /** Badge text class */
  badgeText: string;
  /** Icon color class */
  iconColor: string;
  /** Human-readable label */
  label: string;
  /** Status icon component */
  icon: LucideIcon;
  /** Gradient for hover effects */
  gradient: string;
  /** Calendar card class name */
  calendarClassName: string;
  /** Calendar card accent color */
  calendarAccent: string;
  /** Background color */
  bg: string;
  /** Hover background */
  hoverBg: string;
  /** Text color */
  text: string;
  /** Subtext color */
  subtext: string;
  /** Accent color */
  accent: string;
  /** Indicator color */
  indicator: string;
  /** Allowed actions for this status */
  allowedActions: string[];
}

/**
 * Comprehensive status configuration for all appointment states
 */
export const APPOINTMENT_STATUS_CONFIG: Record<string, AppointmentStatusConfig> = {
  confirmado: {
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'Confirmado',
    icon: CheckCircle,
    gradient: 'from-emerald-500/10 via-emerald-500/15 to-emerald-500/20',
    calendarClassName: 'calendar-card-confirmado',
    calendarAccent: 'bg-emerald-600',
    // Calendar styles
    border: 'border-emerald-500',
    bg: 'bg-emerald-100/90 dark:bg-emerald-500/20',
    hoverBg: 'hover:bg-emerald-200/90 dark:hover:bg-emerald-500/30',
    text: 'text-emerald-900 dark:text-emerald-400',
    subtext: 'text-emerald-800/80 dark:text-emerald-300/80',
    accent: 'bg-emerald-600',
    indicator: 'text-emerald-700',
    allowedActions: ["complete", "miss", "cancel", "reschedule", "edit", "payment"],
  },
  agendado: {
    borderColor: 'border-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'Agendado',
    icon: Clock,
    gradient: 'from-blue-500/10 via-blue-500/15 to-blue-500/20',
    calendarClassName: 'calendar-card-agendado',
    calendarAccent: 'bg-sky-400',
    border: 'border-blue-500',
    bg: 'bg-blue-100/90 dark:bg-blue-500/20',
    hoverBg: 'hover:bg-blue-200/90 dark:hover:bg-blue-500/30',
    text: 'text-blue-900 dark:text-blue-400',
    subtext: 'text-blue-800/80 dark:text-blue-300/80',
    accent: 'bg-blue-600',
    indicator: 'text-blue-700',
    allowedActions: ["confirm", "cancel", "reschedule", "edit"],
  },
  avaliacao: {
    borderColor: 'border-violet-500',
    badgeBg: 'bg-violet-100 dark:bg-violet-500/20',
    badgeText: 'text-violet-700 dark:text-violet-300',
    iconColor: 'text-violet-600 dark:text-violet-400',
    label: 'Avaliação',
    icon: FileText,
    gradient: 'from-violet-500/10 via-violet-500/15 to-violet-500/20',
    calendarClassName: 'calendar-card-avaliacao',
    calendarAccent: 'bg-purple-600',
    border: 'border-violet-500',
    bg: 'bg-violet-100/90 dark:bg-violet-500/20',
    hoverBg: 'hover:bg-violet-200/90 dark:hover:bg-violet-500/30',
    text: 'text-violet-900 dark:text-violet-400',
    subtext: 'text-violet-800/80 dark:text-violet-300/80',
    accent: 'bg-violet-600',
    indicator: 'text-violet-700',
    allowedActions: ["confirm", "cancel", "reschedule", "edit"],
  },
  aguardando_confirmacao: {
    borderColor: 'border-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'Aguardando',
    icon: Clock,
    gradient: 'from-amber-500/10 via-amber-500/15 to-amber-500/20',
    calendarClassName: 'calendar-card-aguardando_confirmacao',
    calendarAccent: 'bg-amber-500',
    border: 'border-amber-500',
    bg: 'bg-amber-100/90 dark:bg-amber-500/20',
    hoverBg: 'hover:bg-amber-200/90 dark:hover:bg-amber-500/30',
    text: 'text-amber-900 dark:text-amber-400',
    subtext: 'text-amber-800/80 dark:text-amber-300/80',
    accent: 'bg-amber-600',
    indicator: 'text-amber-700',
    allowedActions: ["confirm", "cancel", "reschedule", "edit"],
  },
  em_andamento: {
    borderColor: 'border-yellow-500',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-700 dark:text-yellow-400',
    label: 'Em Andamento',
    icon: Clock,
    gradient: 'from-yellow-500/10 via-yellow-500/15 to-yellow-500/20',
    calendarClassName: 'calendar-card-em_andamento',
    calendarAccent: 'bg-amber-600',
    border: 'border-amber-500',
    bg: 'bg-amber-100/90 dark:bg-amber-500/20',
    hoverBg: 'hover:bg-amber-200/90 dark:hover:bg-amber-500/30',
    text: 'text-amber-900 dark:text-amber-400',
    subtext: 'text-amber-800/80 dark:text-amber-300/80',
    accent: 'bg-amber-600',
    indicator: 'text-amber-700',
    allowedActions: ["complete", "cancel"],
  },
  em_espera: {
    borderColor: 'border-indigo-500',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    label: 'Em Espera',
    icon: Clock,
    gradient: 'from-indigo-500/10 via-indigo-500/15 to-indigo-500/20',
    calendarClassName: 'calendar-card-em_espera',
    calendarAccent: 'bg-indigo-500',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
    allowedActions: ["start", "cancel", "reschedule"],
  },
  atrasado: {
    borderColor: 'border-orange-500',
    badgeBg: 'bg-orange-100 dark:bg-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-300',
    iconColor: 'text-orange-600 dark:text-orange-400',
    label: 'Atrasado',
    icon: AlertCircle,
    gradient: 'from-orange-500/10 via-orange-500/15 to-orange-500/20',
    calendarClassName: 'calendar-card-atrasado',
    calendarAccent: 'bg-orange-500',
    border: 'border-orange-500',
    bg: 'bg-orange-100/90 dark:bg-orange-500/20',
    hoverBg: 'hover:bg-orange-200/90 dark:hover:bg-orange-500/30',
    text: 'text-orange-900 dark:text-orange-400',
    subtext: 'text-orange-800/80 dark:text-orange-300/80',
    accent: 'bg-orange-600',
    indicator: 'text-orange-700',
    allowedActions: ["start", "cancel", "reschedule"],
  },
  concluido: {
    borderColor: 'border-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-600 dark:text-slate-300',
    label: 'Concluído',
    icon: CheckCircle,
    gradient: 'from-slate-500/10 via-slate-500/15 to-slate-500/20',
    calendarClassName: 'calendar-card-concluido',
    calendarAccent: 'bg-slate-600',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
    allowedActions: ["view", "payment", "evolution"],
  },
  realizado: {
    borderColor: 'border-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-600 dark:text-slate-300',
    label: 'Realizado',
    icon: CheckCircle,
    gradient: 'from-slate-500/10 via-slate-500/15 to-slate-500/20',
    calendarClassName: 'calendar-card-realizado',
    calendarAccent: 'bg-slate-600',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
    allowedActions: ["view", "payment", "evolution"],
  },
  remarcado: {
    borderColor: 'border-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    label: 'Remarcado',
    icon: Clock,
    gradient: 'from-cyan-500/10 via-cyan-500/15 to-cyan-500/20',
    calendarClassName: 'calendar-card-reagendado',
    calendarAccent: 'bg-lime-600',
    border: 'border-cyan-500',
    bg: 'bg-cyan-100/90 dark:bg-cyan-500/20',
    hoverBg: 'hover:bg-cyan-200/90 dark:hover:bg-cyan-500/30',
    text: 'text-cyan-900 dark:text-cyan-400',
    subtext: 'text-cyan-800/80 dark:text-cyan-300/80',
    accent: 'bg-cyan-600',
    indicator: 'text-cyan-700',
    allowedActions: ["view"],
  },
  cancelado: {
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Cancelado',
    icon: XCircle,
    gradient: 'from-red-600/10 via-red-600/15 to-red-600/20',
    calendarClassName: 'calendar-card-cancelado',
    calendarAccent: 'bg-red-600',
    border: 'border-red-500',
    bg: 'bg-red-100/90 dark:bg-red-500/20',
    hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
    text: 'text-red-900 dark:text-red-400',
    subtext: 'text-red-800/80 dark:text-red-300/80',
    accent: 'bg-red-600',
    indicator: 'text-red-700',
    allowedActions: ["view", "reschedule"],
  },
  falta: {
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Falta',
    icon: XCircle,
    gradient: 'from-red-600/10 via-red-600/15 to-red-600/20',
    calendarClassName: 'calendar-card-falta',
    calendarAccent: 'bg-red-700',
    border: 'border-red-500',
    bg: 'bg-red-100/90 dark:bg-red-500/20',
    hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
    text: 'text-red-900 dark:text-red-400',
    subtext: 'text-red-800/80 dark:text-red-300/80',
    accent: 'bg-red-600',
    indicator: 'text-red-700',
    allowedActions: ["view", "reschedule", "payment"],
  },
  // reagendado é o valor canônico no frontend; remarcado é alias para retrocompatibilidade
  reagendado: {
    borderColor: 'border-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    label: 'Reagendado',
    icon: Clock,
    gradient: 'from-cyan-500/10 via-cyan-500/15 to-cyan-500/20',
    calendarClassName: 'calendar-card-reagendado',
    calendarAccent: 'bg-lime-600',
    border: 'border-cyan-500',
    bg: 'bg-cyan-100/90 dark:bg-cyan-500/20',
    hoverBg: 'hover:bg-cyan-200/90 dark:hover:bg-cyan-500/30',
    text: 'text-cyan-900 dark:text-cyan-400',
    subtext: 'text-cyan-800/80 dark:text-cyan-300/80',
    accent: 'bg-cyan-600',
    indicator: 'text-cyan-700',
    allowedActions: ["view"],
  },
};

/**
 * Normaliza status vindo do backend (inglês/legado) para o valor canônico do frontend (PT-BR).
 *
 * FONTE ÚNICA: toda lógica de normalização de status deve viver aqui.
 */
export function normalizeStatus(status: string): string {
  const s = (status ?? 'agendado').toLowerCase().trim();
  // Backend EN → Frontend PT
  if (s === 'confirmed') return 'confirmado';
  if (s === 'scheduled') return 'agendado';
  if (s === 'cancelled' || s === 'canceled') return 'cancelado';
  if (s === 'no_show' || s === 'paciente_faltou' || s === 'faltou') return 'falta';
  if (s === 'rescheduled' || s === 'remarcado') return 'reagendado';
  if (s === 'in_progress' || s === 'em_atendimento') return 'em_andamento';
  if (s === 'completed' || s === 'realizado' || s === 'atendido') return 'concluido';
  // Já é um valor canônico PT — retorna direto
  return s;
}

/**
 * Lista ordenada de status disponíveis para dropdowns e filtros.
 * Edite aqui para mudar quais opções aparecem nos seletores de status.
 */
export const APPOINTMENT_STATUS_OPTIONS = [
  'concluido',
  'confirmado',
  'agendado',
  'avaliacao',
  'aguardando_confirmacao',
  'em_espera',
  'cancelado',
  'falta',
  'reagendado',
  'atrasado',
  'em_andamento',
] as const;

/**
 * Get status configuration for a given status
 *
 * @param status - Appointment status
 * @returns Status configuration (defaults to 'agendado')
 */
export function getStatusConfig(status: string): AppointmentStatusConfig {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.agendado;
}

/**
 * Get status color for React Native
 * Based on Activity Fisioterapia logo - Baby Blue palette
 *
 * @param status - Appointment status
 * @returns Hex color code
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmado: '#10b981',
    agendado: '#0284C7', // Primary Baby Blue
    avaliacao: '#5EB3E6', // Logo Blue (notification color)
    aguardando_confirmacao: '#f59e0b',
    em_andamento: '#eab308',
    em_espera: '#0284C7', // Primary Baby Blue
    atrasado: '#f97316', // Accent Coral
    concluido: '#6b7280',
    realizado: '#0284C7', // Primary Baby Blue
    remarcado: '#06b6d4',
    cancelado: '#ef4444',
    falta: '#ef4444',
  };
  return colors[status] || colors.agendado;
}
