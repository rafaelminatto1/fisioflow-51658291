import { pgTable, text, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { withOrganizationPolicy } from "./rls_helper";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    senderId: varchar("sender_id", { length: 255 }).notNull(),
    recipientId: varchar("recipient_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 50 }).default("text").notNull(),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    status: varchar("status", { length: 50 }).default("sent").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    withOrganizationPolicy("messages", table.organizationId),
  ],
);

