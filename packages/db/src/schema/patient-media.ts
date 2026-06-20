import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { organizations } from "./organizations";
import { sessions } from "./sessions";

export const patientPhotos = pgTable(
  "patient_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    professionalId: uuid("professional_id"),
    photoType: varchar("photo_type", { length: 50 }).notNull().default("clinical"),
    r2Key: text("r2_key").notNull(),
    fileName: varchar("file_name", { length: 500 }),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }).default("image/jpeg"),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    bodyRegion: varchar("body_region", { length: 100 }),
    side: varchar("side", { length: 10 }),
    notes: text("notes"),
    tags: text("tags").array().default([]).notNull(),
    seriesId: uuid("series_id"),
    seriesOrder: integer("series_order").default(1).notNull(),
    comparisonGroupTitle: varchar("comparison_group_title", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_patient_photos_patient").on(table.patientId, table.createdAt),
    index("idx_patient_photos_org").on(table.organizationId),
    index("idx_patient_photos_series").on(table.seriesId),
    index("idx_patient_photos_type").on(table.photoType, table.patientId),
  ],
);
