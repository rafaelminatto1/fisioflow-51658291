
import { pgTable, uuid, varchar, text, date, time, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { patients } from './patients';

export const appointmentStatusEnum = pgEnum('appointment_status', [
    'scheduled', 'confirmed', 'cancelled', 'attended', 'no_show', 'rescheduled'
]);

export const appointmentTypeEnum = pgEnum('appointment_type', [
    'evaluation', 'session', 'group', 'reassessment'
]);

export const appointments = pgTable('appointments', {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    therapistId: uuid('therapist_id').notNull(), // Assuming linked to auth.users external or separate table

    date: date('date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    durationMinutes: integer('duration_minutes').default(60).notNull(),

    status: appointmentStatusEnum('status').default('scheduled').notNull(),
    type: appointmentTypeEnum('type').default('session').notNull(),

    isGroup: boolean('is_group').default(false),
    maxParticipants: integer('max_participants').default(1),

    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
    patient: one(patients, {
        fields: [appointments.patientId],
        references: [patients.id],
    }),
    // session: one(sessions) // Will add in sessions.ts
}));
