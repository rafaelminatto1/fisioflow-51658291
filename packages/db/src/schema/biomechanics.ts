import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
  numeric,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy, withPublicOrOrganizationPolicy } from "./rls_helper";
import { patients } from "./patients";

export const biomechanicsAssessmentTypeEnum = pgEnum("biomechanics_assessment_type", [
  "static_posture",
  "gait_analysis",
  "running_analysis",
  "functional_movement",
]);

export const biomechanicsAssessments = pgTable(
  "biomechanics_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    organizationId: uuid("organization_id"),
    professionalId: uuid("professional_id"),
    protocolId: uuid("protocol_id"),
    primaryMediaId: uuid("primary_media_id"),
    jobId: uuid("job_id"),

    type: biomechanicsAssessmentTypeEnum("type").notNull(),
    status: varchar("status", { length: 50 }).default("completed"),
    qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
    captureContext: jsonb("capture_context").default("{}"),

    // New Biomechanics 2.0 fields
    symmetryScore: numeric("symmetry_score"),
    trajectoryData: jsonb("trajectory_data").default("[]"),
    aiValidationStatus: varchar("ai_validation_status", { length: 50 }).default("pending"),
    algorithmVersion: varchar("algorithm_version", { length: 50 }),

    // Media Info
    mediaUrl: text("media_url").notNull(), // R2 URL
    thumbnailUrl: text("thumbnail_url"),

    // Analysis Data (JSONB)
    // Stores: { landmarks: [...], angles: {...}, metrics: {...} }
    analysisData: jsonb("analysis_data").$type<{
      landmarks?: Array<{
        name: string;
        x: number;
        y: number;
        z?: number;
        confidence: number;
      }>;
      angles?: Record<string, number>;
      metrics?: Record<string, any>;
      protocol?: Record<string, any> | null;
      processing?: Record<string, any>;
      symmetries?: Array<Record<string, any>>;
      pain?: number;
      painScale?: number;
      vas?: number;
      eva?: number;
      _pdf?: Record<string, any>;
      _signature?: Record<string, any>;
    }>(),

    // Clinical Findings
    observations: text("observations"),
    conclusions: text("conclusions"),
    validatedBy: uuid("validated_by"),
    validatedAt: timestamp("validated_at"),
    reportHash: varchar("report_hash", { length: 128 }),
    signedAt: timestamp("signed_at"),
    signatureMetadata: jsonb("signature_metadata").default("{}"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_biomechanics_patient_id").on(table.patientId),
    index("idx_biomechanics_organization_id").on(table.organizationId),
    index("idx_biomechanics_type").on(table.type),
    withOrganizationPolicy("biomechanics_assessments", table.organizationId),
  ],
);

/**
 * Biomechanics Metrics
 * Armazena métricas normalizadas para busca rápida e agregação.
 */
export const biomechanicsMetrics = pgTable(
  "biomechanics_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    organizationId: uuid("organization_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),

    metricKey: varchar("metric_key", { length: 100 }).notNull(), // ex: 'gait_speed', 'knee_flexion_l'
    metricValue: numeric("metric_value", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }), // ex: 'm/s', 'deg'
    side: varchar("side", { length: 20 }),
    phase: varchar("phase", { length: 50 }),
    view: varchar("view", { length: 50 }),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    source: varchar("source", { length: 50 }).default("algorithm"),
    normalRange: jsonb("normal_range").default("{}"),
    severity: varchar("severity", { length: 30 }),
    algorithmVersion: varchar("algorithm_version", { length: 50 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_metric_key").on(table.metricKey),
    index("idx_bio_metric_patient").on(table.patientId),
    withOrganizationPolicy("biomechanics_metrics", table.organizationId),
  ],
);

export const biomechanicsProtocols = pgTable(
  "biomechanics_protocols",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description"),
    assessmentType: biomechanicsAssessmentTypeEnum("assessment_type").notNull().default("functional_movement"),
    captureRequirements: jsonb("capture_requirements").default("{}"),
    metricDefinitions: jsonb("metric_definitions").default("[]"),
    qualityRules: jsonb("quality_rules").default("{}"),
    progressionGates: jsonb("progression_gates").default("[]"),
    redFlags: jsonb("red_flags").default("[]"),
    evidenceRefs: jsonb("evidence_refs").default("[]"),
    isSystem: boolean("is_system").default(false).notNull(),
    version: varchar("version", { length: 30 }).default("1.0.0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_protocol_org").on(table.organizationId),
    index("idx_bio_protocol_slug").on(table.slug),
    index("idx_bio_protocol_category").on(table.category),
    withPublicOrOrganizationPolicy("biomechanics_protocols", table.organizationId),
  ],
);

export const biomechanicsMedia = pgTable(
  "biomechanics_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    r2Key: text("r2_key"),
    streamUid: varchar("stream_uid", { length: 160 }),
    mediaType: varchar("media_type", { length: 40 }).notNull().default("video"),
    view: varchar("view", { length: 50 }).notNull().default("sagittal"),
    durationMs: integer("duration_ms"),
    fps: numeric("fps", { precision: 8, scale: 2 }),
    width: integer("width"),
    height: integer("height"),
    contentType: varchar("content_type", { length: 120 }),
    sizeBytes: integer("size_bytes"),
    qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_media_assessment").on(table.assessmentId),
    index("idx_bio_media_patient").on(table.patientId),
    index("idx_bio_media_org").on(table.organizationId),
    withOrganizationPolicy("biomechanics_media", table.organizationId),
  ],
);

