/**
 * Audit Logging Middleware
 * Middleware para registrar ações sensíveis no sistema
 */

import { getPool } from '../init';
import { logger } from '../lib/logger';

/**
 * Tipos de ações auditadas
 */
export enum AuditAction {
  // Pacientes
  PATIENT_CREATE = 'patient.create',
  PATIENT_UPDATE = 'patient.update',
  PATIENT_DELETE = 'patient.delete',
  PATIENT_VIEW = 'patient.view',

  // Agendamentos
  APPOINTMENT_CREATE = 'appointment.create',
  APPOINTMENT_UPDATE = 'appointment.update',
  APPOINTMENT_CANCEL = 'appointment.cancel',
  APPOINTMENT_DELETE = 'appointment.delete',

  // Financeiro
  PAYMENT_CREATE = 'payment.create',
  PAYMENT_UPDATE = 'payment.update',
  PAYMENT_DELETE = 'payment.delete',
  TRANSACTION_CREATE = 'transaction.create',
  TRANSACTION_UPDATE = 'transaction.update',
  TRANSACTION_DELETE = 'transaction.delete',

  // Prontuário
  MEDICAL_RECORD_CREATE = 'medical_record.create',
  MEDICAL_RECORD_UPDATE = 'medical_record.update',
  MEDICAL_RECORD_DELETE = 'medical_record.delete',
  TREATMENT_SESSION_CREATE = 'treatment_session.create',
  TREATMENT_SESSION_UPDATE = 'treatment_session.update',

  // Avaliações
  ASSESSMENT_CREATE = 'assessment.create',
  ASSESSMENT_UPDATE = 'assessment.update',
  ASSESSMENT_DELETE = 'assessment.delete',

  // Sistema
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  PERMISSION_CHANGE = 'permission.change',
  EXPORT_DATA = 'data.export',
  IMPORT_DATA = 'data.import',
}

/**
 * Categorias de ações
 */
export enum AuditCategory {
  PATIENT = 'patient',
  APPOINTMENT = 'appointment',
  FINANCIAL = 'financial',
  MEDICAL = 'medical',
  ASSESSMENT = 'assessment',
  USER = 'user',
  SYSTEM = 'system',
}

/**
 * Interface para entrada de log de auditoria
 */
