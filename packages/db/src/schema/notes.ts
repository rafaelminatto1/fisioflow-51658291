/**
 * Notes Schema
 *
 * Workspace de notas colaborativas, separado das evoluções clínicas oficiais.
 * Conteúdo novo usa TipTap/ProseMirror JSON como fonte canônica; HTML e texto
 * simples são projeções para leitura, busca e exportação.
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { organizations } from "./organizations";
import { patients } from "./patients";
import { withOrganizationPolicy } from "./rls_helper";
import { sessions } from "./sessions";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});

export const noteTypeEnum = pgEnum("note_type", [
  "personal",
  "team",
  "patient_context",
  "appointment",
  "meeting",
  "clinical_protocol",
  "operational",
  "template",
]);

export const noteStatusEnum = pgEnum("note_status", [
  "draft",
  "active",
  "under_review",
  "archived",
]);

export const noteClassificationEnum = pgEnum("note_classification", [
  "private",
  "team",
  "operational",
  "clinical",
]);

export const noteSensitivityEnum = pgEnum("note_sensitivity", [
  "internal",
  "patient_personal",
  "clinical_sensitive",
  "restricted",
]);

export const noteAccessRoleEnum = pgEnum("note_access_role", [
  "owner",
  "editor",
  "commenter",
  "viewer",
  "no_access",
]);

export const noteCapabilityEnum = pgEnum("note_capability", [
  "view",
  "comment",
  "edit_content",
  "edit_properties",
  "share",
  "export",
  "publish",
  "manage_permissions",
  "delete",
]);

export const notePermissionSubjectEnum = pgEnum("note_permission_subject", [
  "user",
  "team",
  "role",
  "organization",
  "patient_portal",
  "share_link",
]);

export const noteMentionTypeEnum = pgEnum("note_mention_type", [
  "patient",
  "profile",
  "team",
  "task",
  "appointment",
  "session",
  "note",
  "document",
  "protocol",
  "exercise",
]);

export const noteRelationTypeEnum = pgEnum("note_relation_type", [
  "mentions",
  "references",
  "relates_to",
  "created_from",
  "derived_from",
  "blocks",
  "follows_up",
]);

export const noteCommentStatusEnum = pgEnum("note_comment_status", ["open", "resolved"]);

export const noteTaskSyncModeEnum = pgEnum("note_task_sync_mode", [
  "one_way",
  "two_way",
]);

export const noteAttachmentStorageEnum = pgEnum("note_attachment_storage", ["r2"]);

export const noteAuditOutcomeEnum = pgEnum("note_audit_outcome", ["allowed", "denied"]);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 500 }).notNull(),
    type: noteTypeEnum("type").default("personal").notNull(),
    status: noteStatusEnum("status").default("draft").notNull(),
    classification: noteClassificationEnum("classification").default("private").notNull(),
    sensitivity: noteSensitivityEnum("sensitivity").default("internal").notNull(),
    purposeOfUse: varchar("purpose_of_use", { length: 100 }),

    parentNoteId: uuid("parent_note_id").references((): any => notes.id, {
      onDelete: "set null",
    }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    // A fonte canônica atual de tarefas é a tabela legada `tarefas`, que não é
    // modelada pelo Drizzle. A API valida o UUID e o tenant antes de persistir.
    relatedTaskId: uuid("related_task_id"),

    contentJson: jsonb("content_json").$type<Record<string, unknown>>().default({}).notNull(),
    // Estado Yjs opaco usado apenas pela camada de colaboração. As projeções
    // TipTap/HTML/texto continuam sendo os formatos consultáveis da nota.
    yjsState: bytea("yjs_state"),
    contentHtml: text("content_html"),
    contentText: text("content_text"),
    icon: varchar("icon", { length: 50 }),
    coverImage: text("cover_image"),
    tags: text("tags").array().default([]).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),

    ownerId: text("owner_id").notNull(),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    isTemplate: boolean("is_template").default(false).notNull(),
    templateSourceId: uuid("template_source_id").references((): any => notes.id, {
      onDelete: "set null",
    }),

    aclVersion: integer("acl_version").default(1).notNull(),
    metadataVersion: integer("metadata_version").default(1).notNull(),
    lastAutoSaveAt: timestamp("last_auto_save_at"),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notes_org_updated").on(table.organizationId, table.updatedAt),
    index("idx_notes_org_patient_updated").on(table.organizationId, table.patientId, table.updatedAt),
    index("idx_notes_org_status_updated").on(table.organizationId, table.status, table.updatedAt),
    index("idx_notes_org_owner_updated").on(table.organizationId, table.ownerId, table.updatedAt),
    index("idx_notes_parent").on(table.parentNoteId),
    withOrganizationPolicy("notes", table.organizationId),
  ],
);

export const noteRevisions = pgTable(
  "note_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>().notNull(),
    contentHtml: text("content_html"),
    contentText: text("content_text"),
    changeSummary: varchar("change_summary", { length: 500 }),
    reason: varchar("reason", { length: 100 }),
    restoredFromRevisionId: uuid("restored_from_revision_id").references(
      (): any => noteRevisions.id,
      { onDelete: "set null" },
    ),
    createdBy: text("created_by").notNull(),
    isImmutable: boolean("is_immutable").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_note_revisions_note_version").on(table.noteId, table.versionNumber),
    index("idx_note_revisions_org_note").on(table.organizationId, table.noteId),
    withOrganizationPolicy("note_revisions", table.organizationId),
  ],
);

export const notePermissions = pgTable(
  "note_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    subjectType: notePermissionSubjectEnum("subject_type").notNull(),
    subjectId: text("subject_id"),
    accessRole: noteAccessRoleEnum("access_role").notNull(),
    capabilities: noteCapabilityEnum("capabilities").array().notNull(),
    inherited: boolean("inherited").default(false).notNull(),
    grantedBy: text("granted_by").notNull(),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_permissions_note").on(table.noteId),
    index("idx_note_permissions_principal").on(table.organizationId, table.subjectType, table.subjectId),
    withOrganizationPolicy("note_permissions", table.organizationId),
  ],
);

/** Projeção explícita e revogável; nunca expõe o conteúdo canônico da nota. */
export const notePortalPublications = pgTable(
  "note_portal_publications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    contentHtml: text("content_html"),
    contentText: text("content_text").notNull(),
    publishedBy: text("published_by").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_portal_publications_patient").on(table.organizationId, table.patientId, table.expiresAt),
    index("idx_note_portal_publications_note").on(table.organizationId, table.noteId, table.createdAt),
    withOrganizationPolicy("note_portal_publications", table.organizationId),
  ],
);