export const biomechanicsJobs = pgTable(
  "biomechanics_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    mediaId: uuid("media_id").references(() => biomechanicsMedia.id),
    status: varchar("status", { length: 50 }).notNull().default("queued"),
    stage: varchar("stage", { length: 80 }).notNull().default("ingest"),
    progress: integer("progress").default(0).notNull(),
    errorCode: varchar("error_code", { length: 80 }),
    errorMessage: text("error_message"),
    modelProvider: varchar("model_provider", { length: 80 }).default("fisioflow"),
    modelName: varchar("model_name", { length: 120 }).default("deterministic-v1"),
    modelVersion: varchar("model_version", { length: 50 }).default("1.0.0"),
    algorithmVersion: varchar("algorithm_version", { length: 50 }).default("bio-pipeline-1.0.0"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_jobs_assessment").on(table.assessmentId),
    index("idx_bio_jobs_patient").on(table.patientId),
    index("idx_bio_jobs_org_status").on(table.organizationId, table.status),
    withOrganizationPolicy("biomechanics_jobs", table.organizationId),
  ],
);

export const biomechanicsFrames = pgTable(
  "biomechanics_frames",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    mediaId: uuid("media_id").references(() => biomechanicsMedia.id),
    frameIndex: integer("frame_index").notNull(),
    timeMs: integer("time_ms").notNull(),
    thumbnailKey: text("thumbnail_key"),
    landmarks: jsonb("landmarks").default("[]"),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    events: jsonb("events").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_frames_assessment").on(table.assessmentId),
    index("idx_bio_frames_media").on(table.mediaId),
    withOrganizationPolicy("biomechanics_frames", table.organizationId),
  ],
);

export const biomechanicsEvents = pgTable(
  "biomechanics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    mediaId: uuid("media_id").references(() => biomechanicsMedia.id),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    timeMs: integer("time_ms").notNull(),
    frameIndex: integer("frame_index"),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_events_assessment").on(table.assessmentId),
    index("idx_bio_events_type").on(table.eventType),
    withOrganizationPolicy("biomechanics_events", table.organizationId),
  ],
);

export const biomechanicsAnnotations = pgTable(
  "biomechanics_annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    mediaId: uuid("media_id").references(() => biomechanicsMedia.id),
    frameIndex: integer("frame_index"),
    timeMs: integer("time_ms"),
    tool: varchar("tool", { length: 50 }).notNull(),
    geometry: jsonb("geometry").default("{}"),
    label: text("label"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_annotations_assessment").on(table.assessmentId),
    index("idx_bio_annotations_media").on(table.mediaId),
    withOrganizationPolicy("biomechanics_annotations", table.organizationId),
  ],
);

export const biomechanicsReviewActions = pgTable(
  "biomechanics_review_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => biomechanicsAssessments.id),
    action: varchar("action", { length: 80 }).notNull(),
    fromStatus: varchar("from_status", { length: 50 }),
    toStatus: varchar("to_status", { length: 50 }),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bio_review_assessment").on(table.assessmentId),
    index("idx_bio_review_org").on(table.organizationId),
    withOrganizationPolicy("biomechanics_review_actions", table.organizationId),
  ],
);

export const biomechanicsAssessmentsRelations = relations(
  biomechanicsAssessments,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [biomechanicsAssessments.patientId],
      references: [patients.id],
    }),
    metrics: many(biomechanicsMetrics),
    media: many(biomechanicsMedia),
    jobs: many(biomechanicsJobs),
    annotations: many(biomechanicsAnnotations),
  }),
);

export const biomechanicsMetricsRelations = relations(biomechanicsMetrics, ({ one }) => ({
  assessment: one(biomechanicsAssessments, {
    fields: [biomechanicsMetrics.assessmentId],
    references: [biomechanicsAssessments.id],
  }),
}));

export const biomechanicsMediaRelations = relations(biomechanicsMedia, ({ one, many }) => ({
  assessment: one(biomechanicsAssessments, {
    fields: [biomechanicsMedia.assessmentId],
    references: [biomechanicsAssessments.id],
  }),
  patient: one(patients, {
    fields: [biomechanicsMedia.patientId],
    references: [patients.id],
  }),
  jobs: many(biomechanicsJobs),
  frames: many(biomechanicsFrames),
  events: many(biomechanicsEvents),
  annotations: many(biomechanicsAnnotations),
}));

export const biomechanicsJobsRelations = relations(biomechanicsJobs, ({ one }) => ({
  assessment: one(biomechanicsAssessments, {
    fields: [biomechanicsJobs.assessmentId],
    references: [biomechanicsAssessments.id],
  }),
  media: one(biomechanicsMedia, {
    fields: [biomechanicsJobs.mediaId],
    references: [biomechanicsMedia.id],
  }),
}));
