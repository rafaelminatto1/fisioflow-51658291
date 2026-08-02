import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { withOrganizationPolicy } from "./rls_helper";

export const knowledgeCapabilityGrants = pgTable(
  "knowledge_capability_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
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
    unique("uq_knowledge_capability_grants").on(
      table.organizationId,
      table.userId,
      table.capability,
    ),
    index("idx_knowledge_capability_grants_lookup").on(
      table.organizationId,
      table.userId,
    ),
    withOrganizationPolicy("knowledge_capability_grants", table.organizationId),
  ],
);

export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
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
    unique("uq_knowledge_items_org_id").on(table.organizationId, table.id),
    index("idx_knowledge_items_queue").on(
      table.organizationId,
      table.updatedAt,
      table.id,
    ),
    withOrganizationPolicy("knowledge_items", table.organizationId),
  ],
);

export const knowledgeItemVersions = pgTable(
  "knowledge_item_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => knowledgeItems.id),
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
    unique("uq_knowledge_item_versions_org_id").on(
      table.organizationId,
      table.id,
    ),
    unique("uq_knowledge_item_versions_identity").on(
      table.organizationId,
      table.itemId,
      table.id,
    ),
    unique("uq_knowledge_item_versions_number").on(
      table.organizationId,
      table.itemId,
      table.versionNumber,
    ),
    index("idx_knowledge_versions_queue").on(
      table.organizationId,
      table.editorialStatus,
      table.createdAt,
      table.id,
    ),
    withOrganizationPolicy("knowledge_item_versions", table.organizationId),
  ],
);

export const knowledgeReviews = pgTable(
  "knowledge_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    versionId: uuid("version_id")
      .notNull()
      .references(() => knowledgeItemVersions.id),
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
    index("idx_knowledge_reviews_item").on(
      table.organizationId,
      table.itemId,
      table.createdAt,
    ),
    withOrganizationPolicy("knowledge_reviews", table.organizationId),
  ],
);

export const knowledgeAssignments = pgTable(
  "knowledge_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    versionId: uuid("version_id")
      .notNull()
      .references(() => knowledgeItemVersions.id),
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
    index("idx_knowledge_assignments_queue").on(
      table.organizationId,
      table.assigneeId,
      table.dueAt,
    ),
    withOrganizationPolicy("knowledge_assignments", table.organizationId),
  ],
);

export const knowledgeSourceMap = pgTable(
  "knowledge_source_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    knowledgeItemId: uuid("knowledge_item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("uq_knowledge_source_map_source").on(
      table.organizationId,
      table.sourceType,
      table.sourceId,
    ),
    index("idx_knowledge_source_map_item").on(
      table.organizationId,
      table.knowledgeItemId,
    ),
    withOrganizationPolicy("knowledge_source_map", table.organizationId),
  ],
);

export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    versionId: uuid("version_id").references(() => knowledgeItemVersions.id),
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
    unique("uq_knowledge_sources_version_source").on(
      table.organizationId,
      table.versionId,
      table.sourceType,
      table.sourceId,
    ),
    index("idx_knowledge_sources_item").on(
      table.organizationId,
      table.itemId,
      table.versionId,
    ),
    withOrganizationPolicy("knowledge_sources", table.organizationId),
  ],
);

export const knowledgeAuditEvents = pgTable(
  "knowledge_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
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
      table.createdAt,
    ),
    withOrganizationPolicy("knowledge_audit_events", table.organizationId),
  ],
);

export const knowledgeIdempotencyKeys = pgTable(
  "knowledge_idempotency_keys",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: text("actor_id").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("uq_knowledge_idempotency_key").on(
      table.organizationId,
      table.actorId,
      table.operation,
      table.idempotencyKey,
    ),
    index("idx_knowledge_idempotency_expiry").on(
      table.organizationId,
      table.expiresAt,
    ),
    withOrganizationPolicy("knowledge_idempotency_keys", table.organizationId),
  ],
);
