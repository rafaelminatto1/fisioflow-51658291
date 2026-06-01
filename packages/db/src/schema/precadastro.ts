import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { withOrganizationPolicy, withPublicWriteOrganizationPolicy } from "./rls_helper";

export const preRegistrationTokens = pgTable(
  "pre_registration_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    token: text("token").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    maxUses: integer("max_uses"),
    currentUses: integer("current_uses").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    requiredFields: text("required_fields").array().notNull().default(["name", "email"]),
    optionalFields: text("optional_fields").array().notNull().default(["phone"]),
    uiStyle: jsonb("ui_style").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_pre_registration_tokens_org_created").on(table.organizationId, table.createdAt),
    index("idx_pre_registration_tokens_token").on(table.token),
    withOrganizationPolicy("pre_registration_tokens", table.organizationId),
  ],
);

export const preRegistrations = pgTable(
  "pre_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: uuid("token_id")
      .notNull()
      .references(() => preRegistrationTokens.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    birthDate: date("birth_date"),
    address: text("address"),
    notes: text("notes"),
    status: text("status").default("pending").notNull(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    patientId: uuid("patient_id"),
    additionalData: jsonb("additional_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_pre_registrations_org_created").on(table.organizationId, table.createdAt),
    index("idx_pre_registrations_token").on(table.tokenId, table.createdAt),
    ...withPublicWriteOrganizationPolicy("pre_registrations", table.organizationId),
  ],
);
