/**
 * Rotas: Templates de Exercícios
 * GET /api/templates          — lista com filtros
 * GET /api/templates/:id      — detalhe com itens
 */
import { Hono } from 'hono';
import { eq, ilike, and, sql } from 'drizzle-orm';
import { createDb } from '../lib/db';
import type { Env } from '../types/env';
import { requireAuth, AuthVariables } from '../lib/auth';
import { pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Runtime table definitions (schema not in shared package yet)
const evidenceLevelEnum = pgEnum('evidence_level', ['A', 'B', 'C', 'D']);

const exerciseTemplates = pgTable('exercise_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  firestoreId: varchar('firestore_id', { length: 255 }),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 200 }),
  conditionName: varchar('condition_name', { length: 500 }),
  templateVariant: varchar('template_variant', { length: 200 }),
  clinicalNotes: text('clinical_notes'),
  contraindications: text('contraindications'),
  precautions: text('precautions'),
  progressionNotes: text('progression_notes'),
  evidenceLevel: varchar('evidence_level', { length: 1 }),
  bibliographicReferences: text('bibliographic_references').array().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  organizationId: uuid('organization_id'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const exerciseTemplateItems = pgTable('exercise_template_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  firestoreId: varchar('firestore_id', { length: 255 }),
  templateId: uuid('template_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  sets: integer('sets'),
  repetitions: integer('repetitions'),
  duration: integer('duration'),
  notes: text('notes'),
  weekStart: integer('week_start'),
  weekEnd: integer('week_end'),
  clinicalNotes: text('clinical_notes'),
  focusMuscles: text('focus_muscles').array().default([]),
  purpose: text('purpose'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== LISTA =====
app.get('/', async (c) => {
  const db = createDb(c.env);
  const { q, category, page = '1', limit = '20' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(exerciseTemplates.isActive, true)];
  if (q) conditions.push(ilike(exerciseTemplates.name, `%${q}%`));
  if (category) conditions.push(ilike(exerciseTemplates.category, `%${category}%`));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select({
      id: exerciseTemplates.id,
      firestoreId: exerciseTemplates.firestoreId,
      name: exerciseTemplates.name,
      description: exerciseTemplates.description,
      category: exerciseTemplates.category,
      conditionName: exerciseTemplates.conditionName,
      templateVariant: exerciseTemplates.templateVariant,
      evidenceLevel: exerciseTemplates.evidenceLevel,
      createdAt: exerciseTemplates.createdAt,
    })
      .from(exerciseTemplates)
      .where(where)
      .orderBy(exerciseTemplates.name)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(exerciseTemplates).where(where),
  ]);

  return c.json({
    data: rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: Number(countResult[0]?.count ?? 0),
      pages: Math.ceil(Number(countResult[0]?.count ?? 0) / limitNum),
    },
  });
});

// ===== DETALHE COM ITENS =====
app.get('/:id', async (c) => {
  const db = createDb(c.env);
  const { id } = c.req.param();

  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const condition = isUuid
    ? eq(exerciseTemplates.id, id)
    : eq(exerciseTemplates.firestoreId, id);

  const [template] = await db
    .select()
    .from(exerciseTemplates)
    .where(and(condition, eq(exerciseTemplates.isActive, true)))
    .limit(1);

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  const items = await db
    .select()
    .from(exerciseTemplateItems)
    .where(eq(exerciseTemplateItems.templateId, template.id))
    .orderBy(exerciseTemplateItems.orderIndex);

  return c.json({ data: { ...template, items } });
});

// ===== CRIAR TEMPLATE =====
app.post('/', requireAuth, async (c) => {
  const db = createDb(c.env);
  const user = c.get('user');
  const body = await c.req.json();
  const { items, ...templateData } = body;

  const [template] = await db
    .insert(exerciseTemplates)
    .values({
      ...templateData,
      createdBy: user.uid,
    })
    .returning();

  let insertedItems: Array<Record<string, unknown>> = [];
  if (items && Array.isArray(items) && items.length > 0) {
    insertedItems = await db
      .insert(exerciseTemplateItems)
      .values(
        items.map((item: any, index: number) => ({
          ...item,
          templateId: template.id,
          orderIndex: item.orderIndex ?? index,
        }))
      )
      .returning();
  }

  return c.json({ data: { ...template, items: insertedItems } });
});

// ===== ATUALIZAR TEMPLATE =====
app.put('/:id', requireAuth, async (c) => {
  const db = createDb(c.env);
  const { id } = c.req.param();
  const body = await c.req.json();
  const { items, ...templateData } = body;

  delete templateData.id;
  delete templateData.createdBy;
  delete templateData.createdAt;

  const [template] = await db
    .update(exerciseTemplates)
    .set({
      ...templateData,
      updatedAt: new Date(),
    })
    .where(eq(exerciseTemplates.id, id))
    .returning();

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  let updatedItems: Array<Record<string, unknown>> = [];
  if (items && Array.isArray(items)) {
    // Apaga os items existentes e insere os novos (substituição completa)
    await db.delete(exerciseTemplateItems).where(eq(exerciseTemplateItems.templateId, template.id));

    if (items.length > 0) {
      updatedItems = await db
        .insert(exerciseTemplateItems)
        .values(
          items.map((item: any, index: number) => {
            delete item.id;
            delete item.createdAt;
            return {
              ...item,
              templateId: template.id,
              orderIndex: item.orderIndex ?? index,
            };
          })
        )
        .returning();
    }
  } else {
    // Se não enviou items, recupera os existentes para retornar no objeto
    updatedItems = await db
      .select()
      .from(exerciseTemplateItems)
      .where(eq(exerciseTemplateItems.templateId, template.id))
      .orderBy(exerciseTemplateItems.orderIndex);
  }

  return c.json({ data: { ...template, items: updatedItems } });
});

// ===== DELETAR TEMPLATE (soft delete) =====
app.delete('/:id', requireAuth, async (c) => {
  const db = createDb(c.env);
  const { id } = c.req.param();

  const [template] = await db
    .update(exerciseTemplates)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(exerciseTemplates.id, id))
    .returning();

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  return c.json({ ok: true });
});

export { app as templatesRoutes };
