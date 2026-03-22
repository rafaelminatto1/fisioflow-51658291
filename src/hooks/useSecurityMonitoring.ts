import { useQuery } from "@tanstack/react-query";
import {
	auditApi,
	type AuditLog as WorkerAuditLog,
} from "@/api/v2";

interface LoginAttempt {
	id: string;
	email: string;
	success: boolean;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
}

interface SuspiciousActivity {
	id: string;
	email: string;
	failed_attempts: number;
	last_attempt: string;
	ip_addresses: string[];
}

function getEmail(log: WorkerAuditLog): string {
	const raw = log as unknown as Record<string, unknown>;
	return String(raw.user_email ?? raw.email ?? "desconhecido");
}

function isLoginAction(action: string | undefined): boolean {
	const normalized = (action ?? "").toLowerCase();
	return (
		normalized.includes("login") ||
		normalized.includes("signin") ||
		normalized.includes("auth")
	);
}

function isSuccessfulLogin(
	action: string | undefined,
	changes: unknown,
): boolean {
	const normalized = (action ?? "").toLowerCase();
	if (
		normalized.includes("fail") ||
		normalized.includes("error") ||
		normalized.includes("blocked")
	) {
		return false;
	}

	if (changes && typeof changes === "object") {
		const record = changes as Record<string, unknown>;
		if (typeof record.success === "boolean") return record.success;
	}

	return normalized.includes("success") || normalized.includes("user.login");
}

export function useSecurityMonitoring() {
	const { data, isLoading } = useQuery({
		queryKey: ["security-monitoring"],
		queryFn: async () => {
			const res = await auditApi.list({ limit: 200 });
			const logs = (res?.data ?? []) as WorkerAuditLog[];

			const recentAttempts: LoginAttempt[] = logs
				.filter((log) => isLoginAction(log.action))
				.slice(0, 50)
				.map((log) => ({
					id: log.id,
					email: getEmail(log),
					success: isSuccessfulLogin(log.action, log.changes),
					ip_address: log.ip_address ?? null,
					user_agent: null,
					created_at: log.created_at,
				}));

			const oneHourAgo = Date.now() - 60 * 60 * 1000;
			const grouped = new Map<string, SuspiciousActivity>();

			recentAttempts
				.filter(
					(attempt) =>
						!attempt.success &&
						new Date(attempt.created_at).getTime() >= oneHourAgo,
				)
				.forEach((attempt) => {
					const current = grouped.get(attempt.email) ?? {
						id: attempt.email,
						email: attempt.email,
						failed_attempts: 0,
						last_attempt: attempt.created_at,
						ip_addresses: [],
					};

					current.failed_attempts += 1;
					current.last_attempt =
						new Date(attempt.created_at) > new Date(current.last_attempt)
							? attempt.created_at
							: current.last_attempt;
					if (
						attempt.ip_address &&
						!current.ip_addresses.includes(attempt.ip_address)
					) {
						current.ip_addresses.push(attempt.ip_address);
					}
					grouped.set(attempt.email, current);
				});

			const suspiciousActivity = Array.from(grouped.values()).filter(
				(item) => item.failed_attempts >= 3,
			);

			return { recentAttempts, suspiciousActivity };
		},
		staleTime: 30 * 1000,
		refetchInterval: 60 * 1000,
	});

	return {
		recentAttempts: data?.recentAttempts ?? [],
		suspiciousActivity: data?.suspiciousActivity ?? [],
		isLoading,
	};
}
