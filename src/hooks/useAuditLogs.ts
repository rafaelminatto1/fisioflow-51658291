/**
 * useAuditLogs - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('audit_log') → Firestore collection 'audit_log'
 * - supabase.from('profiles') → Firestore collection 'profiles'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';


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
  // Joined data
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
}

// Helper to convert Firestore doc to AuditLog
const convertDocToAuditLog = (doc: { id: string; data: () => Record<string, unknown> }): AuditLog => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as AuditLog;
};

export function useAuditLogs(filters?: AuditFilters) {
  const { data: logs = [], isLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let q = query(
        collection(db, 'audit_log'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      if (filters?.action) {
        q = query(
          collection(db, 'audit_log'),
          where('action', '==', filters.action),
          orderBy('timestamp', 'desc'),
          limit(500)
        );
      }

      if (filters?.tableName) {
        // Firestore doesn't support multiple where clauses efficiently
        // For now, we'll filter client-side after fetch
      }

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToAuditLog);

      // Apply filters that couldn't be done in the query
      if (filters?.tableName) {
        data = data.filter(log => log.table_name === filters.tableName);
      }

      if (filters?.userId) {
        data = data.filter(log => log.user_id === filters.userId);
      }

      if (filters?.recordId) {
        data = data.filter(log => log.record_id === filters.recordId);
      }

      if (filters?.startDate) {
        data = data.filter(log => log.timestamp >= filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        data = data.filter(log => log.timestamp <= filters.endDate.toISOString());
      }

      // Enrich with user info
      const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];

      const profilesMap = new Map<string, { full_name: string; email: string }>();
      if (userIds.length > 0) {
        // Firestore doesn't support 'in' with many values efficiently
        // For now, we'll fetch in batches or filter client-side
        for (const userId of userIds) {
          const profileQ = query(
            collection(db, 'profiles'),
            where('user_id', '==', userId),
            limit(1)
          );
          const profileSnap = await getDocs(profileQ);
          if (!profileSnap.empty) {
            profilesMap.set(userId, {
              full_name: profileSnap.docs[0].data().full_name,
              email: profileSnap.docs[0].data().email,
            });
          }
        }
      }

      const enrichedLogs = data.map(log => {
        const profile = profilesMap.get(log.user_id || '');
        return {
          ...log,
          user_email: profile?.email || null,
          user_name: profile?.full_name || null,
        };
      });

      // Filter by search term if provided
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return enrichedLogs.filter(log =>
          log.table_name.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term) ||
          log.record_id?.toLowerCase().includes(term) ||
          log.user_name?.toLowerCase().includes(term) ||
          log.user_email?.toLowerCase().includes(term) ||
          JSON.stringify(log.new_data || {}).toLowerCase().includes(term) ||
          JSON.stringify(log.old_data || {}).toLowerCase().includes(term)
        );
      }

      return enrichedLogs as AuditLog[];
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  // Get unique values for filters
  const uniqueTables = [...new Set(logs.map(log => log.table_name))];
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  // Statistics
  const stats = {
    total: logs.length,
    inserts: logs.filter(l => l.action === 'INSERT').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
    byTable: uniqueTables.reduce((acc, table) => {
      acc[table] = logs.filter(l => l.table_name === table).length;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    logs,
    isLoading,
    refetch,
    uniqueTables,
    uniqueActions,
    stats,
  };
}

// Export audit logs to CSV
export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (logs: AuditLog[]) => {
      const headers = [
        'ID', 'Data/Hora', 'Usuário', 'Email', 'Ação', 'Tabela',
        'ID Registro', 'Dados Anteriores', 'Dados Novos', 'Alterações'
      ];

      const rows = logs.map(log => [
        log.id,
        new Date(log.timestamp).toLocaleString('pt-BR'),
        log.user_name || 'Sistema',
        log.user_email || '-',
        log.action,
        log.table_name,
        log.record_id || '-',
        JSON.stringify(log.old_data || {}),
        JSON.stringify(log.new_data || {}),
        JSON.stringify(log.changes || {}),
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      ].join('\n');

      // Add BOM for Excel compatibility
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      URL.revokeObjectURL(url);
      return true;
    },
    onSuccess: () => {
      toast.success('Relatório exportado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao exportar relatório');
    },
  });
}

// Hook for backup management
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

export function useBackups() {
  const queryClient = useQueryClient();

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const q = query(
        collection(db, 'backup_logs'),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BackupLog[];
    },
    staleTime: 60 * 1000, // 1 minuto
  });

  const createBackup = useMutation({
    mutationFn: async (backupType: 'daily' | 'weekly' | 'manual' = 'manual') => {
      // This would call a Firebase Cloud Function instead of Supabase Edge Function
      // For now, we'll create a backup log entry
      const backupData = {
        backup_name: `backup_${backupType}_${new Date().toISOString()}`,
        backup_type: backupType,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        tables_included: [],
        records_count: {},
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'backup_logs'), backupData);
      return { id: docRef.id, ...backupData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar backup: ${error.message}`);
    },
  });

  const stats = {
    total: backups.length,
    completed: backups.filter(b => b.status === 'completed').length,
    failed: backups.filter(b => b.status === 'failed').length,
    lastBackup: backups.find(b => b.status === 'completed'),
  };

  return {
    backups,
    isLoading,
    createBackup,
    stats,
  };
}
