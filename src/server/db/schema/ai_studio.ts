import { pgTable, uuid, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { patients } from "./patients";
import { profiles } from "./organizations"; // Profiles are in organizations.ts

export const clinicalScribeLogs = pgTable("clinical_scribe_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  therapistId: uuid("therapist_id")
    .notNull()
    .references(() => profiles.userId),
  section: varchar("section", { length: 1 }).notNull(), // S, O, A, P
  rawText: text("raw_text"),
  formattedText: text("formatted_text"),
  tokensUsed: integer("tokens_used").default(0),
  consentTimestamp: timestamp("consent_timestamp").defaultNow().notNull(),
  consentSource: varchar("consent_source", { length: 50 }).default("verbal_confirmed_by_therapist"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
