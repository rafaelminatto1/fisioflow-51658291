/**
 * Sessions Schema - RF01.3 Evolução de Sessão (SOAP)
 * 
 * Features:
 * - SOAP structured notes with detailed fields
 * - Auto-save support (draft status)
 * - Session numbering for patient
 * - File attachments (RF01.4)
 * - Replicate previous conduct
 * - Pain scale (EVA 0-10)
 */


// ===== ENUMS =====

import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { patients } from './patients';
import { appointments } from './appointments';

export const sessionStatusEnum = pgEnum('session_status', [
    'draft',      // Auto-saved, not finalized
    'finalized',  // Completed and signed
    'cancelled'   // Session cancelled
]);

// ===== SESSIONS (SOAP) =====
export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Patient & Links
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
    therapistId: uuid('therapist_id').notNull(),
    organizationId: uuid('organization_id'),

    // Session Tracking
    sessionNumber: integer('session_number'), // Sequential per patient
    date: timestamp('date').defaultNow().notNull(),
    duration: integer('duration_minutes'), // Actual session duration

    // ===== SOAP Structure - RF01.3 =====

    // S (Subjetivo): Queixas do paciente, relato de dor, evolução percebida
    subjective: jsonb('subjective').$type<{
        complaints?: string;           // Queixas do paciente
        painScale?: number;            // EVA (0-10)
        painLocation?: string;         // Where is the pain
        painCharacter?: string;        // Type of pain (burning, throbbing, etc)
        perceivedEvolution?: string;   // Patient's perception of progress
        sleepQuality?: 'good' | 'regular' | 'poor';
        medicationChanges?: string;
        notes?: string;
    }>(),

    // O (Objetivo): Avaliação física, medições, escala EVA
    objective: jsonb('objective').$type<{
        vitalSigns?: {
            bloodPressure?: string;      // e.g., "120/80"
            heartRate?: number;
            temperature?: number;
            oxygenSaturation?: number;
        };
        physicalExam?: string;         // General observations
        // Measurements with comparison to previous
        measurements?: Array<{
            name: string;                // e.g., "Knee flexion ROM"
            value: number;
            unit: string;                // e.g., "degrees", "cm"
            previousValue?: number;
            normal?: number;
        }>;
        // Special Tests - Required alerts (e.g., post-op LCA requires ADM)
        specialTests?: Array<{
            name: string;
            result: 'positive' | 'negative';
            notes?: string;
        }>;
        muscleStrength?: Record<string, number>; // 0-5 scale
        edema?: {
            present: boolean;
            location?: string;
            grade?: number;              // 1-4+
        };
        wounds?: string;
        notes?: string;
    }>(),

    // A (Avaliação): Diagnóstico fisioterapêutico, análise da evolução
    assessment: jsonb('assessment').$type<{
        diagnosis?: string;            // Fisio diagnosis
        icd10?: string;
        evolutionAnalysis?: string;    // How patient is progressing
        prognosis?: 'excellent' | 'good' | 'guarded' | 'poor';
        goalsProgress?: Array<{
            goalId?: string;
            status?: 'on_track' | 'behind' | 'achieved';
            notes?: string;
        }>;
        notes?: string;
    }>(),

    // P (Plano): Conduta terapêutica, exercícios, orientações
    plan: jsonb('plan').$type<{
        conduct?: string;              // Therapeutic conduct
        techniques?: string[];         // Techniques used
        exercises?: Array<{
            name: string;
            sets?: number;
            reps?: number;
            duration?: string;
            notes?: string;
        }>;
        orientations?: string;         // Patient instructions
        homeExercises?: string;        // Home program
        nextSessionGoals?: string;
        nextSessionDate?: string;
        referrals?: string;            // If referring to other specialists
        notes?: string;
    }>(),

    // Status & Auto-save
    status: sessionStatusEnum('status').default('draft').notNull(),
    lastAutoSaveAt: timestamp('last_auto_save_at'),
    finalizedAt: timestamp('finalized_at'),
    finalizedBy: uuid('finalized_by'),

    // Replication
    replicatedFromId: uuid('replicated_from_id'), // ID of session conduct was copied from

    // PDF Generation
    pdfUrl: text('pdf_url'),
    pdfGeneratedAt: timestamp('pdf_generated_at'),

    // Alerts
    requiredTests: jsonb('required_tests').$type<string[]>(), // Tests that must be done
    alertsAcknowledged: boolean('alerts_acknowledged').default(false),

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

// ===== SESSION ATTACHMENTS - RF01.4 =====
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'jpg', 'png', 'docx', 'other']);
export const fileCategoryEnum = pgEnum('file_category', [
    'exam',           // Laudos
    'imaging',        // Exames de Imagem
    'document',       // Documentos gerais
    'before_after',   // Fotos antes/depois
    'other'
]);

export const sessionAttachments = pgTable('session_attachments', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Can be attached to session or just patient (for general docs)
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),

    // File Info
    fileName: varchar('file_name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }),
    fileUrl: text('file_url').notNull(),
    thumbnailUrl: text('thumbnail_url'), // For image preview

    fileType: fileTypeEnum('file_type').default('other'),
    mimeType: varchar('mime_type', { length: 100 }),
    category: fileCategoryEnum('category').default('other'),
    sizeBytes: integer('size_bytes'), // Max 10MB = 10485760

    // Metadata
    description: text('description'),
    uploadedBy: uuid('uploaded_by'),
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

// ===== SESSION TEMPLATES =====
// For "Replicate Previous Conduct" feature
export const sessionTemplates = pgTable('session_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id'),
    therapistId: uuid('therapist_id'),

    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),

    // Template SOAP content
    subjective: jsonb('subjective'),
    objective: jsonb('objective'),
    assessment: jsonb('assessment'),
    plan: jsonb('plan'),

    isGlobal: boolean('is_global').default(false), // Available to all therapists

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
