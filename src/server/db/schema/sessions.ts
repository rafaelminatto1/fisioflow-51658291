/**
 * Sessions Schema - Evolução em texto livre (observação única)
 *
 * Features:
 * - Campo `observacao` (TEXT/HTML) como evolução principal
 * - Estruturados ao lado: pain_scale (EVA 0-10), procedures, exercises,
 *   measurements, home_exercises (todos JSONB)
 * - Auto-save support (draft status)
 * - Session numbering for patient
 * - File attachments
 * - Replicate previous conduct (templates por body_html)
 */

// ===== ENUMS =====

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  smallint,
  boolean,
  varchar,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";
import { patients } from "./patients";
import { appointments } from "./appointments";

export const sessionStatusEnum = pgEnum("session_status", [
  "draft", // Auto-saved, not finalized
  "under_review", // Intern finalized, awaiting supervisor
  "finalized", // Completed and signed
  "cancelled", // Session cancelled
]);

// ===== SESSIONS (SOAP) =====
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Patient & Links
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    therapistId: uuid("therapist_id").notNull(),
    organizationId: uuid("organization_id"),
    contactId: uuid("contact_id"),

    // Session Tracking
    sessionNumber: integer("session_number"), // Sequential per patient
    date: timestamp("date").defaultNow().notNull(),
    duration: integer("duration_minutes"), // Actual session duration

    // ===== Evolução em texto livre =====

    // Observação clínica principal (HTML do TipTap)
    observacao: text("observacao"),

    // EVA (escala visual analógica de dor) 0–10
    painScale: smallint("pain_scale"),

    // Procedimentos realizados na sessão
    procedures: jsonb("procedures")
      .$type<
        Array<{
          id: string;
          name: string;
          completed?: boolean;
          intensity?: number;
          notes?: string;
          category?: string;
          durationMinutes?: number;
        }>
      >()
      .notNull()
      .default([]),

    // Exercícios prescritos na sessão (executados em consultório)
    exercises: jsonb("exercises")
      .$type<
        Array<{
          id: string;
          exerciseId?: string;
          name: string;
          prescription?: string; // séries x reps x carga
          sets?: number;
          reps?: number;
          duration?: string;
          completed?: boolean;
          patientFeedback?: string;
          notes?: string;
        }>
      >()
      .notNull()
      .default([]),

    // Medições/testes específicos coletados na sessão
    measurements: jsonb("measurements")
      .$type<
        Array<{
          id: string;
          name: string; // ex.: "Flexão de joelho"
          value: number;
          unit: string; // graus, cm, kg
          side?: "left" | "right" | "bilateral";
          previousValue?: number;
          notes?: string;
        }>
      >()
      .notNull()
      .default([]),

    // Programa de exercícios para casa (HEP) prescrito nesta sessão
    homeExercises: jsonb("home_exercises")
      .$type<
        Array<{
          id: string;
          exerciseId?: string;
          name: string;
          prescription?: string;
          sets?: number;
          reps?: number;
          frequency?: string; // ex.: "2x/dia"
          notes?: string;
        }>
      >()
      .notNull()
      .default([]),

    // Status & Auto-save
    status: sessionStatusEnum("status").default("draft").notNull(),
    lastAutoSaveAt: timestamp("last_auto_save_at"),
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: uuid("finalized_by"),

    // Replication
    replicatedFromId: uuid("replicated_from_id"), // ID of session conduct was copied from

    // PDF Generation
    pdfUrl: text("pdf_url"),
    pdfGeneratedAt: timestamp("pdf_generated_at"),

    // Alerts
    requiredTests: jsonb("required_tests").$type<string[]>(), // Tests that must be done
    alertsAcknowledged: boolean("alerts_acknowledged").default(false),

    // Activity Lab (Dynamometry) Data
    timeToPeak: doublePrecision("time_to_peak"),
    totalReps: integer("total_reps"),
    avgPeakForce: doublePrecision("avg_peak_force"),
    peakForceNkg: doublePrecision("peak_force_nkg"),
    bodyWeight: doublePrecision("body_weight"),
    rfd50: doublePrecision("rfd_50"),
    rfd100: doublePrecision("rfd_100"),
    rfd200: doublePrecision("rfd_200"),
    peakForceN: doublePrecision("peak_force_n"),
    rawForceData: jsonb("raw_force_data"),
    peakForce: doublePrecision("peak_force"),
    avgForce: doublePrecision("avg_force"),
    rateOfForceDevelopment: doublePrecision("rate_of_force_development"),
    sensitivity: integer("sensitivity"),
    deviceBattery: integer("device_battery"),
    sampleRate: integer("sample_rate"),
    isSimulated: boolean("is_simulated"),

    repetitions: integer("repetitions"),
    side: text("side"),
    deviceFirmware: text("device_firmware"),
    measurementMode: text("measurement_mode"),
    deviceModel: text("device_model"),
    protocolName: text("protocol_name"),
    bodyPart: text("body_part"),
    activityLabDuration: doublePrecision("duration"),
    activityLabNotes: text("notes"),

    deletedAt: timestamp("deleted_at"),

    // Audit/Change Control
    isEdited: boolean("is_edited").default(false).notNull(),
    lastEditedBy: uuid("last_edited_by"),
    editReason: text("edit_reason"),

    version: integer("version").default(1).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_sessions_patient_id").on(table.patientId),
    index("idx_sessions_appointment_id").on(table.appointmentId),
    index("idx_sessions_therapist_id").on(table.therapistId),
    index("idx_sessions_org_date").on(table.organizationId, table.date),
    withOrganizationPolicy("sessions", table.organizationId),
  ],
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [sessions.appointmentId],
    references: [appointments.id],
  }),
  attachments: many(sessionAttachments),
}));