/** Preferência pessoal; nunca concede acesso adicional à nota. */
export const noteFavorites = pgTable(
  "note_favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_note_favorites_user_note").on(table.organizationId, table.userId, table.noteId),
    index("idx_note_favorites_user_created").on(table.organizationId, table.userId, table.createdAt),
    withOrganizationPolicy("note_favorites", table.organizationId),
  ],
);

export const noteMentions = pgTable(
  "note_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    blockId: varchar("block_id", { length: 255 }),
    mentionType: noteMentionTypeEnum("mention_type").notNull(),
    targetId: uuid("target_id").notNull(),
    displayLabel: varchar("display_label", { length: 255 }),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    createdBy: text("created_by").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_mentions_note").on(table.noteId, table.blockId),
    index("idx_note_mentions_target").on(table.organizationId, table.mentionType, table.targetId),
    withOrganizationPolicy("note_mentions", table.organizationId),
  ],
);

export const noteRelations = pgTable(
  "note_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceNoteId: uuid("source_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    blockId: varchar("block_id", { length: 255 }),
    targetType: noteMentionTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    relationType: noteRelationTypeEnum("relation_type").notNull(),
    isDerived: boolean("is_derived").default(false).notNull(),
    createdBy: text("created_by").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_relations_source").on(table.sourceNoteId),
    index("idx_note_relations_target").on(table.organizationId, table.targetType, table.targetId),
    withOrganizationPolicy("note_relations", table.organizationId),
  ],
);

export const noteComments = pgTable(
  "note_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    blockId: varchar("block_id", { length: 255 }),
    parentCommentId: uuid("parent_comment_id").references((): any => noteComments.id, {
      onDelete: "set null",
    }),
    selection: jsonb("selection").$type<Record<string, unknown>>(),
    body: text("body").notNull(),
    status: noteCommentStatusEnum("status").default("open").notNull(),
    authorId: text("author_id").notNull(),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_comments_note_status").on(table.noteId, table.status, table.createdAt),
    index("idx_note_comments_parent").on(table.parentCommentId),
    withOrganizationPolicy("note_comments", table.organizationId),
  ],
);

export const noteAttachments = pgTable(
  "note_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    storage: noteAttachmentStorageEnum("storage").default("r2").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 128 }),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_attachments_note").on(table.noteId, table.sortOrder),
    index("idx_note_attachments_storage_key").on(table.storageKey),
    withOrganizationPolicy("note_attachments", table.organizationId),
  ],
);

