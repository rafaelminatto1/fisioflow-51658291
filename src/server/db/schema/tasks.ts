import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

export const taskBoards = pgTable('task_boards', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    ownerId: varchar('owner_id').notNull(), // User who created the board
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskColumns = pgTable('task_columns', {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: uuid('board_id').references(() => taskBoards.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    columnId: uuid('column_id').references(() => taskColumns.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'), // Rich text content
    priority: taskPriorityEnum('priority').default('medium'),
    dueDate: timestamp('due_date'),
    
    // Accountability Feature
    requiresAcknowledgment: boolean('requires_acknowledgment').default(false).notNull(),
    
    // Relations to entities (e.g. Patient Evolution)
    patientId: uuid('patient_id'),
    relatedEntityId: uuid('related_entity_id'),
    relatedEntityType: varchar('related_entity_type'), // e.g., 'evolution', 'appointment'
    
    createdBy: varchar('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskAssignments = pgTable('task_assignments', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
    userId: varchar('user_id').notNull(), // Assigned to
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: varchar('assigned_by'),
});

export const taskAcknowledgments = pgTable('task_acknowledgments', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
    userId: varchar('user_id').notNull(),
    
    // Accountability mechanisms
    readAt: timestamp('read_at'), // Recibo de Leitura
    acknowledgedAt: timestamp('acknowledged_at'), // Aceite explícito
    notes: text('notes'), // Optional notes upon acknowledgment
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskVisibility = pgTable('task_visibility', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
    role: varchar('role', { length: 50 }), // 'ADMIN', 'PHYSIOTHERAPIST', 'INTERN'
    userId: varchar('user_id'), // Specific user override
    canView: boolean('can_view').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskAuditLogs = pgTable('task_audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
    action: varchar('action', { length: 100 }).notNull(), // 'created', 'moved', 'assigned', 'read', 'acknowledged'
    performedBy: varchar('performed_by').notNull(),
    details: jsonb('details'), // Optional JSON for old/new values
    timestamp: timestamp('timestamp').defaultNow().notNull(),
});
