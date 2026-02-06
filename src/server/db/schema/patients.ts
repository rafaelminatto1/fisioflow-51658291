/**
 * Patients Schema - RF01.2 Prontuário Eletrônico do Paciente (PEP)
 * 
 * Comprehensive patient management with:
 * - Basic patient data with photo support
 * - Medical records (anamnese)
 * - Surgeries with elapsed time tracking
 * - Treatment goals with countdown
 * - Pathologies with status tracking
 */


// ===== ENUMS =====

import { pgTable, uuid, varchar, text, date, boolean, timestamp, jsonb, pgEnum, integer, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { appointments } from './appointments';
import { sessions } from './sessions';

export const genderEnum = pgEnum('gender', ['M', 'F', 'O']);
export const pathologyStatusEnum = pgEnum('pathology_status', ['active', 'treated', 'monitoring']);
export const goalStatusEnum = pgEnum('goal_status', ['pending', 'in_progress', 'achieved', 'abandoned']);

// ===== PATIENTS =====
export const patients = pgTable('patients', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Basic Info
    fullName: varchar('full_name', { length: 150 }).notNull(),
    cpf: varchar('cpf', { length: 14 }).unique(), // With mask: 000.000.000-00
    rg: varchar('rg', { length: 20 }),
    birthDate: date('birth_date'),
    gender: genderEnum('gender'),

    // Contact
    phone: varchar('phone', { length: 20 }).notNull(),
    phoneSecondary: varchar('phone_secondary', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Profile
    photoUrl: text('photo_url'),
    profession: varchar('profession', { length: 100 }),

    // Address (JSONB for flexibility)
    address: jsonb('address').$type<{
        cep?: string;
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
    }>(),

    // Emergency Contact
    emergencyContact: jsonb('emergency_contact').$type<{
        name?: string;
        phone?: string;
        relationship?: string;
    }>(),

    // Insurance/Health Plan
    insurance: jsonb('insurance').$type<{
        provider?: string;
        plan?: string;
        cardNumber?: string;
        validUntil?: string;
    }>(),

    // Organization & Origin
    organizationId: uuid('organization_id'),
    origin: varchar('origin', { length: 100 }), // How patient found the clinic
    referredBy: varchar('referred_by', { length: 150 }), // Referral source

    // Status & Notes
    isActive: boolean('is_active').default(true).notNull(),
    alerts: jsonb('alerts').$type<string[]>().default([]), // Important alerts for dashboard
    notes: text('notes'),

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
    packages: many(patientPackages),
}));

// ===== MEDICAL RECORDS (Prontuário/Anamnese) =====
export const medicalRecords = pgTable('medical_records', {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }).unique(),

    // Anamnese - RF01.2
    chiefComplaint: text('chief_complaint'), // Queixa Principal
    currentHistory: text('current_history'), // História da Doença Atual (HDA)
    pastHistory: text('past_history'), // Histórico Médico Pregresso
    familyHistory: text('family_history'),

    // Medications & Allergies
    medications: jsonb('medications').$type<Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        startDate?: string;
    }>>().default([]),

    allergies: jsonb('allergies').$type<Array<{
        allergen: string;
        reaction?: string;
        severity?: 'mild' | 'moderate' | 'severe';
    }>>().default([]),

    // Lifestyle
    physicalActivity: text('physical_activity'), // Atividade física habitual
    lifestyle: jsonb('lifestyle').$type<{
        smoking?: boolean;
        alcohol?: boolean;
        sleepQuality?: string;
        stressLevel?: 'low' | 'medium' | 'high';
    }>(),

    // Physical Exam - RF01.2
    physicalExam: jsonb('physical_exam').$type<{
        inspection?: string;
        palpation?: string;
        posture?: string;
        gait?: string;
        // Range of Motion (ADM) - degrees
        rangeOfMotion?: Record<string, {
            active?: number;
            passive?: number;
            normal?: number;
        }>;
        // Muscle Strength (0-5 scale)
        muscleStrength?: Record<string, number>;
        // Special Tests
        specialTests?: Array<{
            name: string;
            result: 'positive' | 'negative';
            notes?: string;
        }>;
    }>(),

    // Diagnosis
    diagnosis: text('diagnosis'),
    icd10Codes: jsonb('icd10_codes').$type<string[]>().default([]),

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

// ===== PATHOLOGIES =====
export const pathologies = pgTable('pathologies', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 200 }).notNull(),
    icdCode: varchar('icd_code', { length: 20 }),
    status: pathologyStatusEnum('status').default('active'),
    diagnosedAt: date('diagnosed_at'),
    treatedAt: date('treated_at'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pathologiesRelations = relations(pathologies, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [pathologies.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));

// ===== SURGERIES =====
export const surgeries = pgTable('surgeries', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 200 }).notNull(),
    surgeryDate: date('surgery_date'),
    surgeon: varchar('surgeon', { length: 150 }),
    hospital: varchar('hospital', { length: 150 }),
    postOpProtocol: text('post_op_protocol'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const surgeriesRelations = relations(surgeries, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [surgeries.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));

// ===== TREATMENT GOALS =====
export const goals = pgTable('goals', {
    id: uuid('id').primaryKey().defaultRandom(),
    medicalRecordId: uuid('medical_record_id').notNull().references(() => medicalRecords.id, { onDelete: 'cascade' }),

    description: text('description').notNull(),
    targetDate: date('target_date'), // For countdown feature
    priority: integer('priority').default(0), // Higher = more important
    status: goalStatusEnum('status').default('pending'),
    achievedAt: timestamp('achieved_at'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const goalsRelations = relations(goals, ({ one }) => ({
    medicalRecord: one(medicalRecords, {
        fields: [goals.medicalRecordId],
        references: [medicalRecords.id],
    }),
}));

// ===== PATIENT PACKAGES (Session Credits) =====
export const packageStatusEnum = pgEnum('package_status', ['active', 'expired', 'used', 'cancelled']);

export const patientPackages = pgTable('patient_packages', {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(), // e.g., "Pacote 10 Sessões"
    totalSessions: integer('total_sessions').notNull(),
    usedSessions: integer('used_sessions').default(0).notNull(),
    remainingSessions: integer('remaining_sessions').notNull(),

    price: numeric('price', { precision: 10, scale: 2 }),
    status: packageStatusEnum('status').default('active'),

    purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patientPackagesRelations = relations(patientPackages, ({ one }) => ({
    patient: one(patients, {
        fields: [patientPackages.patientId],
        references: [patients.id],
    }),
}));
