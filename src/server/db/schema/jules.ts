import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	jsonb,
	varchar,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Jules Pull Request Reviews
 * Stores the history and outcomes of PR Bot reviews.
 */
export const julesPrReviews = pgTable(
	"jules_pr_reviews",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		prNumber: integer("pr_number").notNull(),
		repoName: varchar("repo_name", { length: 255 }).notNull(),
		summary: text("summary"),
		// Storing the detailed review as JSONB for flexible querying and dashboarding
		reviewData: jsonb("review_data").$type<{
			files: Array<{
				file: string;
				analysis: string;
			}>;
			score?: number;
		}>(),
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		repoPrIdx: index("idx_jules_pr_repo_number").on(table.repoName, table.prNumber),
		createdAtIdx: index("idx_jules_pr_created_at").on(table.createdAt),
	}),
);

/**
 * Jules Developer Learnings
 * Centralized knowledge base derived from bot findings and CLI syncs.
 */
export const julesLearnings = pgTable(
	"jules_learnings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		category: varchar("category", { length: 100 }).notNull(), // e.g., 'performance', 'security', 'styles'
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content").notNull(),
		
		// Optional link to the PR review that generated this learning
		prReviewId: uuid("pr_review_id").references(() => julesPrReviews.id, { onDelete: "set null" }),
		
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		categoryIdx: index("idx_jules_learnings_category").on(table.category),
	}),
);

// Relations
export const julesPrReviewsRelations = relations(julesPrReviews, ({ many }) => ({
	learnings: many(julesLearnings),
}));

export const julesLearningsRelations = relations(julesLearnings, ({ one }) => ({
	prReview: one(julesPrReviews, {
		fields: [julesLearnings.prReviewId],
		references: [julesPrReviews.id],
	}),
}));
