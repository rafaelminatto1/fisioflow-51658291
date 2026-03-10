/**
 * Protocols Schema
 *
 * Protocolos clínicos de fisioterapia com:
 * - Fases de tratamento por semana
 * - Exercícios por fase
 * - Milestones e critérios de progressão
 * - Referências bibliográficas com nível de evidência
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== ENUMS =====
export const protocolTypeEnum = pgEnum('protocol_type', [
  'pos_operatorio',
  'patologia',
  'preventivo',
  'esportivo',
  'funcional',
  'neurologico',
  'respiratorio',
]);

export const evidenceLevelEnum = pgEnum('evidence_level', ['A', 'B', 'C', 'D']);

// ===== EXERCISE PROTOCOLS =====
export const exerciseProtocols = pgTable('exercise_protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 250 }).unique(),
  name: varchar('name', { length: 250 }).notNull(),
  conditionName: varchar('condition_name', { length: 250 }),  // ex: "Reconstrução LCA"
  protocolType: protocolTypeEnum('protocol_type').default('patologia'),
  evidenceLevel: evidenceLevelEnum('evidence_level'),

  // Descrição geral
  description: text('description'),
  objectives: text('objectives'),
  contraindications: text('contraindications'),

  // Estrutura temporal
  weeksTotal: integer('weeks_total'),

  // Dados estruturados JSONB
  phases: jsonb('phases').$type<Array<{
    name: string;
    weekStart: number;
    weekEnd: number;
    goals: string[];
    precautions: string[];
    exerciseIds?: string[];
  }>>().default([]),

  milestones: jsonb('milestones').$type<Array<{
    week: number;
    title: string;
    criteria: string[];
    notes?: string;
  }>>().default([]),

  restrictions: jsonb('restrictions').$type<Array<{
    weekStart: number;
    weekEnd?: number;
    description: string;
    type: 'weight_bearing' | 'range_of_motion' | 'activity' | 'general';
  }>>().default([]),

  progressionCriteria: jsonb('progression_criteria').$type<Array<{
    phase: string;
    criteria: string[];
  }>>().default([]),

  references: jsonb('references').$type<Array<{
    title: string;
    authors: string;
    year: number;
    journal?: string;
    doi?: string;
    url?: string;
  }>>().default([]),

  // Classificação clínica
  icd10Codes: text('icd10_codes').array().default([]),
  tags: text('tags').array().default([]),
  clinicalTests: text('clinical_tests').array().default([]),  // IDs de testes clínicos

  // Controle
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  organizationId: uuid('organization_id'),
  wikiPageId: uuid('wiki_page_id'),
  createdBy: text('created_by'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('idx_exercise_protocols_slug').on(table.slug),
  organizationIdIdx: index('idx_exercise_protocols_organization_id').on(table.organizationId),
  protocolTypeIdx: index('idx_exercise_protocols_protocol_type').on(table.protocolType),
}));

export const exerciseProtocolsRelations = relations(exerciseProtocols, ({ many }) => ({
  protocolExercises: many(protocolExercises),
}));

// ===== PROTOCOL EXERCISES (pivot) =====
export const protocolExercises = pgTable('protocol_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  protocolId: uuid('protocol_id').notNull().references(() => exerciseProtocols.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull(),     // referência lazy (evita circular no Drizzle)

  phaseWeekStart: integer('phase_week_start').notNull(),
  phaseWeekEnd: integer('phase_week_end'),

  setsRecommended: integer('sets_recommended'),
  repsRecommended: integer('reps_recommended'),
  durationSeconds: integer('duration_seconds'),
  frequencyPerWeek: integer('frequency_per_week'),
  progressionNotes: text('progression_notes'),
  orderIndex: integer('order_index').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  protocolIdIdx: index('idx_protocol_exercises_protocol_id').on(table.protocolId),
  exerciseIdIdx: index('idx_protocol_exercises_exercise_id').on(table.exerciseId),
}));

export const protocolExercisesRelations = relations(protocolExercises, ({ one }) => ({
  protocol: one(exerciseProtocols, {
    fields: [protocolExercises.protocolId],
    references: [exerciseProtocols.id],
  }),
}));
