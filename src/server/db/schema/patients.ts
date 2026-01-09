
import { pgTable, uuid, varchar, text, date, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { appointments } from './appointments';
import { sessions } from './sessions';

export const genderEnum = pgEnum('gender', ['M', 'F', 'O']);

export const patients = pgTable('patients', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    cpf: varchar('cpf', { length: 11 }).unique(),
    birthDate: date('birth_date'),
    gender: genderEnum('gender'),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    photoUrl: text('photo_url'),

    // JSONB para dados estruturados
    address: jsonb('address').$type<{
        cep?: string
        street?: string
        number?: string
        complement?: string
        neighborhood?: string
        city?: string
        state?: string
    }>(),

    emergencyContact: jsonb('emergency_contact').$type<{
        name?: string
        phone?: string
        relationship?: string
    }>(),

    insurance: jsonb('insurance').$type<{
        provider?: string
        plan?: string
        cardNumber?: string
        validUntil?: string
    }>(),

    origin: varchar('origin', { length: 50 }),
    notes: text('notes'),
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const patientsRelations = relations(patients, ({ one, many }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [patients.id],
        references: [medicalRecords.patientId],
    }),
    appointments: many(appointments),
    sessions: many(sessions),
}));

// Prontuário
export const medicalRecords = pgTable('medical_records', {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }).unique(),

    chiefComplaint: text('chief_complaint'),
    historyCurrent: text('history_current'),
    historyPast: text('history_past'),
    medications: jsonb('medications').$type<string[]>().default([]),
    allergies: jsonb('allergies').$type<string[]>().default([]),
    physicalActivity: text('physical_activity'),
    physicalExam: jsonb('physical_exam').$type<Record<string, any>>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
    patient: one(patients, {
        fields: [medicalRecords.patientId],
        references: [patients.id],
    }),
    pathologies: many(pathologies),
    surgeries: many(surgeries),
    goals: many(goals),
}));

// Patologias
export const pathologyStatusEnum = pgEnum('pathology_status', ['active', 'treated', 'monitoring']);

export const pathologies = pgTable('pathologies', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    icdCode: varchar('icd_code', { length: 20 }),
    status: pathologyStatusEnum('status').default('active'),
    diagnosedAt: date('diagnosed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pathologiesRelations = relations(pathologies, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [pathologies.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));

// Cirurgias
export const surgeries = pgTable('surgeries', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    surgeryDate: date('surgery_date'),
    surgeon: varchar('surgeon', { length: 100 }),
    hospital: varchar('hospital', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const surgeriesRelations = relations(surgeries, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [surgeries.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));

// Objetivos do tratamento
export const goalStatusEnum = pgEnum('goal_status', ['pending', 'in_progress', 'achieved', 'abandoned']);

export const goals = pgTable('goals', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    targetDate: date('target_date'),
    status: goalStatusEnum('status').default('pending'),
    achievedAt: timestamp('achieved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [goals.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));