export interface AuditLogEntry {
  action: AuditAction;
  category: AuditCategory;
  user_id: string;
  user_name?: string;
  user_email?: string;
  organization_id: string;
  resource_id?: string;
  resource_type?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Tabela de audit logs no PostgreSQL
 */
const AUDIT_LOG_TABLE = 'audit_logs';

/**
 * Inicializa a tabela de audit logs se não existir
 */
async function initAuditLogTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${AUDIT_LOG_TABLE} (
      id SERIAL PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      organization_id VARCHAR(255) NOT NULL,
      resource_id VARCHAR(255),
      resource_type VARCHAR(100),
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      success BOOLEAN NOT NULL DEFAULT true,
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON ${AUDIT_LOG_TABLE}(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON ${AUDIT_LOG_TABLE}(organization_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON ${AUDIT_LOG_TABLE}(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON ${AUDIT_LOG_TABLE}(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON ${AUDIT_LOG_TABLE}(created_at DESC);

    -- Criar partição por mês para melhor performance
    -- (opcional, para grandes volumes de dados)
  `);
}

/**
 * Registra uma ação de auditoria
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const pool = getPool();

  try {
    // Inicializar tabela se necessário (em background)
    initAuditLogTable().catch(() => {});

    await pool.query(`
      INSERT INTO ${AUDIT_LOG_TABLE} (
        action, category, user_id, user_name, user_email,
        organization_id, resource_id, resource_type, details,
        ip_address, user_agent, success, error_message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      entry.action,
      entry.category,
      entry.user_id,
      entry.user_name || null,
      entry.user_email || null,
      entry.organization_id,
      entry.resource_id || null,
      entry.resource_type || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.success,
      entry.error_message || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]);

    logger.info(`[AuditLog] ${entry.action}: ${entry.user_id} - ${entry.resource_type || 'N/A'}:${entry.resource_id || 'N/A'}`);
  } catch (error) {
    // Não falhar a operação se o audit log falhar
    logger.error('[AuditLog] Error logging audit entry:', error);
  }
}

/**
 * Wrapper para funções com audit logging automático
 */
export function withAuditLog<T extends any[], R>(
  action: AuditAction,
  category: AuditCategory,
  handler: (context: AuditContext, ...args: T) => Promise<R>
) {
  return async (
    request: { auth?: any; rawRequest?: any; data?: any },
    ...args: T
  ): Promise<R> => {
    const startTime = Date.now();
    const context: AuditContext = {
      userId: request.auth?.uid || request.auth?.token?.user_id || 'anonymous',
      userName: request.auth?.token?.name || request.auth?.token?.email,
      userEmail: request.auth?.token?.email,
      organizationId: request.auth?.token?.organization_id || 'unknown',
      ipAddress: request.rawRequest?.headers?.['x-forwarded-for'] ||
                request.rawRequest?.headers?.['fastly-client-ip'] ||
                request.rawRequest?.socket?.remoteAddress,
      userAgent: request.rawRequest?.headers?.['user-agent'],
      requestData: request.data,
    };

    try {
      const result = await handler(context, ...args);

      // Log sucesso
      await logAudit({
        action,
        category,
        user_id: context.userId,
        user_name: context.userName,
        user_email: context.userEmail,
        organization_id: context.organizationId,
        resource_id: context.resourceId,
        resource_type: context.resourceType,
        details: {
          duration_ms: Date.now() - startTime,
          request_data: context.requestData,
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        success: true,
        metadata: context.metadata,
      });

      return result;
    } catch (error: any) {
      // Log erro
      await logAudit({
        action,
        category,
        user_id: context.userId,
        user_name: context.userName,
        user_email: context.userEmail,
        organization_id: context.organizationId,
        resource_id: context.resourceId,
        resource_type: context.resourceType,
        details: {
          duration_ms: Date.now() - startTime,
          request_data: context.requestData,
          error_message: error.message,
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        success: false,
        error_message: error.message,
        metadata: context.metadata,
      });

      throw error;
    }
  };
}

/**
 * Contexto de auditoria
 */
export interface AuditContext {
  userId: string;
  userName?: string;
  userEmail?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  requestData?: any;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
}

/**
 * Cria um contexto de auditoria a partir de uma requisição
 */
export function createAuditContext(
  request: { auth?: any; rawRequest?: any; data?: any },
  resourceType?: string
): AuditContext {
  return {
    userId: request.auth?.uid || request.auth?.token?.user_id || 'anonymous',
    userName: request.auth?.token?.name || request.auth?.token?.email,
    userEmail: request.auth?.token?.email,
    organizationId: request.auth?.token?.organization_id || 'unknown',
    ipAddress: request.rawRequest?.headers?.['x-forwarded-for'] ||
              request.rawRequest?.headers?.['fastly-client-ip'] ||
              request.rawRequest?.socket?.remoteAddress,
    userAgent: request.rawRequest?.headers?.['user-agent'],
    requestData: request.data,
    resourceType,
  };
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs(filters: {
  organization_id?: string;
  user_id?: string;
  action?: AuditAction;
  category?: AuditCategory;
  resource_id?: string;
  resource_type?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: any[]; total: number }> {
  const pool = getPool();

  try {
    let query = `SELECT * FROM ${AUDIT_LOG_TABLE} WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 0;

    if (filters.organization_id) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      params.push(filters.organization_id);
    }

    if (filters.user_id) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(filters.user_id);
    }

    if (filters.action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(filters.action);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.resource_id) {
      paramCount++;
      query += ` AND resource_id = $${paramCount}`;
      params.push(filters.resource_id);
    }

    if (filters.resource_type) {
      paramCount++;
      query += ` AND resource_type = $${paramCount}`;
      params.push(filters.resource_type);
    }

    if (filters.start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.end_date);
    }

    // Buscar total
    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    // Ordenar e paginar
    query += ` ORDER BY created_at DESC`;
    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);

    return {
      logs: result.rows,
      total,
    };
  } catch (error) {
    logger.error('[AuditLog] Error getting audit logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Limpa logs antigos de auditoria
 */
export async function cleanupAuditLogs(olderThanDays: number = 90): Promise<number> {
  const pool = getPool();

  try {
    const result = await pool.query(`
      DELETE FROM ${AUDIT_LOG_TABLE}
      WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `);

    logger.info(`[AuditLog] Cleaned up ${result.rows.length} old audit log entries`);
    return result.rows.length;
  } catch (error) {
    logger.error('[AuditLog] Error cleaning up audit logs:', error);
    return 0;
  }
}

/**
 * Exporta logs de auditoria para CSV/JSON
 */
export async function exportAuditLogs(filters: {
  organization_id: string;
  start_date: Date;
  end_date: Date;
  format?: 'csv' | 'json';
}): Promise<string> {
  const { logs } = await getAuditLogs(filters);

  if (filters.format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV format
  const headers = ['created_at', 'action', 'category', 'user_id', 'user_name', 'user_email',
                   'organization_id', 'resource_id', 'resource_type', 'success', 'error_message'];
  const csvRows = [headers.join(',')];

  for (const log of logs) {
    const row = headers.map(h => {
      const val = log[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    });
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Funções de conveniência para ações comuns
 */
export const audit = {
  patientCreated: (context: AuditContext, patientId: string, details?: Record<string, any>) =>
    logAudit({
      action: AuditAction.PATIENT_CREATE,
      category: AuditCategory.PATIENT,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: patientId,
      resource_type: 'patient',
      details,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  patientUpdated: (context: AuditContext, patientId: string, changes?: Record<string, any>) =>
    logAudit({
      action: AuditAction.PATIENT_UPDATE,
      category: AuditCategory.PATIENT,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: patientId,
      resource_type: 'patient',
      details: { changes },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  patientDeleted: (context: AuditContext, patientId: string) =>
    logAudit({
      action: AuditAction.PATIENT_DELETE,
      category: AuditCategory.PATIENT,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: patientId,
      resource_type: 'patient',
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  appointmentCreated: (context: AuditContext, appointmentId: string, details?: Record<string, any>) =>
    logAudit({
      action: AuditAction.APPOINTMENT_CREATE,
      category: AuditCategory.APPOINTMENT,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: appointmentId,
      resource_type: 'appointment',
      details,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  paymentCreated: (context: AuditContext, paymentId: string, amount: number, details?: Record<string, any>) =>
    logAudit({
      action: AuditAction.PAYMENT_CREATE,
      category: AuditCategory.FINANCIAL,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: paymentId,
      resource_type: 'payment',
      details: { amount, ...details },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  permissionChanged: (context: AuditContext, targetUserId: string, changes: Record<string, any>) =>
    logAudit({
      action: AuditAction.PERMISSION_CHANGE,
      category: AuditCategory.USER,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      resource_id: targetUserId,
      resource_type: 'user',
      details: { changes },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),

  dataExported: (context: AuditContext, exportType: string, recordCount: number) =>
    logAudit({
      action: AuditAction.EXPORT_DATA,
      category: AuditCategory.SYSTEM,
      user_id: context.userId,
      user_name: context.userName,
      user_email: context.userEmail,
      organization_id: context.organizationId,
      details: { export_type: exportType, record_count: recordCount },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      success: true,
    }),
};
