import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { exercises } from "./exercises";
import { organizations } from "./organizations";

// ===== ENUMS =====
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "youtube"]);

// ===== MEDIA GALLERY =====
/**
 * Biblioteca centralizada de mídia para a organização.
 * Permite organizar arquivos em pastas e reutilizá-los em diferentes partes do sistema.
 */
export const mediaGallery = pgTable(
  "media_gallery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),

    name: varchar("name", { length: 255 }).notNull(),
    type: mediaTypeEnum("type").default("image").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),

    // Organização por pastas (ex: "exercicios/ombro", "clinica/logo")
    folder: varchar("folder", { length: 255 }).default("Geral").notNull(),

    // Metadados técnicos
    size: integer("size"),
    mimeType: varchar("mime_type", { length: 100 }),
    metadata: jsonb("metadata").$type<{
      width?: number;
      height?: number;
      duration?: number;
      youtubeId?: string;
      provider?: "r2" | "stream" | "youtube";
    }>(),

    isActive: text("is_active").default("true"), // Usando text para flexibilidade ou boolean se preferir

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("idx_media_gallery_org_id").on(table.organizationId),
    folderIdx: index("idx_media_gallery_folder").on(table.folder),
    typeIdx: index("idx_media_gallery_type").on(table.type),
  }),
);

// ===== EXERCISE MEDIA ATTACHMENTS =====
/**
 * Tabela de junção para suportar múltiplas mídias por exercício com ordem e observações.
 */
export const exerciseMediaAttachments = pgTable(
  "exercise_media_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => mediaGallery.id, {
      onDelete: "set null",
    }),

    // Campos denormalizados ou específicos da instância no exercício
    type: mediaTypeEnum("type").notNull(),
    url: text("url").notNull(),
    caption: text("caption"), // Observação/Legenda do exercício
    orderIndex: integer("order_index").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    exerciseIdx: index("idx_exercise_media_exercise_id").on(table.exerciseId),
    orderIdx: index("idx_exercise_media_order").on(table.orderIndex),
  }),
);

// ===== RELATIONS =====
export const mediaGalleryRelations = relations(mediaGallery, ({ many }) => ({
  attachments: many(exerciseMediaAttachments),
}));

export const exerciseMediaAttachmentsRelations = relations(exerciseMediaAttachments, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseMediaAttachments.exerciseId],
    references: [exercises.id],
  }),
  media: one(mediaGallery, {
    fields: [exerciseMediaAttachments.mediaId],
    references: [mediaGallery.id],
  }),
}));
