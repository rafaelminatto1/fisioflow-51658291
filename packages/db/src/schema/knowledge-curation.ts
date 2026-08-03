import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

function knowledgeOrganizationPolicy(
  tableName: string,
  organizationId: AnyPgColumn,
) {
  return pgPolicy(`${tableName}_org_isolation`, {
    for: "all",
    using: sql`${organizationId}::text = current_setting('app.org_id', true)`,
    withCheck: sql`${organizationId}::text = current_setting('app.org_id', true)`,
  });
}

export const knowledgeCapabilityGrants = pgTable(
  "knowledge_capability_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    capability: text("capability").notNull(),
    grantedBy: text("granted_by").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedBy: text("revoked_by"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    reason: text("reason"),
  },
  (table) => [
    unique(
      "knowledge_capability_grants_organization_id_user_id_capability_key",
    ).on(table.organizationId, table.userId, table.capability),
    check(
      "knowledge_capability_grants_capability_check",
      sql`${table.capability} IN ('manage_library','clinical_review','publish_knowledge','manage_library_policy')`,
    ),
    check(
      "knowledge_capability_grants_reason_check",
      sql`${table.reason} IS NULL OR char_length(${table.reason}) <= 500`,
    ),
    index("idx_knowledge_capability_grants_active")
      .on(table.organizationId, table.userId, table.capability)
      .where(sql`${table.revokedAt} IS NULL`),
    knowledgeOrganizationPolicy(
      "knowledge_capability_grants",
      table.organizationId,
    ),
  ],
);

