export const STATUS_TABS = [
	{ value: "all", label: "Todas" },
	{ value: "open", label: "Abertas" },
	{ value: "pending", label: "Pendentes" },
	{ value: "mine", label: "Minhas" },
	{ value: "resolved", label: "Resolvidas" },
];

export const STATUS_COLORS: Record<string, string> = {
	open: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
	pending:
		"bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
	resolved:
		"bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
	closed:
		"bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
};

export const PRIORITY_COLORS: Record<string, string> = {
	low: "text-gray-400",
	medium: "text-blue-500",
	high: "text-orange-500",
	urgent: "text-red-500",
};

export const PRIORITY_LABELS: Record<string, string> = {
	low: "Baixa",
	medium: "Média",
	high: "Alta",
	urgent: "Urgente",
};

export const STATUS_LABELS: Record<string, string> = {
	open: "Aberta",
	pending: "Pendente",
	resolved: "Resolvida",
	closed: "Fechada",
};

export function statusLabel(status: string): string {
	return STATUS_LABELS[status] ?? status;
}

export const SNOOZE_OPTIONS = [
	{ label: "1 hora", hours: 1 },
	{ label: "4 horas", hours: 4 },
	{ label: "8 horas", hours: 8 },
	{ label: "Amanhã", hours: 24 },
	{ label: "Próxima semana", hours: 168 },
];
