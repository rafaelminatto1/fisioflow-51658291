import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
import { patients } from './patients';

export const patientGoals = pgTable('patient_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => patients.id).notNull(),
  organizationId: uuid('organization_id').notNull(),
  description: text('description').notNull(),
  targetDate: timestamp('target_date'),
  status: text('status', { enum: ['em_andamento', 'concluido', 'cancelado'] }).default('em_andamento').notNull(),
  priority: text('priority', { enum: ['baixa', 'media', 'alta'] }).default('media'),
  achievedAt: timestamp('achieved_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const patientPathologies = pgTable('patient_pathologies', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => patients.id).notNull(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  diagnosedAt: timestamp('diagnosed_at'),
  status: text('status', { enum: ['ativo', 'resolvido', 'cronico'] }).default('ativo').notNull(),
  isPrimary: boolean('is_primary').default(false),
  icdCode: text('icd_code'), // CID-10
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
