/**
 * Contacts Schema — CRM Hub Unificado
 *
 * Modelo central que unifica `leads` e `patients` sob uma identidade única
 * de relacionamento. Cada lead OU paciente da clínica aponta para uma linha
 * em `contacts`. Permite timeline 360°, scoring contínuo e atribuição de
 * origem (ROI por campanha).
 *
 * Migrations: 0083_contacts_unified, 0084_contacts_backfill,
 *             0085_lead_conversion_trigger
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";

// ===== ENUMS =====

export const contactLifecycleStageEnum = pgEnum("contact_lifecycle_stage", [
  "lead",
  "mql",
  "sql",
  "opportunity",
  "customer",
  "churned",
]);

// ===== CONTACTS (hub) =====

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),

    // Identidade
    nome: text("nome").notNull(),
    telefone: text("telefone"),
    email: text("email"),
    cpf: varchar("cpf", { length: 14 }),

    // Estado de relacionamento
    lifecycleStage: contactLifecycleStageEnum("lifecycle_stage").notNull().default("lead"),
    score: integer("score").notNull().default(0),
    scoreTemperature: text("score_temperature"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),

    // Atribuição
    ownerId: text("owner_id"),
    origemFirstTouch: text("origem_first_touch"),
    origemLastTouch: text("origem_last_touch"),
    sourceCampaignId: uuid("source_campaign_id"),
    sourceReferralCode: text("source_referral_code"),

    // Vínculos primários
    primaryLeadId: uuid("primary_lead_id"),
    primaryPatientId: uuid("primary_patient_id"),

    // Metadados
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_contacts_org_phone")
      .on(table.organizationId, table.telefone)
      .where(sql`telefone IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex("uq_contacts_org_email")
      .on(table.organizationId, sql`lower(${table.email})`)
      .where(sql`email IS NOT NULL AND deleted_at IS NULL`),
    uniqueIndex("uq_contacts_org_cpf")
      .on(table.organizationId, table.cpf)
      .where(sql`cpf IS NOT NULL AND deleted_at IS NULL`),
    index("idx_contacts_org_stage").on(table.organizationId, table.lifecycleStage),
    index("idx_contacts_org_owner").on(table.organizationId, table.ownerId),
    index("idx_contacts_org_temp").on(table.organizationId, table.scoreTemperature),
    index("idx_contacts_org_updated").on(table.organizationId, table.updatedAt),
    check("contacts_score_range", sql`${table.score} BETWEEN 0 AND 100`),
    check(
      "contacts_temperature_values",
      sql`${table.scoreTemperature} IS NULL OR ${table.scoreTemperature} IN ('cold','warm','hot')`,
    ),
    withOrganizationPolicy("contacts", table.organizationId),
  ],
);

// ===== CONTACT ACTIVITIES (timeline) =====

export const contactActivities = pgTable(
  "contact_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    /**
     * Tipos canônicos: contact, whatsapp, email, sms, session, appointment,
     * campaign, nps, automation, stage_change, conversion, note, task,
     * lead_created, patient_created
     */
    tipo: text("tipo").notNull(),
    titulo: text("titulo"),
    descricao: text("descricao"),

    refLeadId: uuid("ref_lead_id"),
    refPatientId: uuid("ref_patient_id"),
    refAppointmentId: uuid("ref_appointment_id"),
    refSessionId: uuid("ref_session_id"),
    refCampaignId: uuid("ref_campaign_id"),
    refAutomationId: uuid("ref_automation_id"),

    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_contact_activities_contact_created").on(table.contactId, table.createdAt),
    index("idx_contact_activities_org_tipo").on(table.organizationId, table.tipo),
    withOrganizationPolicy("contact_activities", table.organizationId),
  ],
);

// ===== CONTACT SCORES (histórico) =====

export const contactScores = pgTable(
  "contact_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    temperature: text("temperature").notNull(),
    features: jsonb("features").$type<Record<string, unknown>>().notNull().default({}),
    model: text("model").notNull().default("rules-v1"),
    modelVersion: text("model_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_contact_scores_contact_created").on(table.contactId, table.createdAt),
    check("contact_scores_range", sql`${table.score} BETWEEN 0 AND 100`),
    check("contact_scores_temperature", sql`${table.temperature} IN ('cold','warm','hot')`),
    withOrganizationPolicy("contact_scores", table.organizationId),
  ],
);

// ===== RELATIONS =====

export const contactsRelations = relations(contacts, ({ many }) => ({
  activities: many(contactActivities),
  scores: many(contactScores),
}));

export const contactActivitiesRelations = relations(contactActivities, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactActivities.contactId],
    references: [contacts.id],
  }),
}));

export const contactScoresRelations = relations(contactScores, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactScores.contactId],
    references: [contacts.id],
  }),
}));

// ===== TYPES =====

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactActivity = typeof contactActivities.$inferSelect;
export type NewContactActivity = typeof contactActivities.$inferInsert;
export type ContactScore = typeof contactScores.$inferSelect;
export type NewContactScore = typeof contactScores.$inferInsert;
