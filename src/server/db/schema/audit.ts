import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  varchar,
  index,
  inet,
} from "drizzle-orm/pg-core";
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
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
