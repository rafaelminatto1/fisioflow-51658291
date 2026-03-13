import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
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

export const difficultyEnum = pgEnum('exercise_difficulty', [
  'iniciante',
  'intermediario',
  'avancado',
]);

// Tables
export const exerciseCategories = pgTable('exercise_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 250 }).unique(),
  name: varchar('name', { length: 250 }).notNull(),
  categoryId: uuid('category_id'),
  difficulty: difficultyEnum('difficulty').default('iniciante'),
  description: text('description'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  musclesPrimary: text('muscles_primary').array().default([]),
  bodyParts: text('body_parts').array().default([]),
  equipment: text('equipment').array().default([]),
  durationSeconds: integer('duration_seconds'),
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exerciseProtocols = pgTable('exercise_protocols', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 250 }).unique(),
  name: varchar('name', { length: 250 }).notNull(),
  conditionName: varchar('condition_name', { length: 250 }),
  protocolType: protocolTypeEnum('protocol_type').default('patologia'),
  evidenceLevel: evidenceLevelEnum('evidence_level'),
  description: text('description'),
  weeksTotal: integer('weeks_total'),
  phases: jsonb('phases').default([]),
  milestones: jsonb('milestones').default([]),
  restrictions: jsonb('restrictions').default([]),
  icd10Codes: text('icd10_codes').array().default([]),
  tags: text('tags').array().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const protocolExercises = pgTable('protocol_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  protocolId: uuid('protocol_id').notNull(),
  exerciseId: uuid('exercise_id').notNull(),
  phaseWeekStart: integer('phase_week_start').notNull(),
  phaseWeekEnd: integer('phase_week_end'),
  orderIndex: integer('order_index').default(0),
});

export const exerciseFavorites = pgTable('exercise_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id').notNull(),
  userId: text('user_id').notNull(),
  organizationId: uuid('organization_id'),
});

// Note: Relations are omitted to avoid extractTablesRelationalConfig issues in Workers bundle
