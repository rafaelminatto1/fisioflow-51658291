import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  time,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, profiles } from "./organizations";
import { patients } from "./patients";

/** Enums for Group Management */
export const groupStatusEnum = pgEnum("group_status", ["active", "inactive", "full"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["confirmed", "waitlist", "cancelled"]);
export const checkInStatusEnum = pgEnum("checkin_status", ["present", "absent", "late"]);

/**
 * Group Classes (Turmas)
 * Ex: "Pilates Avançado 08:00", "Funcional Mooca - Segunda/Quarta"
 */
export const groupClasses = pgTable("group_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  therapistId: uuid("therapist_id").references(() => profiles.id),
  capacity: integer("capacity").default(5).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Dom-Sab)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: groupStatusEnum("status").default("active").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("idx_group_classes_org").on(table.organizationId),
}));

/**
 * Patient Enrollments (Matrículas em Turmas)
 */
export const groupEnrollments = pgTable("group_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  classId: uuid("class_id").references(() => groupClasses.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  status: enrollmentStatusEnum("status").default("confirmed").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  validUntil: timestamp("valid_until"), // Para planos mensais/trimestrais
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  classIdx: index("idx_enrollments_class").on(table.classId),
  patientIdx: index("idx_enrollments_patient").on(table.patientId),
}));

/**
 * Group Check-ins (Frequência)
 */
export const groupCheckins = pgTable("group_checkins", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  enrollmentId: uuid("enrollment_id").references(() => groupEnrollments.id).notNull(),
  sessionDate: timestamp("session_date").notNull(),
  status: checkInStatusEnum("status").default("present").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("idx_checkins_date").on(table.sessionDate),
  enrollmentIdx: index("idx_checkins_enrollment").on(table.enrollmentId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const groupClassesRelations = relations(groupClasses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [groupClasses.organizationId],
    references: [organizations.id],
  }),
  therapist: one(profiles, {
    fields: [groupClasses.therapistId],
    references: [profiles.id],
  }),
  enrollments: many(groupEnrollments),
}));

export const groupEnrollmentsRelations = relations(groupEnrollments, ({ one, many }) => ({
  class: one(groupClasses, {
    fields: [groupEnrollments.classId],
    references: [groupClasses.id],
  }),
  patient: one(patients, {
    fields: [groupEnrollments.patientId],
    references: [patients.id],
  }),
  checkins: many(groupCheckins),
}));

export const groupCheckinsRelations = relations(groupCheckins, ({ one }) => ({
  enrollment: one(groupEnrollments, {
    fields: [groupCheckins.enrollmentId],
    references: [groupEnrollments.id],
  }),
}));
