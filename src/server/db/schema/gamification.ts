
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, timestamp, jsonb, date, unique } from "drizzle-orm/pg-core";
import { patients } from "./patients";

// Patient Gamification Table
export const patientGamification = pgTable("patient_gamification", {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
    currentXp: integer("current_xp").default(0),
    level: integer("level").default(1),
    currentStreak: integer("current_streak").default(0),
    longestStreak: integer("longest_streak").default(0),
    totalPoints: integer("total_points").default(0),
    lastActivityDate: timestamp("last_activity_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    uniquePatient: unique().on(t.patientId)
}));

// XP Transactions Table
export const xpTransactions = pgTable("xp_transactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    createdBy: uuid("created_by") // References auth.users, keeping simplified for now
});

// Achievements Table
export const achievements = pgTable("achievements", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    xpReward: integer("xp_reward").default(50),
    icon: text("icon"),
    category: text("category").default('general'),
    requirements: jsonb("requirements"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Achievements Log (from types.ts reference, though not explicitly in the migration file read, it was referenced in types.ts so should be here)
export const achievementsLog = pgTable("achievements_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
    achievementId: uuid("achievement_id").notNull().references(() => achievements.id),
    achievementTitle: text("achievement_title").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    xpReward: integer("xp_reward"),
});

// Daily Quests Table
export const dailyQuests = pgTable("daily_quests", {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
    date: date("date").defaultNow(), // Logic default to CURRENT_DATE
    // Definition of Quest Item interface for Drizzle usage
    questsData: jsonb("quests_data").notNull().default(sql`'[]'::jsonb`).$type<{
        id: string;
        title: string;
        completed: boolean;
        xp: number;
        icon: string;
        description?: string;
    }[]>(),
    completedCount: integer("completed_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
    uniquePatientDate: unique().on(t.patientId, t.date)
}));
