/**
 * Exercises Schema
 *
 * Biblioteca de exercícios de fisioterapia com:
 * - Categorias hierárquicas (por região corporal e especialidade)
 * - Imagens e vídeos no Cloudflare R2
 * - Patologias indicadas/contraindicadas
 * - Músculos e equipamentos
 */

import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	integer,
	pgEnum,
	index,
	customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Vector Type
const vector = customType<{ data: number[] }>({
	dataType() {
		return "vector(768)";
	},
});
import { relations } from "drizzle-orm";
import { protocolExercises } from "./protocols";

// ===== ENUMS =====
export const difficultyEnum = pgEnum("exercise_difficulty", [
	"iniciante",
	"intermediario",
	"avancado",
]);

export const exerciseProtocolTypeEnum = pgEnum("exercise_protocol_type", [
	"pos_operatorio",
	"patologia",
	"preventivo",
	"esportivo",
	"funcional",
]);

// ===== EXERCISE CATEGORIES =====
export const exerciseCategories = pgTable(
	"exercise_categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 100 }).unique().notNull(),
		name: varchar("name", { length: 200 }).notNull(),
		description: text("description"),
		icon: varchar("icon", { length: 50 }), // emoji ex: "🦵"
		color: varchar("color", { length: 20 }), // hex ex: "#3B82F6"
		orderIndex: integer("order_index").default(0),
		parentId: uuid("parent_id"), // subcategoria
		organizationId: uuid("organization_id"), // Para categorias personalizadas da clínica
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		slugIdx: index("idx_exercise_categories_slug").on(table.slug),
		parentIdIdx: index("idx_exercise_categories_parent_id").on(table.parentId),
		orgIdx: index("idx_exercise_categories_org_id").on(table.organizationId),
	}),
);

export const exerciseCategoriesRelations = relations(
	exerciseCategories,
	({ one, many }) => ({
		parent: one(exerciseCategories, {
			fields: [exerciseCategories.parentId],
			references: [exerciseCategories.id],
			relationName: "subcategories",
		}),
		subcategories: many(exerciseCategories, { relationName: "subcategories" }),
		exercises: many(exercises),
	}),
);

// ===== EXERCISES =====
export const exercises = pgTable(
	"exercises",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: varchar("slug", { length: 250 }).unique(),
		name: varchar("name", { length: 250 }).notNull(),

		// Classificação
		categoryId: uuid("category_id").references(() => exerciseCategories.id),
		subcategory: varchar("subcategory", { length: 100 }),
		difficulty: difficultyEnum("difficulty").default("iniciante"),

		// Descrição
		description: text("description"),
		instructions: text("instructions"), // markdown com passo a passo
		tips: text("tips"), // dicas clínicas
		precautions: text("precautions"), // precauções e avisos
		benefits: text("benefits"), // benefícios clínicos

		// Anatomia
		musclesPrimary: text("muscles_primary").array().default([]),
		musclesSecondary: text("muscles_secondary").array().default([]),
		bodyParts: text("body_parts").array().default([]),

		// Equipamentos
		equipment: text("equipment").array().default([]),
		alternativeEquipment: text("alternative_equipment").array().default([]),

		// Parâmetros padrão
		setsRecommended: integer("sets_recommended"),
		repsRecommended: integer("reps_recommended"),
		durationSeconds: integer("duration_seconds"),
		restSeconds: integer("rest_seconds"),

		// Mídia
		imageUrl: text("image_url"),
		thumbnailUrl: text("thumbnail_url"),
		videoUrl: text("video_url"),

		// Clínico
		pathologiesIndicated: text("pathologies_indicated").array().default([]),
		pathologiesContraindicated: text("pathologies_contraindicated")
			.array()
			.default([]),
		icd10Codes: text("icd10_codes").array().default([]),
		tags: text("tags").array().default([]),

		// Referências
		references: text("references"), // JSON string com {title, authors, year, url}

		// Controle
		embedding: vector("embedding"),
		isActive: boolean("is_active").default(true).notNull(),
		isPublic: boolean("is_public").default(true).notNull(), // false = privado da organização
		organizationId: uuid("organization_id"), // null = padrão da plataforma
		createdBy: text("created_by"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		slugIdx: index("idx_exercises_slug").on(table.slug),
		categoryIdIdx: index("idx_exercises_category_id").on(table.categoryId),
		organizationIdIdx: index("idx_exercises_organization_id").on(
			table.organizationId,
		),
		isActiveIdx: index("idx_exercises_is_active").on(table.isActive),
		nameSearchIdx: index("idx_exercises_name_search").using(
			"gin",
			sql`to_tsvector('portuguese', ${table.name})`,
		),
	}),
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
	category: one(exerciseCategories, {
		fields: [exercises.categoryId],
		references: [exerciseCategories.id],
	}),
	protocolExercises: many(protocolExercises),
}));

// ===== EXERCISE FAVORITES =====
export const exerciseFavorites = pgTable(
	"exercise_favorites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		exerciseId: uuid("exercise_id")
			.notNull()
			.references(() => exercises.id),
		userId: text("user_id").notNull(), // Neon Auth UID
		organizationId: uuid("organization_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		exerciseIdIdx: index("idx_exercise_favorites_exercise_id").on(
			table.exerciseId,
		),
		userIdIdx: index("idx_exercise_favorites_user_id").on(table.userId),
		organizationIdIdx: index("idx_exercise_favorites_organization_id").on(
			table.organizationId,
		),
	}),
);

export const exerciseFavoritesRelations = relations(
	exerciseFavorites,
	({ one }) => ({
		exercise: one(exercises, {
			fields: [exerciseFavorites.exerciseId],
			references: [exercises.id],
		}),
	}),
);
