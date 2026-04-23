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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";
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
		
		type: biomechanicsAssessmentTypeEnum("type").notNull(),
		status: varchar("status", { length: 50 }).default("completed"),
		
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
		}>(),
		
		// Clinical Findings
		observations: text("observations"),
		conclusions: text("conclusions"),
		
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
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_bio_metric_key").on(table.metricKey),
		index("idx_bio_metric_patient").on(table.patientId),
		withOrganizationPolicy("biomechanics_metrics", table.organizationId),
	],
);

export const biomechanicsAssessmentsRelations = relations(biomechanicsAssessments, ({ one, many }) => ({
	patient: one(patients, {
		fields: [biomechanicsAssessments.patientId],
		references: [patients.id],
	}),
	metrics: many(biomechanicsMetrics),
}));

export const biomechanicsMetricsRelations = relations(biomechanicsMetrics, ({ one }) => ({
	assessment: one(biomechanicsAssessments, {
		fields: [biomechanicsMetrics.assessmentId],
		references: [biomechanicsAssessments.id],
	}),
}));
