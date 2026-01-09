
import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { patients } from './patients';
import { appointments } from './appointments';

export const sessionStatusEnum = pgEnum('session_status', ['draft', 'finalized']);

export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    therapistId: uuid('therapist_id').notNull(),

    date: timestamp('date').defaultNow().notNull(),

    // SOAP Structure
    subjective: jsonb('subjective').$type<{
        complaints?: string;
        painScale?: number; // 0-10
        perceivedEvolution?: string;
    }>(),

    objective: jsonb('objective').$type<{
        physicalExam?: string;
        measurements?: Record<string, any>;
        specialTests?: Record<string, boolean>; // test name -> positive/negative
    }>(),

    assessment: jsonb('assessment').$type<{
        diagnosis?: string;
        analysis?: string;
    }>(),

    plan: jsonb('plan').$type<{
        conduct?: string;
        exercises?: string[];
        orientations?: string;
        nextSessionGoals?: string;
    }>(),

    status: sessionStatusEnum('status').default('draft').notNull(),
    finalizedAt: timestamp('finalized_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
    patient: one(patients, {
        fields: [sessions.patientId],
        references: [patients.id],
    }),
    appointment: one(appointments, {
        fields: [sessions.appointmentId],
        references: [appointments.id],
    }),
    attachments: many(sessionAttachments),
}));

// Attachments (RF01.4)
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'image', 'document', 'other']);
export const fileCategoryEnum = pgEnum('file_category', ['exam', 'report', 'document', 'other']);

export const sessionAttachments = pgTable('session_attachments', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }), // Denormalized for quick access

    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileType: fileTypeEnum('file_type').default('other'),
    category: fileCategoryEnum('category').default('other'),
    sizeBytes: integer('size_bytes'),

    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const sessionAttachmentsRelations = relations(sessionAttachments, ({ one }) => ({
    session: one(sessions, {
        fields: [sessionAttachments.sessionId],
        references: [sessions.id],
    }),
    patient: one(patients, {
        fields: [sessionAttachments.patientId],
        references: [patients.id],
    }),
}));
