import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string | null;
  user_name: string | null;
  action: string;
  table_name: string;
  old_data: any;
  new_data: any;
}

export function useAuditLogs(filters?: {
  action?: string;
  tableName?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as AuditLog[];
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  return { logs, isLoading };
}
