/**
 * Shared Appointment Status Configuration
 *
 * @description
 * Centralized status styling and configuration for all appointment card variants.
 * This ensures consistency across schedule, calendar, and mobile views.
 * Updated to match ZenFisio system.
 *
 * @module components/schedule/shared/appointment-status
 */

import type { LucideIcon } from "lucide-react";
import {
	CheckCircle,
	Clock,
	AlertCircle,
	XCircle,
	FileText,
	UserCheck,
	Slash,
	CalendarOff,
} from "lucide-react";

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
 * Comprehensive status configuration for all appointment states (ZenFisio System)
 */
export const APPOINTMENT_STATUS_CONFIG: Record<
	string,
	AppointmentStatusConfig
> = {
	agendado: {
		borderColor: "border-blue-500",
		badgeBg: "bg-blue-100 dark:bg-blue-500/20",
		badgeText: "text-blue-700 dark:text-blue-300",
		iconColor: "text-blue-600 dark:text-blue-400",
		label: "Agendado",
		icon: Clock,
		gradient: "from-blue-500/10 via-blue-500/15 to-blue-500/20",
		calendarClassName: "calendar-card-agendado",
		calendarAccent: "bg-blue-500",
		bg: "bg-blue-100/90 dark:bg-blue-500/20",
		hoverBg: "hover:bg-blue-200/90 dark:hover:bg-blue-500/30",
		text: "text-blue-900 dark:text-blue-400",
		subtext: "text-blue-800/80 dark:text-blue-300/80",
		accent: "bg-blue-600",
		indicator: "text-blue-700",
		allowedActions: ["confirm", "cancel", "reschedule", "edit"],
	},
	atendido: {
		borderColor: "border-emerald-500",
		badgeBg: "bg-emerald-100 dark:bg-emerald-500/20",
		badgeText: "text-emerald-700 dark:text-emerald-300",
		iconColor: "text-emerald-600 dark:text-emerald-400",
		label: "Atendido",
		icon: CheckCircle,
		gradient: "from-emerald-500/10 via-emerald-500/15 to-emerald-500/20",
		calendarClassName: "calendar-card-atendido",
		calendarAccent: "bg-emerald-600",
		bg: "bg-emerald-100/90 dark:bg-emerald-500/20",
		hoverBg: "hover:bg-emerald-200/90 dark:hover:bg-emerald-500/30",
		text: "text-emerald-900 dark:text-emerald-400",
		subtext: "text-emerald-800/80 dark:text-emerald-300/80",
		accent: "bg-emerald-600",
		indicator: "text-emerald-700",
		allowedActions: ["view", "payment", "evolution"],
	},
	avaliacao: {
		borderColor: "border-violet-500",
		badgeBg: "bg-violet-100 dark:bg-violet-500/20",
		badgeText: "text-violet-700 dark:text-violet-300",
		iconColor: "text-violet-600 dark:text-violet-400",
		label: "Avaliação",
		icon: FileText,
		gradient: "from-violet-500/10 via-violet-500/15 to-violet-500/20",
		calendarClassName: "calendar-card-avaliacao",
		calendarAccent: "bg-purple-600",
		bg: "bg-violet-100/90 dark:bg-violet-500/20",
		hoverBg: "hover:bg-violet-200/90 dark:hover:bg-violet-500/30",
		text: "text-violet-900 dark:text-violet-400",
		subtext: "text-violet-800/80 dark:text-violet-300/80",
		accent: "bg-violet-600",
		indicator: "text-violet-700",
		allowedActions: ["confirm", "cancel", "reschedule", "edit"],
	},
	cancelado: {
		borderColor: "border-slate-950",
		badgeBg: "bg-slate-200 dark:bg-slate-800",
		badgeText: "text-slate-900 dark:text-slate-100",
		iconColor: "text-slate-900 dark:text-slate-100",
		label: "Cancelado",
		icon: XCircle,
		gradient: "from-slate-900/10 via-slate-900/15 to-slate-900/20",
		calendarClassName: "calendar-card-cancelado",
		calendarAccent: "bg-slate-900",
		bg: "bg-slate-200/90 dark:bg-slate-800/80",
		hoverBg: "hover:bg-slate-300/90 dark:hover:bg-slate-700/80",
		text: "text-slate-900 dark:text-slate-100",
		subtext: "text-slate-800/80 dark:text-slate-300/80",
		accent: "bg-slate-950",
		indicator: "text-slate-900",
		allowedActions: ["view", "reschedule"],
	},
	faltou: {
		borderColor: "border-red-500",
		badgeBg: "bg-red-100 dark:bg-red-500/20",
		badgeText: "text-red-700 dark:text-red-300",
		iconColor: "text-red-600 dark:text-red-400",
		label: "Faltou",
		icon: AlertCircle,
		gradient: "from-red-500/10 via-red-500/15 to-red-500/20",
		calendarClassName: "calendar-card-faltou",
		calendarAccent: "bg-red-600",
		bg: "bg-red-100/90 dark:bg-red-500/20",
		hoverBg: "hover:bg-red-200/90 dark:hover:bg-red-500/30",
		text: "text-red-900 dark:text-red-400",
		subtext: "text-red-800/80 dark:text-red-300/80",
		accent: "bg-red-600",
		indicator: "text-red-700",
		allowedActions: ["view", "reschedule", "payment"],
	},
	faltou_com_aviso: {
		borderColor: "border-teal-400",
		badgeBg: "bg-teal-100 dark:bg-teal-500/20",
		badgeText: "text-teal-700 dark:text-teal-300",
		iconColor: "text-teal-600 dark:text-teal-400",
		label: "Faltou (com aviso prévio)",
		icon: Clock,
		gradient: "from-teal-400/10 via-teal-400/15 to-teal-400/20",
		calendarClassName: "calendar-card-faltou_com_aviso",
		calendarAccent: "bg-teal-500",
		bg: "bg-teal-100/90 dark:bg-teal-500/20",
		hoverBg: "hover:bg-teal-200/90 dark:hover:bg-teal-500/30",
		text: "text-teal-900 dark:text-teal-400",
		subtext: "text-teal-800/80 dark:text-teal-300/80",
		accent: "bg-teal-600",
		indicator: "text-teal-700",
		allowedActions: ["view", "reschedule"],
	},
	faltou_sem_aviso: {
		borderColor: "border-orange-500",
		badgeBg: "bg-orange-100 dark:bg-orange-500/20",
		badgeText: "text-orange-700 dark:text-orange-300",
		iconColor: "text-orange-600 dark:text-orange-400",
		label: "Faltou (sem aviso prévio)",
		icon: AlertCircle,
		gradient: "from-orange-500/10 via-orange-500/15 to-orange-500/20",
		calendarClassName: "calendar-card-faltou_sem_aviso",
		calendarAccent: "bg-orange-600",
		bg: "bg-orange-100/90 dark:bg-orange-500/20",
		hoverBg: "hover:bg-orange-200/90 dark:hover:bg-orange-500/30",
		text: "text-orange-900 dark:text-orange-400",
		subtext: "text-orange-800/80 dark:text-orange-300/80",
		accent: "bg-orange-600",
		indicator: "text-orange-700",
		allowedActions: ["view", "reschedule", "payment"],
	},
	nao_atendido: {
		borderColor: "border-gray-600",
		badgeBg: "bg-gray-100 dark:bg-gray-500/20",
		badgeText: "text-gray-700 dark:text-gray-300",
		iconColor: "text-gray-600 dark:text-gray-400",
		label: "Não atendido",
		icon: Slash,
		gradient: "from-gray-600/10 via-gray-600/15 to-gray-600/20",
		calendarClassName: "calendar-card-nao_atendido",
		calendarAccent: "bg-gray-600",
		bg: "bg-gray-100/90 dark:bg-gray-500/20",
		hoverBg: "hover:bg-gray-200/90 dark:hover:bg-gray-500/30",
		text: "text-gray-900 dark:text-gray-400",
		subtext: "text-gray-800/80 dark:text-gray-300/80",
		accent: "bg-gray-600",
		indicator: "text-gray-700",
		allowedActions: ["view", "reschedule"],
	},
	nao_atendido_sem_cobranca: {
		borderColor: "border-slate-950",
		badgeBg: "bg-slate-200 dark:bg-slate-800",
		badgeText: "text-slate-900 dark:text-slate-100",
		iconColor: "text-slate-900 dark:text-slate-100",
		label: "Não atendido (Sem cobrança)",
		icon: Slash,
		gradient: "from-slate-900/10 via-slate-900/15 to-slate-900/20",
		calendarClassName: "calendar-card-nao_atendido_sem_cobranca",
		calendarAccent: "bg-slate-900",
		bg: "bg-slate-200/90 dark:bg-slate-800/80",
		hoverBg: "hover:bg-slate-300/90 dark:hover:bg-slate-700/80",
		text: "text-slate-900 dark:text-slate-100",
		subtext: "text-slate-800/80 dark:text-slate-300/80",
		accent: "bg-slate-950",
		indicator: "text-slate-900",
		allowedActions: ["view", "reschedule"],
	},
	presenca_confirmada: {
		borderColor: "border-blue-900",
		badgeBg: "bg-blue-200 dark:bg-blue-900/40",
		badgeText: "text-blue-900 dark:text-blue-200",
		iconColor: "text-blue-800 dark:text-blue-300",
		label: "Presença confirmada",
		icon: UserCheck,
		gradient: "from-blue-900/10 via-blue-900/15 to-blue-900/20",
		calendarClassName: "calendar-card-presenca_confirmada",
		calendarAccent: "bg-blue-900",
		bg: "bg-blue-200/90 dark:bg-blue-900/40",
		hoverBg: "hover:bg-blue-300/90 dark:hover:bg-blue-900/50",
		text: "text-blue-900 dark:text-blue-100",
		subtext: "text-blue-800/80 dark:text-blue-200/80",
		accent: "bg-blue-900",
		indicator: "text-blue-900",
		allowedActions: [
			"complete",
			"miss",
			"cancel",
			"reschedule",
			"edit",
			"payment",
		],
	},
	aguardando_confirmacao: {
		borderColor: "border-amber-500",
		badgeBg: "bg-amber-100 dark:bg-amber-500/20",
		badgeText: "text-amber-700 dark:text-amber-300",
		iconColor: "text-amber-600 dark:text-amber-400",
		label: "Aguardando",
		icon: Clock,
		gradient: "from-amber-500/10 via-amber-500/15 to-amber-500/20",
		calendarClassName: "calendar-card-aguardando_confirmacao",
		calendarAccent: "bg-amber-500",
		bg: "bg-amber-100/90 dark:bg-amber-500/20",
		hoverBg: "hover:bg-amber-200/90 dark:hover:bg-amber-500/30",
		text: "text-amber-900 dark:text-amber-400",
		subtext: "text-amber-800/80 dark:text-amber-300/80",
		accent: "bg-amber-600",
		indicator: "text-amber-700",
		allowedActions: ["confirm", "cancel", "reschedule", "edit"],
	},
	remarcar: {
		borderColor: "border-slate-400",
		badgeBg: "bg-slate-100 dark:bg-slate-500/20",
		badgeText: "text-slate-700 dark:text-slate-300",
		iconColor: "text-slate-600 dark:text-slate-400",
		label: "Remarcar",
		icon: CalendarOff,
		gradient: "from-slate-400/10 via-slate-400/15 to-slate-400/20",
		calendarClassName: "calendar-card-remarcar",
		calendarAccent: "bg-slate-400",
		bg: "bg-slate-100/90 dark:bg-slate-500/20",
		hoverBg: "hover:bg-slate-200/90 dark:hover:bg-slate-500/30",
		text: "text-slate-900 dark:text-slate-400",
		subtext: "text-slate-800/80 dark:text-slate-300/80",
		accent: "bg-slate-500",
		indicator: "text-slate-700",
		allowedActions: ["reschedule", "cancel", "edit"],
	},
};