export const noteTasks = pgTable(
  "note_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    blockId: varchar("block_id", { length: 255 }),
    // Ver comentário em notes.relatedTaskId: vínculo validado pela API.
    taskId: uuid("task_id").notNull(),
    syncMode: noteTaskSyncModeEnum("sync_mode").default("two_way").notNull(),
    createdBy: text("created_by").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_note_tasks_note_task").on(table.noteId, table.taskId),
    index("idx_note_tasks_task").on(table.organizationId, table.taskId),
    withOrganizationPolicy("note_tasks", table.organizationId),
  ],
);

export const noteAuditLogs = pgTable(
  "note_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    actorId: text("actor_id"),
    action: varchar("action", { length: 100 }).notNull(),
    outcome: noteAuditOutcomeEnum("outcome").notNull(),
    authorizationReason: varchar("authorization_reason", { length: 255 }),
    requestId: varchar("request_id", { length: 120 }),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    channel: varchar("channel", { length: 50 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_note_audit_logs_org_note_created").on(
      table.organizationId,
      table.noteId,
      table.createdAt,
    ),
    index("idx_note_audit_logs_org_patient_created").on(
      table.organizationId,
      table.patientId,
      table.createdAt,
    ),
    index("idx_note_audit_logs_actor_created").on(table.actorId, table.createdAt),
    withOrganizationPolicy("note_audit_logs", table.organizationId),
  ],
);

export const notesRelations = relations(notes, ({ one, many }) => ({
  parent: one(notes, {
    fields: [notes.parentNoteId],
    references: [notes.id],
    relationName: "note_children",
  }),
  children: many(notes, { relationName: "note_children" }),
  templateSource: one(notes, {
    fields: [notes.templateSourceId],
    references: [notes.id],
    relationName: "note_template_source",
  }),
  templateCopies: many(notes, { relationName: "note_template_source" }),
  patient: one(patients, {
    fields: [notes.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [notes.appointmentId],
    references: [appointments.id],
  }),
  session: one(sessions, {
    fields: [notes.sessionId],
    references: [sessions.id],
  }),
  revisions: many(noteRevisions),
  permissions: many(notePermissions),
  mentions: many(noteMentions),
  relations: many(noteRelations),
  comments: many(noteComments),
  attachments: many(noteAttachments),
  taskLinks: many(noteTasks),
  auditLogs: many(noteAuditLogs),
}));

export const noteRevisionsRelations = relations(noteRevisions, ({ one }) => ({
  note: one(notes, {
    fields: [noteRevisions.noteId],
    references: [notes.id],
  }),
  restoredFrom: one(noteRevisions, {
    fields: [noteRevisions.restoredFromRevisionId],
    references: [noteRevisions.id],
    relationName: "note_revision_restore",
  }),
}));

export const notePermissionsRelations = relations(notePermissions, ({ one }) => ({
  note: one(notes, {
    fields: [notePermissions.noteId],
    references: [notes.id],
  }),
}));

export const noteMentionsRelations = relations(noteMentions, ({ one }) => ({
  note: one(notes, {
    fields: [noteMentions.noteId],
    references: [notes.id],
  }),
}));

export const noteRelationsRelations = relations(noteRelations, ({ one }) => ({
  sourceNote: one(notes, {
    fields: [noteRelations.sourceNoteId],
    references: [notes.id],
  }),
}));

export const noteCommentsRelations = relations(noteComments, ({ one, many }) => ({
  note: one(notes, {
    fields: [noteComments.noteId],
    references: [notes.id],
  }),
  parent: one(noteComments, {
    fields: [noteComments.parentCommentId],
    references: [noteComments.id],
    relationName: "note_comment_replies",
  }),
  replies: many(noteComments, { relationName: "note_comment_replies" }),
}));

export const noteAttachmentsRelations = relations(noteAttachments, ({ one }) => ({
  note: one(notes, {
    fields: [noteAttachments.noteId],
    references: [notes.id],
  }),
}));

export const noteTasksRelations = relations(noteTasks, ({ one }) => ({
  note: one(notes, {
    fields: [noteTasks.noteId],
    references: [notes.id],
  }),
}));

export const noteAuditLogsRelations = relations(noteAuditLogs, ({ one }) => ({
  note: one(notes, {
    fields: [noteAuditLogs.noteId],
    references: [notes.id],
  }),
  patient: one(patients, {
    fields: [noteAuditLogs.patientId],
    references: [patients.id],
  }),
}));

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
