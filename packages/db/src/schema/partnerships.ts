import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { withOrganizationPolicy } from "./rls_helper";
import { organizations } from "./organizations";
import { patients } from "./patients";

const MONEY = { precision: 10, scale: 2 } as const;

export const partnerships = pgTable(
  "partnerships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    studentSessionFee: numeric("student_session_fee", MONEY).default("160.00").notNull(),
    professorPays: boolean("professor_pays").default(false).notNull(),
    professorSessionFee: numeric("professor_session_fee", MONEY).default("0.00").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_partnerships_org").on(table.organizationId),
    withOrganizationPolicy("partnerships", table.organizationId),
  ],
);

export const partnershipsRelations = relations(partnerships, ({ many }) => ({
  patients: many(patients),
}));
