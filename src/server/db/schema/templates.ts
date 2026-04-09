/**
 * Exercise Templates Schema
 *
 * Templates são planos de exercícios pré-montados para condições clínicas específicas.
 * Cada template tem itens (exercícios) com parâmetros customizados.
 */

import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	integer,
	check,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { evidenceLevelEnum } from "./protocols";

// ===== EXERCISE TEMPLATE CATEGORIES (lookup) =====
export const exerciseTemplateCategories = pgTable(
	"exercise_template_categories",
	{
		id: text("id").primaryKey(), // 'ortopedico', 'esportivo', etc.
		label: text("label").notNull(), // 'Ortopédico', 'Esportivo', etc.
		icon: text("icon"), // Lucide icon name
		orderIndex: integer("order_index").notNull().default(0),
		organizationId: uuid("organization_id"),
	},
);

// ===== EXERCISE TEMPLATES =====
export const exerciseTemplates = pgTable(
	"exercise_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		name: varchar("name", { length: 500 }).notNull(),
		description: text("description"),
		category: varchar("category", { length: 200 }),
		conditionName: varchar("condition_name", { length: 500 }),
		templateVariant: varchar("template_variant", { length: 200 }),

		// Clinical metadata
		clinicalNotes: text("clinical_notes"),
		contraindications: text("contraindications"),
		precautions: text("precautions"),
		progressionNotes: text("progression_notes"),
		evidenceLevel: evidenceLevelEnum("evidence_level"),
		bibliographicReferences: text("bibliographic_references").array().default([]),

		// NEW: Template type — 'system' (platform-wide) or 'custom' (org-specific)
		templateType: text("template_type").notNull().default("custom"),

		// NEW: Patient profile category
		patientProfile: text("patient_profile"),

		// NEW: Reference to the System_Template this was customized from
		sourceTemplateId: uuid("source_template_id"),

		// NEW: Draft support
		isDraft: boolean("is_draft").notNull().default(false),

		// NEW: Denormalized exercise count for listing performance
		exerciseCount: integer("exercise_count").notNull().default(0),

		// Control
		isActive: boolean("is_active").default(true).notNull(),
		isPublic: boolean("is_public").default(true).notNull(),
		organizationId: uuid("organization_id"),
		createdBy: text("created_by"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		check(
			"chk_template_type",
			sql`${table.templateType} IN ('system', 'custom')`,
		),
		check(
			"chk_patient_profile",
			sql`${table.patientProfile} IS NULL OR ${table.patientProfile} IN ('ortopedico', 'esportivo', 'pos_operatorio', 'prevencao', 'idosos')`,
		),
	],
);

// ===== EXERCISE TEMPLATE ITEMS =====
export const exerciseTemplateItems = pgTable("exercise_template_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	templateId: uuid("template_id")
		.notNull()
		.references(() => exerciseTemplates.id),

	// Reference to exercise
	exerciseId: text("exercise_id").notNull(),

	orderIndex: integer("order_index").default(0).notNull(),

	// Exercise parameters for this template
	sets: integer("sets"),
	repetitions: integer("repetitions"),
	duration: integer("duration"), // seconds
	notes: text("notes"),
	weekStart: integer("week_start"),
	weekEnd: integer("week_end"),
	clinicalNotes: text("clinical_notes"),
	focusMuscles: text("focus_muscles").array().default([]),
	purpose: text("purpose"),
	organizationId: uuid("organization_id"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== RELATIONS =====
export const exerciseTemplatesRelations = relations(
	exerciseTemplates,
	({ one, many }) => ({
		items: many(exerciseTemplateItems),
		sourceTemplate: one(exerciseTemplates, {
			fields: [exerciseTemplates.sourceTemplateId],
			references: [exerciseTemplates.id],
			relationName: "customizations",
		}),
		customizations: many(exerciseTemplates, { relationName: "customizations" }),
	}),
);

export const exerciseTemplateItemsRelations = relations(
	exerciseTemplateItems,
	({ one }) => ({
		template: one(exerciseTemplates, {
			fields: [exerciseTemplateItems.templateId],
			references: [exerciseTemplates.id],
		}),
	}),
);

// ===== INFERRED TYPES =====
export type ExerciseTemplate = typeof exerciseTemplates.$inferSelect;
export type NewExerciseTemplate = typeof exerciseTemplates.$inferInsert;

export type ExerciseTemplateItem = typeof exerciseTemplateItems.$inferSelect;
export type NewExerciseTemplateItem = typeof exerciseTemplateItems.$inferInsert;

export type ExerciseTemplateCategory = typeof exerciseTemplateCategories.$inferSelect;
export type NewExerciseTemplateCategory = typeof exerciseTemplateCategories.$inferInsert;

export type PatientProfileCategory =
	| "ortopedico"
	| "esportivo"
	| "pos_operatorio"
	| "prevencao"
	| "idosos";
