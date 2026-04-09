/**
 * Wiki Schema
 *
 * Base de conhecimento colaborativa estilo Notion com:
 * - Hierarquia de páginas (parent/child)
 * - Histórico de versões
 * - Tags e categorias
 * - Controle de acesso por organização
 */

import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	integer, customType
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===== WIKI PAGES =====
export const wikiPages = pgTable("wiki_pages", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: varchar("slug", { length: 350 }).unique().notNull(),
	title: varchar("title", { length: 500 }).notNull(),

	// Conteúdo
	content: text("content").default(""), // Markdown
	htmlContent: text("html_content"), // Cache renderizado

	// Aparência
	icon: varchar("icon", { length: 50 }), // emoji ex: "📋"
	coverImage: text("cover_image"), // URL da imagem de capa

	// Hierarquia
	parentId: uuid("parent_id"), // página pai

	// Metadados
	category: varchar("category", { length: 100 }),
	tags: text("tags").array().default([]),

	// Controle de publicação
	isPublished: boolean("is_published").default(true).notNull(),
	isPublic: boolean("is_public").default(true).notNull(), // false = privado da org

	// Estatísticas
	viewCount: integer("view_count").default(0).notNull(),

	// Versionamento
	version: integer("version").default(1).notNull(),

	// Organização e autoria
	organizationId: uuid("organization_id"), // null = página pública da plataforma
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),

	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	deletedAt: timestamp("deleted_at"), // soft delete

	// AI Vector Search (Cloudflare bge-base-en = 768 dimensions)
	embedding: customType<{ data: number[] }>({
		dataType() {
			return "vector(768)";
		},
	})("embedding"),
});

export const wikiPagesRelations = relations(wikiPages, ({ one, many }) => ({
	parent: one(wikiPages, {
		fields: [wikiPages.parentId],
		references: [wikiPages.id],
		relationName: "children",
	}),
	children: many(wikiPages, { relationName: "children" }),
	versions: many(wikiPageVersions),
}));

// ===== WIKI PAGE VERSIONS =====
export const wikiPageVersions = pgTable("wiki_page_versions", {
	id: uuid("id").primaryKey().defaultRandom(),
	pageId: uuid("page_id")
		.notNull()
		.references(() => wikiPages.id),

	title: varchar("title", { length: 500 }).notNull(),
	content: text("content").notNull(),
	htmlContent: text("html_content"),

	version: integer("version").notNull(),
	comment: varchar("comment", { length: 500 }), // ex: "Atualização das referências"
	organizationId: uuid("organization_id"),
	createdBy: text("created_by"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wikiPageVersionsRelations = relations(
	wikiPageVersions,
	({ one }) => ({
		page: one(wikiPages, {
			fields: [wikiPageVersions.pageId],
			references: [wikiPages.id],
		}),
	}),
);
