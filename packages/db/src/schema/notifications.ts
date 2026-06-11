import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { withOrganizationPolicy } from "./rls_helper";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    userId: varchar("user_id", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).default("info").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    link: text("link"),
    metadata: jsonb("metadata"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user").on(table.userId),
    index("idx_notifications_org").on(table.organizationId),
    withOrganizationPolicy("notifications", table.organizationId),
  ],
);
