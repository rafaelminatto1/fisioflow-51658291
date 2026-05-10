import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { organizations } from "./organizations";
import { exercisePrescriptions } from "./clinical";
import { exercises } from "./exercises";
import { withOrganizationPolicy } from "./rls_helper";

// ===== PATIENT PORTAL USERS =====
// Centralizes access for patients to the portal
export const patientPortalUsers = pgTable(
  "patient_portal_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .references(() => patients.id)
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    
    // Login Identifiers
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    
    // Security / Auth
    otpSecret: text("otp_secret"), // For TOTP or similar
    magicLinkToken: text("magic_link_token"),
    magicLinkExpiresAt: timestamp("magic_link_expires_at"),
    
    // Preferences & Metadata
    lastLoginAt: timestamp("last_login_at"),
    biometricEnabled: boolean("biometric_enabled").default(false).notNull(),
    pushToken: text("push_token"), // For Expo push notifications
    locale: varchar("locale", { length: 10 }).default("pt-BR").notNull(),
    
    isActive: boolean("is_active").default(true).notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patient_portal_phone").on(table.phone),
    index("idx_patient_portal_patient").on(table.patientId),
    index("idx_patient_portal_org").on(table.organizationId),
    withOrganizationPolicy("patient_portal_users", table.organizationId),
  ]
);

// ===== PATIENT EXERCISE LOGS =====
// Records patient adherence to Home Exercise Programs (HEP)
export const patientExerciseLogs = pgTable(
  "patient_exercise_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .references(() => patients.id)
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    
    // Exercise Reference
    exerciseId: uuid("exercise_id").references(() => exercises.id),
    prescriptionId: uuid("prescription_id").references(() => exercisePrescriptions.id),
    
    // Adherence Data
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    painLevel: integer("pain_level"), // 0-10 scale
    difficulty: varchar("difficulty", { length: 20 }), // easy, medium, hard
    notes: text("notes"),
    
    // Execution Details
    setsCompleted: integer("sets_completed"),
    repsCompleted: integer("reps_completed"),
    durationSeconds: integer("duration_seconds"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_patient_exercise_logs_patient").on(table.patientId),
    index("idx_patient_exercise_logs_prescription").on(table.prescriptionId),
    withOrganizationPolicy("patient_exercise_logs", table.organizationId),
  ]
);
