import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Calcula as diferenças entre dois objetos
 */
export function calculateDiff(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): Record<string, { old: unknown; new: unknown }> {
  if (!oldData || !newData) return {};

  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Check all keys in newData
  for (const key of Object.keys(newData)) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  }

  // Check for deleted keys
  for (const key of Object.keys(oldData)) {
    if (!(key in newData)) {
      changes[key] = {
        old: oldData[key],
        new: undefined,
      };
    }
  }

  return changes;
}

/**
 * Registra uma entrada de auditoria manualmente
 * Útil quando os triggers automáticos não são suficientes
 */
export async function logAuditEntry(entry: AuditEntry): Promise<boolean> {
  try {
    const { error } = await supabase.from('audit_log').insert({
      action: entry.action,
      table_name: entry.table_name,
      record_id: entry.record_id || null,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      changes: entry.changes || null,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      logger.error('Erro ao registrar entrada de auditoria', error, 'AuditMiddleware');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Erro no middleware de auditoria', error, 'AuditMiddleware');
    return false;
  }
}

/**
 * Wrapper para operações com auditoria automática
 * Útil para operações que não passam pelos triggers do banco
 */
export function withAudit<T>(
  tableName: string,
  operation: () => Promise<{ data: T | null; error: Error | null; oldData?: Record<string, unknown> }>
): Promise<{ data: T | null; error: Error | null }> {
  return operation().then(async (result) => {
    // Log is handled by database triggers
    // This wrapper is for future extensibility
    return result;
  });
}

/**
 * Formata a entrada de auditoria para exibição
 */
export function formatAuditEntry(entry: AuditEntry): string {
  const actionLabels: Record<AuditAction, string> = {
    INSERT: 'criou',
    UPDATE: 'atualizou',
    DELETE: 'excluiu',
  };

  const tableLabels: Record<string, string> = {
    patients: 'paciente',
    appointments: 'agendamento',
    contas_financeiras: 'transação',
    profiles: 'perfil',
    exercises: 'exercício',
    eventos: 'evento',
    leads: 'lead',
    vouchers: 'voucher',
    session_packages: 'pacote de sessões',
  };

  const action = actionLabels[entry.action] || entry.action;
  const table = tableLabels[entry.table_name] || entry.table_name;

  return `${action} ${table}${entry.record_id ? ` (${entry.record_id.substring(0, 8)}...)` : ''}`;
}

/**
 * Verifica se uma tabela deve ser auditada
 */
export function shouldAuditTable(tableName: string): boolean {
  const auditedTables = [
    'patients',
    'appointments',
    'contas_financeiras',
    'profiles',
    'user_roles',
    'session_packages',
    'eventos',
    'leads',
    'exercises',
    'vouchers',
  ];

  return auditedTables.includes(tableName);
}

/**
 * Campos sensíveis que devem ser mascarados no log
 */
const sensitiveFields = ['password', 'cpf', 'token', 'secret', 'key'];

/**
 * Mascara campos sensíveis nos dados de auditoria
 */
export function maskSensitiveData(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;

  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (field in masked && masked[field]) {
      masked[field] = '***MASKED***';
    }
  }

  return masked;
}