/**
 * Normaliza status vindo do backend (inglês/legado) para o valor canônico do frontend (PT-BR).
 *
 * FONTE ÚNICA: toda lógica de normalização de status deve viver aqui.
 */
export function normalizeStatus(status: string): string {
	const s = (status ?? "agendado").toLowerCase().trim();

	// Mapeamento para o sistema ZenFisio
	// IMPORTANTE: 'evaluation' vem do backend e deve ser mapeado para 'avaliacao'
	if (s === "evaluation") return "avaliacao";
	if (s === "confirmed" || s === "confirmado") return "presenca_confirmada";
	if (s === "scheduled" || s === "agendado") return "agendado";
	if (s === "cancelled" || s === "canceled" || s === "cancelado")
		return "cancelado";
	if (
		s === "no_show" ||
		s === "paciente_faltou" ||
		s === "faltou" ||
		s === "falta"
	)
		return "faltou";
	if (
		s === "rescheduled" ||
		s === "remarcado" ||
		s === "reagendado" ||
		s === "remarcar"
	)
		return "remarcar";
	if (
		s === "in_progress" ||
		s === "completed" ||
		s === "em_atendimento" ||
		s === "atendido" ||
		s === "concluido" ||
		s === "realizado"
	)
		return "atendido";
	if (s === "avaliacao") return "avaliacao";
	if (s === "faltou_com_aviso") return "faltou_com_aviso";
	if (s === "faltou_sem_aviso") return "faltou_sem_aviso";
	if (s === "nao_atendido") return "nao_atendido";
	if (s === "nao_atendido_sem_cobranca") return "nao_atendido_sem_cobranca";
	if (s === "presenca_confirmada") return "presenca_confirmada";
	if (s === "aguardando_confirmacao" || s === "aguardando")
		return "aguardando_confirmacao";

	// Default fallbacks
	if (s === "em_espera" || s === "atrasado") return "agendado";

	// Já é um valor canônico ou desconhecido — tenta manter ou agendar
	return APPOINTMENT_STATUS_CONFIG[s] ? s : "agendado";
}

