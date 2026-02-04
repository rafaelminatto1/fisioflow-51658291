/**
 * useAutomationLogs - Lista logs de execução de automações (organizations/{orgId}/automation_logs)
 */

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit } from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';
import type { Timestamp } from '@/integrations/firebase/app';

export interface AutomationLogEntry {
  id: string;
  automation_id: string;
  automation_name: string;
  status: 'success' | 'failed' | 'skipped';
  started_at: Timestamp | { seconds: number; nanoseconds: number };
  completed_at: Timestamp | { seconds: number; nanoseconds: number };
  duration_ms: number;
  error?: string;
}

function parseLogDoc(doc: { id: string; data: () => Record<string, unknown> }): AutomationLogEntry {
  const d = doc.data();
  return {
    id: doc.id,
    automation_id: (d.automation_id as string) ?? '',
    automation_name: (d.automation_name as string) ?? '',
    status: (d.status as 'success' | 'failed' | 'skipped') ?? 'success',
    started_at: (d.started_at as Timestamp) ?? { seconds: 0, nanoseconds: 0 },
    completed_at: (d.completed_at as Timestamp) ?? { seconds: 0, nanoseconds: 0 },
    duration_ms: (d.duration_ms as number) ?? 0,
    error: d.error as string | undefined,
  };
}

export function useAutomationLogs(organizationId: string | null | undefined, options: { limitCount?: number } = {}) {
  const limitCount = options.limitCount ?? 50;

  return useQuery({
    queryKey: ['automation-logs', organizationId, limitCount],
    queryFn: async (): Promise<AutomationLogEntry[]> => {
      if (!organizationId) return [];
      const ref = collection(db, 'organizations', organizationId, 'automation_logs');
      const q = query(ref, orderBy('started_at', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => parseLogDoc({ id: doc.id, data: () => doc.data() }));
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60, // 1 minute
  });
}
