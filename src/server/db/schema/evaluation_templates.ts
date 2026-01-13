/**
 * Evaluation Templates Schema
 * 
 * Supports customizable templates for physical exams and evaluations.
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const evaluationTemplates = pgTable('evaluation_templates', {
    id: uuid('id').primaryKey().defaultRandom(),

    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),

    // Categorization
    category: varchar('category', { length: 100 }), // e.g., "Orthopedic", "Neurological", "Respiratory"

    // The structure of the template
    // Can contain predefined fields for physical exam, special tests, etc.
    content: jsonb('content').$type<{
        sections?: Array<{
            id: string;
            title: string;
            fields: Array<{
                id: string;
                label: string;
                type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'radio';
                options?: string[]; // For select/radio
                required?: boolean;
                // Drizzle defaultValue can be any JSON-serializable value
                defaultValue?: string | number | boolean | null;
            }>;
        }>;
        // Mapping to standard medical record fields
        mapping?: {
            physicalExam?: boolean; // Maps to medical_records.physical_exam
            anamnesis?: boolean;
            diagnosis?: boolean;
        };
    }>(),

    isGlobal: boolean('is_global').default(false),
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