/**
 * Lista ordenada de status disponíveis para dropdowns e filtros.
 */
export const APPOINTMENT_STATUS_OPTIONS = [
	"agendado",
	"atendido",
	"avaliacao",
	"aguardando_confirmacao",
	"faltou",
	"faltou_com_aviso",
	"faltou_sem_aviso",
	"nao_atendido",
	"nao_atendido_sem_cobranca",
	"presenca_confirmada",
	"remarcar",
	"cancelado",
] as const;

/**
 * Get status configuration for a given status
 *
 * @param status - Appointment status
 * @returns Status configuration (defaults to 'agendado')
 */
export function getStatusConfig(status: string): AppointmentStatusConfig {
	const normalized = normalizeStatus(status);
	return (
		APPOINTMENT_STATUS_CONFIG[normalized] || APPOINTMENT_STATUS_CONFIG.agendado
	);
}

/**
 * Get status color for mobile/external use
 *
 * @param status - Appointment status
 * @returns Hex color code
 */
export function getStatusColor(status: string): string {
	const normalized = normalizeStatus(status);
	const colors: Record<string, string> = {
		agendado: "#3b82f6",
		atendido: "#10b981",
		avaliacao: "#8b5cf6",
		cancelado: "#000000",
		aguardando_confirmacao: "#f59e0b",
		faltou: "#ef4444",
		faltou_com_aviso: "#2dd4bf",
		faltou_sem_aviso: "#f97316",
		nao_atendido: "#4b5563",
		nao_atendido_sem_cobranca: "#000000",
		presenca_confirmada: "#1e3a8a",
		remarcar: "#64748b",
	};
	return colors[normalized] || colors.agendado;
}
