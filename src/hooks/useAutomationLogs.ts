/**
 * useAutomationLogs - Lista logs de execução de automações (organizations/{orgId}/automation_logs)
 */

import { useQuery } from "@tanstack/react-query";
import {
	automationApi,
	type AutomationLogEntry as AutomationLogEntryType,
} from "@/api/v2";

export type AutomationLogEntry = AutomationLogEntryType;

export function useAutomationLogs(
	organizationId: string | null | undefined,
	options: { limitCount?: number } = {},
) {
	const limitCount = options.limitCount ?? 50;

	return useQuery({
		queryKey: ["automation-logs", organizationId, limitCount],
		queryFn: async (): Promise<AutomationLogEntry[]> => {
			if (!organizationId) return [];
			const res = await automationApi.logs({ limit: limitCount });
			return res?.data ?? [];
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60, // 1 minute
	});
}
