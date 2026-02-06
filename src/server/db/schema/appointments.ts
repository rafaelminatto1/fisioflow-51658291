/**
 * Appointments Schema - RF02 Agendamento & Calendário
 * 
 * Features:
 * - Day/Week/Month views with time slots
 * - Group appointments support
 * - Conflict detection fields
 * - WhatsApp confirmation tracking
 * - Payment status
 */


// ===== ENUMS =====

import { pgTable, uuid, varchar, text, date, time, boolean, timestamp, integer, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { patients } from './patients';
import { sessions } from './sessions';

export const appointmentStatusEnum = pgEnum('appointment_status', [
    'scheduled',    // Created, pending confirmation
    'confirmed',    // Confirmed via WhatsApp or phone
    'in_progress',  // Session started
    'completed',    // Session finished
    'cancelled',    // Cancelled by patient or clinic
    'no_show',      // Patient didn't show up
    'rescheduled'   // Moved to another time
]);

export const appointmentTypeEnum = pgEnum('appointment_type', [
    'evaluation',   // Initial assessment
    'session',      // Regular treatment session
    'reassessment', // Follow-up assessment
    'group',        // Group therapy
    'return'        // Quick return visit
]);

export const paymentStatusEnum = pgEnum('payment_status', [
    'pending',
    'paid',
    'partial',
    'refunded'
]);

// ===== APPOINTMENTS =====
export const appointments = pgTable('appointments', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Patient & Therapist
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    therapistId: uuid('therapist_id').notNull(), // FK to auth.users or therapists table

    // Organization (multi-tenant)
    organizationId: uuid('organization_id'),

    // Scheduling - RF02.1
    date: date('date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    durationMinutes: integer('duration_minutes').default(60).notNull(), // 30, 60, 90

    // Status & Type
    status: appointmentStatusEnum('status').default('scheduled').notNull(),
    type: appointmentTypeEnum('type').default('session').notNull(),

    // Group Appointments - RF02.2
    isGroup: boolean('is_group').default(false),
    maxParticipants: integer('max_participants').default(1),
    currentParticipants: integer('current_participants').default(1),
    groupId: uuid('group_id'), // Links multiple appointments as a group

    // Room/Resource (for conflict detection)
    roomId: uuid('room_id'),

    // Confirmation - RF02.3
    confirmedAt: timestamp('confirmed_at'),
    confirmedVia: varchar('confirmed_via', { length: 50 }), // 'whatsapp', 'phone', 'app'
    reminderSentAt: timestamp('reminder_sent_at'),

    // Payment - RF02.3
    paymentStatus: paymentStatusEnum('payment_status').default('pending'),
    paymentAmount: numeric('payment_amount', { precision: 10, scale: 2 }),
    paidAt: timestamp('paid_at'),
    packageId: uuid('package_id'), // If using session package

    // Notes & Cancellation
    notes: text('notes'),
    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: uuid('cancelled_by'),

    // Rescheduling
    rescheduledFrom: uuid('rescheduled_from'), // Original appointment ID
    rescheduledTo: uuid('rescheduled_to'), // New appointment ID

    // Recurrence (for repeating appointments)
    isRecurring: boolean('is_recurring').default(false),
    recurrencePattern: varchar('recurrence_pattern', { length: 50 }), // 'weekly', 'biweekly'
    recurrenceGroupId: uuid('recurrence_group_id'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdBy: uuid('created_by'),
});

export const appointmentsRelations = relations(appointments, ({ one }) => ({
    patient: one(patients, {
        fields: [appointments.patientId],
        references: [patients.id],
    }),
    session: one(sessions, {
        fields: [appointments.id],
        references: [sessions.appointmentId],
    }),
}));

// ===== ROOMS/RESOURCES =====
export const rooms = pgTable('rooms', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id'),

    name: varchar('name', { length: 100 }).notNull(),
    capacity: integer('capacity').default(1),
    isActive: boolean('is_active').default(true),

    // Working hours
    workingHours: text('working_hours').$type<{
        monday?: { start: string; end: string };
        tuesday?: { start: string; end: string };
        wednesday?: { start: string; end: string };
        thursday?: { start: string; end: string };
        friday?: { start: string; end: string };
        saturday?: { start: string; end: string };
        sunday?: { start: string; end: string };
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===== BLOCKED TIME SLOTS =====
export const blockedSlots = pgTable('blocked_slots', {
    id: uuid('id').primaryKey().defaultRandom(),

    therapistId: uuid('therapist_id'),
    roomId: uuid('room_id'),
    organizationId: uuid('organization_id'),

    date: date('date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    reason: varchar('reason', { length: 200 }),
    isAllDay: boolean('is_all_day').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});
