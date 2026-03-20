import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 255 }),
	slug: varchar("slug", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id"),
	name: varchar("name", { length: 255 }),
	email: varchar("email", { length: 255 }),
	fullName: varchar("full_name", { length: 255 }),
	role: varchar("role", { length: 50 }),
	organizationId: uuid("organization_id"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
