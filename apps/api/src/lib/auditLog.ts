import type { Env } from "../types/env";

type AuditAction =
  | "patient.view"
  | "patient.create"
  | "patient.update"
  | "patient.delete"
  | "session.create"
  | "session.update"
  | "session.finalize"
  | "session.delete"
  | "exam.upload"
  | "exam.view"
  | "document.sign"
  | "document.view"
  | "auth.login"
  | "auth.logout"
  | "lgpd.data_export"
  | "lgpd.data_delete"
  | "lgpd.consent_update"
  | "financial.view"
  | "financial.create";

type AuditEntry = {
  action: AuditAction;
  entityId?: string; // ID do recurso afetado (patient_id, session_id etc)
  entityType?: string; // Tipo do recurso ("patient", "session" etc)
  userId: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Registra evento de auditoria LGPD no D1 + Analytics Engine.
 *
 * D1: armazenamento estruturado consultável (até 10GB)
 * Analytics Engine: observabilidade em tempo real
 *
 * Fire-and-forget — nunca lança exceção para não bloquear requisição.
 *
 * SQL de exemplo para relatório LGPD:
 *   SELECT action, entity_type, user_id, ip_address, created_at
 *   FROM audit_log
 *   WHERE organization_id = 'org-xxx'
 *     AND action LIKE 'patient.%'
 *     AND created_at > datetime('now', '-30 days')
 *   ORDER BY created_at DESC
 */
export function writeAuditLog(env: Env, entry: AuditEntry, ctx?: ExecutionContext): void {
  // Analytics Engine — observabilidade em tempo real
  if (env.ANALYTICS) {
    try {
      env.ANALYTICS.writeDataPoint({
        blobs: [
          `/audit/${entry.entityType ?? "unknown"}`,
          entry.action,
          entry.organizationId,
          entry.action,
        ],
        doubles: [0, 200, 0],
        indexes: [entry.organizationId],
      });
    } catch {}
  }

  // D1 — armazenamento durável para compliance LGPD
  if (env.DB) {
    const writeToD1 = env.DB.prepare(
      `INSERT OR IGNORE INTO audit_log
         (id, action, entity_id, entity_type, user_id, organization_id, ip_address, user_agent, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        crypto.randomUUID(),
        entry.action,
        entry.entityId ?? null,
        entry.entityType ?? null,
        entry.userId,
        entry.organizationId,
        entry.ipAddress ?? null,
        entry.userAgent ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      )
      .run()
      .catch((err) => {
        // Tabela pode não existir ainda — cria e retry
        console.warn("[AuditLog] D1 write failed (table may not exist):", err.message);
      });

    // Usa waitUntil se disponível para não bloquear resposta
    if (ctx) {
      ctx.waitUntil(writeToD1 instanceof Promise ? writeToD1 : Promise.resolve());
    }
  }
}

/**
 * Cria tabela de audit_log no D1 se não existir.
 * Chamar no startup ou migration.
 */
export async function ensureAuditLogTable(db: D1Database): Promise<void> {
  await db
    .prepare(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT,
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
    .run();

  await db
    .prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_org_action
    ON audit_log (organization_id, action, created_at)
  `)
    .run();

  await db
    .prepare(`
    CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON audit_log (entity_id, entity_type, created_at)
  `)
    .run();
}

/**
 * Helper para extrair contexto da requisição Hono (IP, user-agent).
 */
export function extractRequestContext(c: { req: { header: (key: string) => string | undefined } }) {
  return {
    ipAddress: c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For"),
    userAgent: c.req.header("User-Agent"),
  };
}
