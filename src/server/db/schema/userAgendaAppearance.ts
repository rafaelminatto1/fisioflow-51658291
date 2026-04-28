/**
 * User Agenda Appearance Schema
 *
 * Persists the AgendaAppearanceState (per-view appearance overrides) for each
 * user/organization pair, enabling cross-device sync of agenda visual settings.
 *
 * Requirements: 3.1, 3.8
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userAgendaAppearance = pgTable(
  "user_agenda_appearance",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant isolation (RF03.8)
    profileId: text("profile_id").notNull(),
    organizationId: text("organization_id").notNull(),

    // Serialized AgendaAppearanceState (global + per-view overrides)
    appearanceData: jsonb("appearance_data").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Enforce one appearance profile per user per organization
    uniqueIndex("idx_user_agenda_appearance_unique").on(
      table.profileId,
      table.organizationId,
    ),
    // Fast lookup by profile + organization
    index("idx_user_agenda_appearance_profile").on(
      table.profileId,
      table.organizationId,
    ),
  ],
);