export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    slug: text("slug"),
    rowVersion: integer("row_version").default(1).notNull(),
    approvedVersionId: uuid("approved_version_id"),
    publishedVersionId: uuid("published_version_id"),
    createdBy: text("created_by").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Os FKs compostos e deferrable destes dois ponteiros são geridos pela
    // migration 0160; Drizzle não representa DEFERRABLE neste builder.
    unique("knowledge_items_organization_id_id_key").on(
      table.organizationId,
      table.id,
    ),
    uniqueIndex("uq_knowledge_items_slug_active")
      .on(table.organizationId, table.slug)
      .where(sql`${table.slug} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    index("idx_knowledge_items_queue")
      .on(table.organizationId, table.updatedAt.desc(), table.id.desc())
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "knowledge_items_kind_check",
      sql`${table.kind} IN ('guidance','protocol','trail','test','exercise','source','term','page')`,
    ),
    check(
      "knowledge_items_title_check",
      sql`char_length(${table.title}) BETWEEN 1 AND 500`,
    ),
    check("knowledge_items_row_version_check", sql`${table.rowVersion} > 0`),
    knowledgeOrganizationPolicy("knowledge_items", table.organizationId),
  ],
);

export const knowledgeItemVersions = pgTable(
  "knowledge_item_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    content: text("content").default("").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    editorialStatus: text("editorial_status").default("draft").notNull(),
    technicalStatus: text("technical_status").default("not_started").notNull(),
    authoredBy: text("authored_by").notNull(),
    submittedBy: text("submitted_by"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("knowledge_item_versions_organization_id_id_key").on(
      table.organizationId,
      table.id,
    ),
    unique("knowledge_item_versions_organization_id_item_id_id_key").on(
      table.organizationId,
      table.itemId,
      table.id,
    ),
    unique(
      "knowledge_item_versions_organization_id_item_id_version_number_key",
    ).on(table.organizationId, table.itemId, table.versionNumber),
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [knowledgeItems.organizationId, knowledgeItems.id],
      name: "knowledge_item_versions_organization_id_item_id_fkey",
    }).onDelete("cascade"),
    index("idx_knowledge_versions_queue").on(
      table.organizationId,
      table.editorialStatus,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check(
      "knowledge_item_versions_version_number_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "knowledge_item_versions_title_check",
      sql`char_length(${table.title}) BETWEEN 1 AND 500`,
    ),
    check(
      "knowledge_item_versions_editorial_status_check",
      sql`${table.editorialStatus} IN ('draft','triage','clinical_review','changes_requested','rejected','approved','published','review_due','superseded','archived')`,
    ),
    check(
      "knowledge_item_versions_technical_status_check",
      sql`${table.technicalStatus} IN ('not_started','queued','processing','indexed','failed')`,
    ),
    knowledgeOrganizationPolicy(
      "knowledge_item_versions",
      table.organizationId,
    ),
  ],
);

export const knowledgeReviews = pgTable(
  "knowledge_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    versionId: uuid("version_id").notNull(),
    action: text("action").notNull(),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    reviewerId: text("reviewer_id"),
    approvedBy: text("approved_by"),
    reason: text("reason"),
    validUntil: date("valid_until"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [knowledgeItems.organizationId, knowledgeItems.id],
      name: "knowledge_reviews_organization_id_item_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.itemId, table.versionId],
      foreignColumns: [
        knowledgeItemVersions.organizationId,
        knowledgeItemVersions.itemId,
        knowledgeItemVersions.id,
      ],
      name: "knowledge_reviews_organization_id_item_id_version_id_fkey",
    }).onDelete("cascade"),
    index("idx_knowledge_reviews_item").on(
      table.organizationId,
      table.itemId,
      table.createdAt.desc(),
    ),
    index("idx_knowledge_reviews_version_latest").on(
      table.organizationId,
      table.versionId,
      table.createdAt.desc(),
    ),
    check(
      "knowledge_reviews_reason_check",
      sql`${table.reason} IS NULL OR char_length(${table.reason}) <= 4000`,
    ),
    knowledgeOrganizationPolicy("knowledge_reviews", table.organizationId),
  ],
);

export const knowledgeAssignments = pgTable(
  "knowledge_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    versionId: uuid("version_id").notNull(),
    assignmentType: text("assignment_type").default("owner").notNull(),
    assigneeId: text("assignee_id").notNull(),
    priority: text("priority").default("normal").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    assignedBy: text("assigned_by").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [knowledgeItems.organizationId, knowledgeItems.id],
      name: "knowledge_assignments_organization_id_item_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.itemId, table.versionId],
      foreignColumns: [
        knowledgeItemVersions.organizationId,
        knowledgeItemVersions.itemId,
        knowledgeItemVersions.id,
      ],
      name: "knowledge_assignments_organization_id_item_id_version_id_fkey",
    }).onDelete("cascade"),
    uniqueIndex("uq_knowledge_assignments_active")
      .on(table.organizationId, table.versionId, table.assignmentType)
      .where(sql`${table.completedAt} IS NULL`),
    index("idx_knowledge_assignments_queue")
      .on(table.organizationId, table.assigneeId, table.dueAt)
      .where(sql`${table.completedAt} IS NULL`),
    check(
      "knowledge_assignments_assignment_type_check",
      sql`${table.assignmentType} IN ('owner','reviewer')`,
    ),
    check(
      "knowledge_assignments_priority_check",
      sql`${table.priority} IN ('low','normal','high','urgent')`,
    ),
    knowledgeOrganizationPolicy("knowledge_assignments", table.organizationId),
  ],
);

export const knowledgeSourceMap = pgTable(
  "knowledge_source_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    knowledgeItemId: uuid("knowledge_item_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("knowledge_source_map_organization_id_source_type_source_id_key").on(
      table.organizationId,
      table.sourceType,
      table.sourceId,
    ),
    index("idx_knowledge_source_map_item").on(
      table.organizationId,
      table.knowledgeItemId,
    ),
    foreignKey({
      columns: [table.organizationId, table.knowledgeItemId],
      foreignColumns: [knowledgeItems.organizationId, knowledgeItems.id],
      name: "knowledge_source_map_organization_id_knowledge_item_id_fkey",
    }).onDelete("cascade"),
    check(
      "knowledge_source_map_source_type_check",
      sql`${table.sourceType} IN ('wiki_pages','knowledge_articles','evidence_resources','organization_evidence')`,
    ),
    knowledgeOrganizationPolicy("knowledge_source_map", table.organizationId),
  ],
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    versionId: uuid("version_id"),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    title: text("title").notNull(),
    url: text("url"),
    doi: text("doi"),
    pmid: text("pmid"),
    license: text("license"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.itemId],
      foreignColumns: [knowledgeItems.organizationId, knowledgeItems.id],
      name: "knowledge_sources_organization_id_item_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.itemId, table.versionId],
      foreignColumns: [
        knowledgeItemVersions.organizationId,
        knowledgeItemVersions.itemId,
        knowledgeItemVersions.id,
      ],
      name: "knowledge_sources_organization_id_item_id_version_id_fkey",
    }).onDelete("cascade"),
    uniqueIndex("uq_knowledge_sources_version_source")
      .on(
        table.organizationId,
        table.versionId,
        table.sourceType,
        table.sourceId,
      )
      .where(
        sql`${table.versionId} IS NOT NULL AND ${table.sourceId} IS NOT NULL`,
      ),
    index("idx_knowledge_sources_item").on(
      table.organizationId,
      table.itemId,
      table.versionId,
    ),
    knowledgeOrganizationPolicy("knowledge_sources", table.organizationId),
  ],
);

export const knowledgeAuditEvents = pgTable(
  "knowledge_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    requestId: text("request_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_knowledge_audit_events_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.createdAt.desc(),
    ),
    knowledgeOrganizationPolicy("knowledge_audit_events", table.organizationId),
  ],
);

export const knowledgeIdempotencyKeys = pgTable(
  "knowledge_idempotency_keys",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .default(sql`now() + interval '24 hours'`)
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "knowledge_idempotency_keys_pkey",
      columns: [
        table.organizationId,
        table.actorId,
        table.operation,
        table.idempotencyKey,
      ],
    }),
    index("idx_knowledge_idempotency_expiry").on(
      table.organizationId,
      table.expiresAt,
    ),
    index("idx_knowledge_idempotency_cleanup").on(table.expiresAt),
    knowledgeOrganizationPolicy(
      "knowledge_idempotency_keys",
      table.organizationId,
    ),
  ],
);
