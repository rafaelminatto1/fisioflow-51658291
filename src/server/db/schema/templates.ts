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
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== ENUMS =====
export const evidenceLevelEnum = pgEnum('evidence_level', ['A', 'B', 'C', 'D']);

// ===== EXERCISE TEMPLATES =====
export const exerciseTemplates = pgTable('exercise_templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 200 }),
  conditionName: varchar('condition_name', { length: 500 }),
  templateVariant: varchar('template_variant', { length: 200 }),

  // Clinical metadata
  clinicalNotes: text('clinical_notes'),
  contraindications: text('contraindications'),
  precautions: text('precautions'),
  progressionNotes: text('progression_notes'),
  evidenceLevel: evidenceLevelEnum('evidence_level'),
  bibliographicReferences: text('bibliographic_references').array().default([]),

  // Control
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  organizationId: uuid('organization_id'),
  createdBy: text('created_by'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== EXERCISE TEMPLATE ITEMS =====
export const exerciseTemplateItems = pgTable('exercise_template_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => exerciseTemplates.id, { onDelete: 'cascade' }),

  // Reference to exercise
  exerciseId: text('exercise_id').notNull(),

  orderIndex: integer('order_index').default(0).notNull(),

  // Exercise parameters for this template
  sets: integer('sets'),
  repetitions: integer('repetitions'),
  duration: integer('duration'), // seconds
  notes: text('notes'),
  weekStart: integer('week_start'),
  weekEnd: integer('week_end'),
  clinicalNotes: text('clinical_notes'),
  focusMuscles: text('focus_muscles').array().default([]),
  purpose: text('purpose'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== RELATIONS =====
export const exerciseTemplatesRelations = relations(exerciseTemplates, ({ many }) => ({
  items: many(exerciseTemplateItems),
}));

export const exerciseTemplateItemsRelations = relations(exerciseTemplateItems, ({ one }) => ({
  template: one(exerciseTemplates, {
    fields: [exerciseTemplateItems.templateId],
    references: [exerciseTemplates.id],
  }),
}));
