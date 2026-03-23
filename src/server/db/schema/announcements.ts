import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	boolean,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const announcements = pgTable("announcements", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),
	title: varchar("title", { length: 255 }).notNull(),
	content: text("content").notNull(), // Pode ser HTML ou Markdown
	isMandatory: boolean("is_mandatory").default(false), // Define se é um comunicado normal ou uma Política Obrigatória
	type: varchar("type", { length: 50 }).notNull().default("announcement"), // 'announcement' | 'policy' | 'video'
	mediaUrl: text("media_url"), // Link para vídeo ou PDF anexo
	createdBy: uuid("created_by").notNull(), // ID do admin
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcementReads = pgTable("announcement_reads", {
	id: uuid("id").primaryKey().defaultRandom(),
	announcementId: uuid("announcement_id")
		.notNull()
		.references(() => announcements.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	readAt: timestamp("read_at").defaultNow().notNull(),
});
