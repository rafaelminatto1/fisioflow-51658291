/**
 * useAuditLogs - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	auditApi,
	type AuditLog as WorkerAuditLog,
} from "@/lib/api/workers-client";
import { toast } from "sonner";

export interface AuditLog {
	id: string;
	timestamp: string;
	user_id: string | null;
	action: string;
	table_name: string;
	record_id: string | null;
	old_data: Record<string, unknown> | null;
	new_data: Record<string, unknown> | null;
	changes: Record<string, unknown> | null;
	ip_address: string | null;
	user_agent: string | null;
	session_id: string | null;
	user_email?: string | null;
	user_name?: string | null;
}

export interface AuditFilters {
	action?: string;
	tableName?: string;
	userId?: string;
	recordId?: string;
	startDate?: Date;
	endDate?: Date;
	searchTerm?: string;
	limit?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return parsed && typeof parsed === "object"
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}
	return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeAuditLog(
	rawLog: WorkerAuditLog | Record<string, unknown>,
): AuditLog {
	const raw = rawLog as Record<string, unknown>;
	const changes = asRecord(raw.changes);
	const oldData = asRecord(raw.old_data ?? changes?.old_data ?? changes?.old);
	const newData = asRecord(raw.new_data ?? changes?.new_data ?? changes?.new);
	const timestampRaw = raw.created_at ?? raw.timestamp;
	const timestamp =
		typeof timestampRaw === "string" ? timestampRaw : new Date().toISOString();

	return {
		id: String(raw.id ?? ""),
		timestamp,
		user_id: (raw.user_id as string) ?? null,
		action: String(raw.action ?? "UNKNOWN"),
		table_name: String(raw.entity_type ?? raw.table_name ?? "unknown"),
		record_id: (raw.entity_id as string) ?? (raw.record_id as string) ?? null,
		old_data: oldData,
		new_data: newData,
		changes,
		ip_address: (raw.ip_address as string) ?? null,
		user_agent: (raw.user_agent as string) ?? null,
		session_id: (raw.session_id as string) ?? null,
		user_email: (raw.user_email as string) ?? null,
		user_name: (raw.user_name as string) ?? null,
	};
}

export function useAuditLogs(filters?: AuditFilters) {
	const {
		data: logs = [],
		isLoading,
		refetch,
	} = useQuery<AuditLog[]>({
		queryKey: ["audit-logs", filters],
		queryFn: async () => {
			const res = await auditApi.list({
				entityType: filters?.tableName,
				entityId: filters?.recordId,
				limit: filters?.limit ?? 500,
			});

			let data = ((res?.data ?? []) as WorkerAuditLog[]).map(normalizeAuditLog);

			if (filters?.action) {
				data = data.filter((log) => log.action === filters.action);
			}
			if (filters?.userId) {
				data = data.filter((log) => log.user_id === filters.userId);
			}
			if (filters?.startDate) {
				data = data.filter(
					(log) => new Date(log.timestamp) >= filters.startDate!,
				);
			}
			if (filters?.endDate) {
				data = data.filter(
					(log) => new Date(log.timestamp) <= filters.endDate!,
				);
			}
			if (filters?.searchTerm) {
				const term = filters.searchTerm.toLowerCase();
				data = data.filter((log) => {
					const oldData = JSON.stringify(log.old_data ?? {}).toLowerCase();
					const newData = JSON.stringify(log.new_data ?? {}).toLowerCase();
					const changes = JSON.stringify(log.changes ?? {}).toLowerCase();
					return (
						log.table_name.toLowerCase().includes(term) ||
						log.action.toLowerCase().includes(term) ||
						(log.record_id?.toLowerCase().includes(term) ?? false) ||
						(log.user_name?.toLowerCase().includes(term) ?? false) ||
						(log.user_email?.toLowerCase().includes(term) ?? false) ||
						oldData.includes(term) ||
						newData.includes(term) ||
						changes.includes(term)
					);
				});
			}

			return data;
		},
		staleTime: 30 * 1000,
	});

	const uniqueTables = [
		...new Set(logs.map((log) => log.table_name).filter(Boolean)),
	];
	const uniqueActions = [
		...new Set(logs.map((log) => log.action).filter(Boolean)),
	];

	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const loginLogs = logs.filter((l) => l.action.startsWith("LOGIN_"));
	const loginSuccesses = loginLogs.filter(
		(l) => l.action === "LOGIN_SUCCESS",
	).length;
	const loginFailures = loginLogs.filter(
		(l) => l.action === "LOGIN_FAILURE",
	).length;
	const totalLogins = loginLogs.length;

	const stats = {
		total: logs.length,
		inserts: logs.filter((l) => l.action === "INSERT").length,
		updates: logs.filter((l) => l.action === "UPDATE").length,
		deletes: logs.filter((l) => l.action === "DELETE").length,
		logins: {
			total: totalLogins,
			successes: loginSuccesses,
			failures: loginFailures,
			successRate: totalLogins > 0 ? (loginSuccesses / totalLogins) * 100 : 0,
			suspicious: loginLogs.filter(
				(l) =>
					l.action === "LOGIN_FAILURE" && new Date(l.timestamp) >= oneHourAgo,
			).length,
		},
		byTable: uniqueTables.reduce(
			(acc, table) => {
				acc[table] = logs.filter((l) => l.table_name === table).length;
				return acc;
			},
			{} as Record<string, number>,
		),
	};

	return {
		logs,
		isLoading,
		refetch,
		uniqueTables,
		uniqueActions,
		uniqueEntities: uniqueTables,
		stats,
	};
}

export function useExportAuditLogs() {
	return useMutation({
		mutationFn: async (logs: AuditLog[]) => {
			const headers = [
				"ID",
				"Data/Hora",
				"Usuário",
				"Email",
				"Ação",
				"Tabela",
				"ID Registro",
				"Dados Anteriores",
				"Dados Novos",
				"Alterações",
			];

			const rows = logs.map((log) => [
				log.id,
				new Date(log.timestamp).toLocaleString("pt-BR"),
				log.user_name || "Sistema",
				log.user_email || "-",
				log.action,
				log.table_name,
				log.record_id || "-",
				JSON.stringify(log.old_data || {}),
				JSON.stringify(log.new_data || {}),
				JSON.stringify(log.changes || {}),
			]);

			const csvContent = [
				headers.join(";"),
				...rows.map((row) =>
					row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
				),
			].join("\n");

			const blob = new Blob(["\uFEFF" + csvContent], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
			link.click();
			URL.revokeObjectURL(url);
			return true;
		},
		onSuccess: () => toast.success("Relatório exportado com sucesso!"),
		onError: () => toast.error("Erro ao exportar relatório"),
	});
}

export interface BackupLog {
	id: string;
	backup_name: string;
	backup_type: string;
	file_path: string | null;
	file_size_bytes: number | null;
	tables_included: string[];
	records_count: Record<string, number>;
	status: string;
	started_at: string;
	completed_at: string | null;
	restored_at: string | null;
	error_message: string | null;
	created_at: string;
}

const BACKUPS_STORAGE_KEY = "fisioflow.backup_logs";

function readBackupLogs(): BackupLog[] {
	if (typeof window === "undefined") return [];
	const raw = window.localStorage.getItem(BACKUPS_STORAGE_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as BackupLog[]) : [];
	} catch {
		return [];
	}
}

function writeBackupLogs(logs: BackupLog[]) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(logs));
}

export function useBackups() {
	const queryClient = useQueryClient();

	const { data: backups = [], isLoading } = useQuery({
		queryKey: ["backups"],
		queryFn: async () => readBackupLogs(),
		staleTime: 60 * 1000,
	});

	const createBackup = useMutation({
		mutationFn: async (
			backupType: "daily" | "weekly" | "manual" = "manual",
		) => {
			const now = new Date().toISOString();
			const backup: BackupLog = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				backup_name: `backup_${backupType}_${now}`,
				backup_type: backupType,
				file_path: null,
				file_size_bytes: null,
				tables_included: [],
				records_count: {},
				status: "completed",
				started_at: now,
				completed_at: now,
				restored_at: null,
				error_message: null,
				created_at: now,
			};

			const current = readBackupLogs();
			const updated = [backup, ...current].sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			);
			writeBackupLogs(updated);
			return backup;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["backups"] });
			toast.success("Backup criado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(`Erro ao criar backup: ${error.message}`);
		},
	});

	const stats = {
		total: backups.length,
		completed: backups.filter((b) => b.status === "completed").length,
		failed: backups.filter((b) => b.status === "failed").length,
		lastBackup: backups.find((b) => b.status === "completed"),
	};

	return {
		backups,
		isLoading,
		createBackup,
		stats,
	};
}
