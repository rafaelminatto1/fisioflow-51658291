import { pgTable, uuid, text, timestamp, jsonb, varchar, index, inet } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { withOrganizationPolicy } from "./rls_helper";

/**
 * Audit Logs Schema - LGPD Compliance
 *
 * Records every sensitive action in the system, specifically:
 * - Patient record access (READ)
 * - Clinical data modification (WRITE)
 * - Financial changes
 * - System configuration changes
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    userId: uuid("user_id").notNull(),

    // Action details
    action: varchar("action", { length: 50 }).notNull(), // 'READ', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
    entityType: varchar("entity_type", { length: 50 }).notNull(), // 'patient', 'session', 'financial', 'user'
    entityId: uuid("entity_id"),

    // Context
    description: text("description"),
    metadata: jsonb("metadata").default({}), // UI path, specific feature, etc.
    changes: jsonb("changes"), // Before/After diff for updates

    // Security tracking
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_org_date").on(table.organizationId, table.createdAt),
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
    index("idx_audit_logs_user").on(table.userId),
    withOrganizationPolicy("audit_logs", table.organizationId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

/**
 * Restore Audit Logs Schema - LGPD Compliance
 * 
 * Tracks point-in-time recovery operations (Neon Instant Restore)
 * Required for LGPD auditability when restoring databases.
 */
export const restoreAuditLogs = pgTable(
  "restore_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    restoredAt: timestamp("restored_at").defaultNow().notNull(),
    restorePointTimestamp: timestamp("restore_point_timestamp").notNull(),
    reason: text("reason").notNull(), // E.g., 'Accidental deletion of patient X data'
    operatorId: uuid("operator_id").notNull(), // User who executed the restore
    branchName: varchar("branch_name", { length: 255 }).notNull(), // The Neon branch created
    status: varchar("status", { length: 50 }).notNull(), // 'SUCCESS', 'FAILED', 'VERIFYING'
    notes: text("notes"), // Additional audit notes
  },
  (table) => [
    index("idx_restore_audit_logs_org_date").on(table.organizationId, table.restoredAt),
    index("idx_restore_audit_logs_operator").on(table.operatorId),
    withOrganizationPolicy("restore_audit_logs", table.organizationId),
  ]
);

export type RestoreAuditLog = typeof restoreAuditLogs.$inferSelect;
export type NewRestoreAuditLog = typeof restoreAuditLogs.$inferInsert;
