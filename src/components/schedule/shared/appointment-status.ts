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
    // Calendar styles
    border: 'border-emerald-500',
    bg: 'bg-emerald-100/90 dark:bg-emerald-500/20',
    hoverBg: 'hover:bg-emerald-200/90 dark:hover:bg-emerald-500/30',
    text: 'text-emerald-900 dark:text-emerald-400',
    subtext: 'text-emerald-800/80 dark:text-emerald-300/80',
    accent: 'bg-emerald-600',
    indicator: 'text-emerald-700',
  },
  agendado: {
    borderColor: 'border-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'Agendado',
    icon: Clock,
    gradient: 'from-blue-500/10 via-blue-500/15 to-blue-500/20',
    border: 'border-blue-500',
    bg: 'bg-blue-100/90 dark:bg-blue-500/20',
    hoverBg: 'hover:bg-blue-200/90 dark:hover:bg-blue-500/30',
    text: 'text-blue-900 dark:text-blue-400',
    subtext: 'text-blue-800/80 dark:text-blue-300/80',
    accent: 'bg-blue-600',
    indicator: 'text-blue-700',
  },
  avaliacao: {
    borderColor: 'border-violet-500',
    badgeBg: 'bg-violet-100 dark:bg-violet-500/20',
    badgeText: 'text-violet-700 dark:text-violet-300',
    iconColor: 'text-violet-600 dark:text-violet-400',
    label: 'Avaliação',
    icon: FileText,
    gradient: 'from-violet-500/10 via-violet-500/15 to-violet-500/20',
    border: 'border-violet-500',
    bg: 'bg-violet-100/90 dark:bg-violet-500/20',
    hoverBg: 'hover:bg-violet-200/90 dark:hover:bg-violet-500/30',
    text: 'text-violet-900 dark:text-violet-400',
    subtext: 'text-violet-800/80 dark:text-violet-300/80',
    accent: 'bg-violet-600',
    indicator: 'text-violet-700',
  },
  aguardando_confirmacao: {
    borderColor: 'border-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'Aguardando',
    icon: Clock,
    gradient: 'from-amber-500/10 via-amber-500/15 to-amber-500/20',
    border: 'border-amber-500',
    bg: 'bg-amber-100/90 dark:bg-amber-500/20',
    hoverBg: 'hover:bg-amber-200/90 dark:hover:bg-amber-500/30',
    text: 'text-amber-900 dark:text-amber-400',
    subtext: 'text-amber-800/80 dark:text-amber-300/80',
    accent: 'bg-amber-600',
    indicator: 'text-amber-700',
  },
  em_andamento: {
    borderColor: 'border-yellow-500',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-700 dark:text-yellow-400',
    label: 'Em Andamento',
    icon: Clock,
    gradient: 'from-yellow-500/10 via-yellow-500/15 to-yellow-500/20',
    border: 'border-amber-500',
    bg: 'bg-amber-100/90 dark:bg-amber-500/20',
    hoverBg: 'hover:bg-amber-200/90 dark:hover:bg-amber-500/30',
    text: 'text-amber-900 dark:text-amber-400',
    subtext: 'text-amber-800/80 dark:text-amber-300/80',
    accent: 'bg-amber-600',
    indicator: 'text-amber-700',
  },
  em_espera: {
    borderColor: 'border-indigo-500',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    label: 'Em Espera',
    icon: Clock,
    gradient: 'from-indigo-500/10 via-indigo-500/15 to-indigo-500/20',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
  },
  atrasado: {
    borderColor: 'border-orange-500',
    badgeBg: 'bg-orange-100 dark:bg-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-300',
    iconColor: 'text-orange-600 dark:text-orange-400',
    label: 'Atrasado',
    icon: AlertCircle,
    gradient: 'from-orange-500/10 via-orange-500/15 to-orange-500/20',
    border: 'border-orange-500',
    bg: 'bg-orange-100/90 dark:bg-orange-500/20',
    hoverBg: 'hover:bg-orange-200/90 dark:hover:bg-orange-500/30',
    text: 'text-orange-900 dark:text-orange-400',
    subtext: 'text-orange-800/80 dark:text-orange-300/80',
    accent: 'bg-orange-600',
    indicator: 'text-orange-700',
  },
  concluido: {
    borderColor: 'border-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-600 dark:text-slate-400',
    label: 'Concluído',
    icon: CheckCircle,
    gradient: 'from-slate-500/10 via-slate-500/15 to-slate-500/20',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
  },
  realizado: {
    borderColor: 'border-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-500/20',
    badgeText: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-600 dark:text-slate-400',
    label: 'Realizado',
    icon: CheckCircle,
    gradient: 'from-slate-500/10 via-slate-500/15 to-slate-500/20',
    border: 'border-indigo-500',
    bg: 'bg-indigo-100/90 dark:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-200/90 dark:hover:bg-indigo-500/30',
    text: 'text-indigo-900 dark:text-indigo-400',
    subtext: 'text-indigo-800/80 dark:text-indigo-300/80',
    accent: 'bg-indigo-600',
    indicator: 'text-indigo-700',
  },
  remarcado: {
    borderColor: 'border-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    label: 'Remarcado',
    icon: Clock,
    gradient: 'from-cyan-500/10 via-cyan-500/15 to-cyan-500/20',
    border: 'border-cyan-500',
    bg: 'bg-cyan-100/90 dark:bg-cyan-500/20',
    hoverBg: 'hover:bg-cyan-200/90 dark:hover:bg-cyan-500/30',
    text: 'text-cyan-900 dark:text-cyan-400',
    subtext: 'text-cyan-800/80 dark:text-cyan-300/80',
    accent: 'bg-cyan-600',
    indicator: 'text-cyan-700',
  },
  cancelado: {
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Cancelado',
    icon: XCircle,
    gradient: 'from-red-600/10 via-red-600/15 to-red-600/20',
    border: 'border-red-500',
    bg: 'bg-red-100/90 dark:bg-red-500/20',
    hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
    text: 'text-red-900 dark:text-red-400',
    subtext: 'text-red-800/80 dark:text-red-300/80',
    accent: 'bg-red-600',
    indicator: 'text-red-700',
  },
  falta: {
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'Falta',
    icon: XCircle,
    gradient: 'from-red-600/10 via-red-600/15 to-red-600/20',
    border: 'border-red-500',
    bg: 'bg-red-100/90 dark:bg-red-500/20',
    hoverBg: 'hover:bg-red-200/90 dark:hover:bg-red-500/30',
    text: 'text-red-900 dark:text-red-400',
    subtext: 'text-red-800/80 dark:text-red-300/80',
    accent: 'bg-red-600',
    indicator: 'text-red-700',
  },
};

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
 *
 * @param status - Appointment status
 * @returns Hex color code
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmado: '#10b981',
    agendado: '#3b82f6',
    avaliacao: '#8b5cf6',
    aguardando_confirmacao: '#f59e0b',
    em_andamento: '#eab308',
    em_espera: '#6366f1',
    atrasado: '#f97316',
    concluido: '#6b7280',
    realizado: '#6366f1',
    remarcado: '#06b6d4',
    cancelado: '#ef4444',
    falta: '#ef4444',
  };
  return colors[status] || colors.agendado;
}
