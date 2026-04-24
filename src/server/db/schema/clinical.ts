import {
	pgTable,
	text,
	timestamp,
	uuid,
	boolean,
	jsonb,
	integer,
	numeric,
	date,
	index,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { withOrganizationPolicy } from "./rls_helper";

export const patientGoals = pgTable("patient_goals", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	organizationId: uuid("organization_id").notNull(),
	description: text("description").notNull(),
	targetDate: timestamp("target_date"),
	status: text("status", { enum: ["em_andamento", "concluido", "cancelado"] })
		.default("em_andamento")
		.notNull(),
	priority: text("priority", { enum: ["baixa", "media", "alta"] }).default(
		"media",
	),
	achievedAt: timestamp("achieved_at"),
	metadata: jsonb("metadata"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientPathologies = pgTable("patient_pathologies", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	diagnosedAt: timestamp("diagnosed_at"),
	status: text("status", { enum: ["ativo", "resolvido", "cronico"] })
		.default("ativo")
		.notNull(),
	isPrimary: boolean("is_primary").default(false),
	icdCode: text("icd_code"), // CID-10
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
	index("idx_patient_pathologies_org_patient").on(table.organizationId, table.patientId),
	withOrganizationPolicy("patient_pathologies", table.organizationId)
]);

export const patientSessionMetrics = pgTable("patient_session_metrics", {
	id: uuid("id").primaryKey().defaultRandom(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	organizationId: uuid("organization_id").notNull(),
	sessionId: uuid("session_id"),
	sessionDate: timestamp("session_date").defaultNow().notNull(),
	sessionNumber: integer("session_number"),
	painLevelBefore: numeric("pain_level_before", { precision: 10, scale: 2 }),
	functionalScoreBefore: numeric("functional_score_before", {
		precision: 10,
		scale: 2,
	}),
	moodBefore: text("mood_before"),
	durationMinutes: integer("duration_minutes"),
	treatmentType: text("treatment_type"),
	techniquesUsed: jsonb("techniques_used"),
	areasTreated: jsonb("areas_treated"),
	painLevelAfter: numeric("pain_level_after", { precision: 10, scale: 2 }),
	functionalScoreAfter: numeric("functional_score_after", {
		precision: 10,
		scale: 2,
	}),
	moodAfter: text("mood_after"),
	patientSatisfaction: numeric("patient_satisfaction", {
		precision: 10,
		scale: 2,
	}),
	painReduction: numeric("pain_reduction", { precision: 10, scale: 2 }),
	functionalImprovement: numeric("functional_improvement", {
		precision: 10,
		scale: 2,
	}),
	notes: text("notes"),
	therapistId: text("therapist_id"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prescribedExercises = pgTable("prescribed_exercises", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	exerciseId: uuid("exercise_id"), // Removed reference to exercises(id) to keep it simple if it's external
	frequency: text("frequency"),
	sets: integer("sets").default(3).notNull(),
	reps: integer("reps").default(10).notNull(),
	duration: integer("duration"),
	notes: text("notes"),
	isActive: boolean("is_active").default(true).notNull(),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedReports = pgTable("generated_reports", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	reportType: text("report_type").notNull(),
	reportContent: text("report_content").notNull(),
	dateRangeStart: date("date_range_start"),
	dateRangeEnd: date("date_range_end"),
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conductLibrary = pgTable("conduct_library", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),
	title: text("title").notNull(),
	description: text("description"),
	conductText: text("conduct_text").notNull(),
	category: text("category").notNull(),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clinicalTestTemplates = pgTable("clinical_test_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id"),
	createdBy: uuid("created_by"),
	name: text("name").notNull(),
	category: text("category").notNull(),
	targetJoint: text("target_joint").notNull(),
	purpose: text("purpose"),
	execution: text("execution"),
	positiveSign: text("positive_sign"),
	reference: text("reference"),
	sensitivitySpecificity: text("sensitivity_specificity"),
	tags: text("tags").array().default([]),
	type: text("type").default("special_test"),
	fieldsDefinition: jsonb("fields_definition").default([]),
	regularitySessions: integer("regularity_sessions"),
	layoutType: text("layout_type"),
	imageUrl: text("image_url"),
	initialPositionImageUrl: text("initial_position_image_url"),
	finalPositionImageUrl: text("final_position_image_url"),
	mediaUrls: text("media_urls").array().default([]),
	isCustom: boolean("is_custom").default(false),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const standardizedTestResults = pgTable("standardized_test_results", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	testType: text("test_type").notNull(),
	testName: text("test_name").notNull(),
	scaleName: text("scale_name"),
	score: numeric("score", { precision: 10, scale: 2 }),
	maxScore: numeric("max_score", { precision: 10, scale: 2 }),
	interpretation: text("interpretation"),
	answers: jsonb("answers").default({}),
	responses: jsonb("responses").default({}),
	appliedAt: timestamp("applied_at").defaultNow(),
	appliedBy: text("applied_by"),
	sessionId: uuid("session_id"),
	notes: text("notes"),
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const painMaps = pgTable("pain_maps", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	evolutionId: uuid("evolution_id"),
	bodyRegion: text("body_region"),
	painLevel: integer("pain_level"),
	colorCode: text("color_code"),
	notes: text("notes"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const painMapPoints = pgTable("pain_map_points", {
	id: uuid("id").primaryKey().defaultRandom(),
	painMapId: uuid("pain_map_id")
		.references(() => painMaps.id)
		.notNull(),
	organizationId: uuid("organization_id"),
	xCoordinate: numeric("x_coordinate", { precision: 10, scale: 2 }),
	yCoordinate: numeric("y_coordinate", { precision: 10, scale: 2 }),
	intensity: numeric("intensity", { precision: 10, scale: 2 }),
	region: text("region"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evolutionTemplates = pgTable("evolution_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	name: text("name").notNull(),
	type: text("type").default("fisioterapia"),
	description: text("description"),
	content: text("content"),
	camposPadrao: jsonb("campos_padrao").default([]),
	blocks: jsonb("blocks").default([]),
	tags: text("tags").array().default([]),
	isActive: boolean("is_active").default(true),
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exercisePrescriptions = pgTable("exercise_prescriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	therapistId: text("therapist_id"),
	qrCode: text("qr_code"),
	title: text("title").notNull(),
	exercises: jsonb("exercises").default([]),
	notes: text("notes"),
	validityDays: integer("validity_days").default(30),
	validUntil: timestamp("valid_until"),
	status: text("status").default("ativo"),
	viewCount: integer("view_count").default(0),
	lastViewedAt: timestamp("last_viewed_at"),
	completedExercises: jsonb("completed_exercises").default([]),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientObjectives = pgTable("patient_objectives", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id"),
	name: text("name").notNull(),
	description: text("description"),
	category: text("category"),
	isActive: boolean("is_active").default(true),
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientObjectiveAssignments = pgTable("patient_objective_assignments", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id")
		.references(() => patients.id)
		.notNull(),
	objectiveId: uuid("objective_id")
		.references(() => patientObjectives.id)
		.notNull(),
	priority: integer("priority").default(2),
	notes: text("notes"),
	isSensitive: boolean("is_sensitive").default(false).notNull(), // Para filtragem de IA
	createdBy: text("created_by"),
	deletedAt: timestamp("deleted_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
