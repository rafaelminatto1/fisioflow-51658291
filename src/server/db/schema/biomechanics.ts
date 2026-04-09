import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	jsonb,
	pgEnum,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
	(table) => ({
		patientIdIdx: index("idx_biomechanics_patient_id").on(table.patientId),
		organizationIdIdx: index("idx_biomechanics_organization_id").on(table.organizationId),
		typeIdx: index("idx_biomechanics_type").on(table.type),
	}),
);

export const biomechanicsAssessmentsRelations = relations(biomechanicsAssessments, ({ one }) => ({
	patient: one(patients, {
		fields: [biomechanicsAssessments.patientId],
		references: [patients.id],
	}),
}));