// ===== SESSION ATTACHMENTS - RF01.4 =====
export const fileTypeEnum = pgEnum("file_type", ["pdf", "jpg", "png", "docx", "other"]);
export const fileCategoryEnum = pgEnum("file_category", [
  "exam", // Laudos
  "imaging", // Exames de Imagem
  "document", // Documentos gerais
  "before_after", // Fotos antes/depois
  "other",
]);

export const sessionAttachments = pgTable(
  "session_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Can be attached to session or just patient (for general docs)
    sessionId: uuid("session_id").references(() => sessions.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),

    organizationId: uuid("organization_id"),

    // File Info
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }),
    fileUrl: text("file_url").notNull(),
    thumbnailUrl: text("thumbnail_url"), // For image preview

    fileType: fileTypeEnum("file_type").default("other"),
    mimeType: varchar("mime_type", { length: 100 }),
    category: fileCategoryEnum("category").default("other"),
    sizeBytes: integer("size_bytes"), // Max 10MB = 10485760

    // Metadata
    description: text("description"),
    uploadedBy: uuid("uploaded_by"),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_session_attachments_org_id").on(table.organizationId),
    index("idx_session_attachments_session_id").on(table.sessionId),
    index("idx_session_attachments_patient_id").on(table.patientId),
    withOrganizationPolicy("session_attachments", table.organizationId),
  ],
);

export const sessionAttachmentsRelations = relations(sessionAttachments, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionAttachments.sessionId],
    references: [sessions.id],
  }),
  patient: one(patients, {
    fields: [sessionAttachments.patientId],
    references: [patients.id],
  }),
}));

// ===== SESSION TEMPLATES =====
// For "Replicate Previous Conduct" feature
export const sessionTemplates = pgTable(
  "session_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    therapistId: uuid("therapist_id"),

    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }),

    // Conteúdo do template (HTML do TipTap), aplicado direto no editor de observação
    bodyHtml: text("body_html"),

    isGlobal: boolean("is_global").default(false), // Available to all therapists

    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_session_templates_organization_id").on(table.organizationId),
    index("idx_session_templates_therapist_id").on(table.therapistId),
    withOrganizationPolicy("session_templates", table.organizationId),
  ],
);
