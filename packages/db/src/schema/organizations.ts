import { pgTable, uuid, varchar, text, timestamp, date, boolean, jsonb } from "drizzle-orm/pg-core";
import { withOrganizationPolicy } from "./rls_helper";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  slug: varchar("slug", { length: 255 }),
  // Campos adicionados via migrations 0074, 0080, 0090, 0097
  metadata: jsonb("metadata").default({}),
  parentId: uuid("parent_id"),
  type: varchar("type", { length: 50 }).default("clinic"),
  pixCity: varchar("pix_city", { length: 100 }),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    fullName: varchar("full_name", { length: 255 }),
    role: varchar("role", { length: 50 }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    phone: varchar("phone", { length: 20 }),
    crefito: varchar("crefito", { length: 50 }),
    specialties: jsonb("specialties"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    address: jsonb("address"),
    birthDate: date("birth_date"),
    isActive: boolean("is_active").default(true),
    emailVerified: boolean("email_verified").default(false),
    preferences: jsonb("preferences"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [withOrganizationPolicy("profiles", table.organizationId)],
);
