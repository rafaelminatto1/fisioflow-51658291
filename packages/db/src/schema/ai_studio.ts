import { boolean, date, pgTable, uuid, text, timestamp, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { patients } from "./patients";
import { profiles } from "./organizations"; // Profiles are in organizations.ts

export const clinicalScribeLogs = pgTable("clinical_scribe_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  therapistId: uuid("therapist_id")
    .notNull()
    .references(() => profiles.userId),
  section: varchar("section", { length: 1 }).notNull(), // S, O, A, P
  rawText: text("raw_text"),
  formattedText: text("formatted_text"),
  tokensUsed: integer("tokens_used").default(0),
  consentTimestamp: timestamp("consent_timestamp").defaultNow().notNull(),
  consentSource: varchar("consent_source", { length: 50 }).default("verbal_confirmed_by_therapist"),
  captureMode: integer("capture_mode").default(100).notNull(),
  captureReason: varchar("capture_reason", { length: 40 }).default("soap_section").notNull(),
  capturedSeconds: integer("captured_seconds").default(0).notNull(),
  sessionCoveragePercent: integer("session_coverage_percent").default(100).notNull(),
  audioPolicyVersion: varchar("audio_policy_version", { length: 20 }).default("2026-06-11").notNull(),
  captureMetadata: jsonb("capture_metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => profiles.userId),
  model: varchar("model", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // google, ollama, openai, etc.
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  latencyMs: integer("latency_ms"),
  status: integer("status").default(200),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const audioTranscriptionBudgets = pgTable("audio_transcription_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  professionalUserId: text("professional_user_id"),
  monthlyLimitMinutes: integer("monthly_limit_minutes").default(0).notNull(),
  warnAtPercent: integer("warn_at_percent").default(80).notNull(),
  hardStop: boolean("hard_stop").default(true).notNull(),
  effectiveFrom: date("effective_from").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
