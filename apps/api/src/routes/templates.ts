/**
 * Rotas: Templates de Exercícios
 * GET /api/templates          — lista com filtros
 * GET /api/templates/:id      — detalhe com itens
 */
import { Hono } from 'hono';
import { eq, ilike, and, or, isNull, sql } from 'drizzle-orm';
import { createDb, createPool } from '../lib/db';
import type { Env } from '../types/env';
import { requireAuth, verifyToken, AuthVariables } from '../lib/auth';
import { pgTable, uuid, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Runtime table definitions (schema not in shared package yet)

const exerciseTemplateCategories = pgTable('exercise_template_categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon'),
  orderIndex: integer('order_index').notNull().default(0),
});

const exerciseTemplates = pgTable('exercise_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  templateType: text('template_type').notNull().default('custom'),
  patientProfile: text('patient_profile'),
  sourceTemplateId: uuid('source_template_id'),
  isDraft: boolean('is_draft').notNull().default(false),
  exerciseCount: integer('exercise_count').notNull().default(0),
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  organizationId: uuid('organization_id'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const exerciseTemplateItems = pgTable('exercise_template_items', {
  id: uuid('id').primaryKey().defaultRandom(),
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

const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 250 }).notNull(),
  imageUrl: text('image_url'),
  thumbnailUrl: text('thumbnail_url'),
});

// ===== CATEGORIAS =====
app.get('/categories', async (c) => {
  const db = createDb(c.env);

  const rows = await db
    .select()
    .from(exerciseTemplateCategories)
    .orderBy(exerciseTemplateCategories.orderIndex);

  return c.json({ data: rows });
});

// ===== LISTA =====
app.get('/', async (c) => {
  const db = createDb(c.env);
  // Optional auth — needed to resolve organizationId for custom template filtering
  const user = await verifyToken(c, c.env);
  const { q, category, patientProfile, templateType, isDraft, page = '1', limit = '20' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(exerciseTemplates.isActive, true)];

  if (q) conditions.push(ilike(exerciseTemplates.name, `%${q}%`));
  if (category) conditions.push(ilike(exerciseTemplates.category, `%${category}%`));
  if (patientProfile) conditions.push(eq(exerciseTemplates.patientProfile, patientProfile));
  if (isDraft !== undefined) conditions.push(eq(exerciseTemplates.isDraft, isDraft === 'true'));

  // templateType filter: controls which organization_id condition to apply
  const organizationId = user?.organizationId ?? null;

  if (templateType === 'system') {
    conditions.push(isNull(exerciseTemplates.organizationId));
  } else if (templateType === 'custom') {
    if (organizationId) {
      conditions.push(eq(exerciseTemplates.organizationId, organizationId));
    } else {
      // No org context — return nothing for custom
      conditions.push(sql`false`);
    }
  } else {
    // No templateType: return both system (org IS NULL) and custom (org = ctx.organizationId)
    const orgCondition = organizationId
      ? or(isNull(exerciseTemplates.organizationId), eq(exerciseTemplates.organizationId, organizationId))
      : isNull(exerciseTemplates.organizationId);
    conditions.push(orgCondition!);
  }

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select({
      id: exerciseTemplates.id,
      name: exerciseTemplates.name,
      description: exerciseTemplates.description,
      category: exerciseTemplates.category,
      conditionName: exerciseTemplates.conditionName,
      templateVariant: exerciseTemplates.templateVariant,
      evidenceLevel: exerciseTemplates.evidenceLevel,
      templateType: exerciseTemplates.templateType,
      patientProfile: exerciseTemplates.patientProfile,
      sourceTemplateId: exerciseTemplates.sourceTemplateId,
      isDraft: exerciseTemplates.isDraft,
      exerciseCount: exerciseTemplates.exerciseCount,
      organizationId: exerciseTemplates.organizationId,
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

// ===== APLICAR TEMPLATE A PACIENTE =====
app.post('/:id/apply', requireAuth, async (c) => {
  const db = createDb(c.env);
  const pool = createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return c.json({ error: 'Template inválido' }, 400);
  }

  const body = await c.req.json();
  const { patientId, startDate, surgeryId: _surgeryId, notes } = body as {
    patientId: string;
    startDate: string;
    surgeryId?: string;
    notes?: string;
  };

  if (!patientId || !startDate) {
    return c.json({ error: 'patientId e startDate são obrigatórios' }, 400);
  }

  // Fetch template
  const [template] = await db
    .select()
    .from(exerciseTemplates)
    .where(eq(exerciseTemplates.id, id))
    .limit(1);

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  // Validate active and not draft
  if (!template.isActive || template.isDraft) {
    return c.json({ error: 'Template inativo ou em rascunho não pode ser aplicado' }, 400);
  }

  // Fetch template items
  const items = await db
    .select()
    .from(exerciseTemplateItems)
    .where(eq(exerciseTemplateItems.templateId, template.id))
    .orderBy(exerciseTemplateItems.orderIndex);

  // Create exercise_plan and copy items in a transaction
  const planResult = await pool.query(
    `INSERT INTO exercise_plans (patient_id, template_id, name, start_date, notes, organization_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [patientId, template.id, template.name, startDate, notes ?? null, user.organizationId ?? null, user.uid]
  );
  const plan = planResult.rows[0] as { id: string };

  if (items.length > 0) {
    await Promise.all(
      items.map((item, idx) =>
        pool.query(
          `INSERT INTO exercise_plan_items (plan_id, exercise_id, order_index, sets, repetitions, duration, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [plan.id, item.exerciseId, item.orderIndex ?? idx, item.sets ?? null, item.repetitions ?? null, item.duration ?? null, item.notes ?? null]
        )
      )
    );
  }

  return c.json({ data: { planId: plan.id, patientId, exerciseCount: items.length } }, 201);
});

// ===== PERSONALIZAR SYSTEM TEMPLATE =====
app.post('/:id/customize', requireAuth, async (c) => {
  const db = createDb(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return c.json({ error: 'Template inválido' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const { name } = body as { name?: string };

  // Fetch source template
  const [source] = await db
    .select()
    .from(exerciseTemplates)
    .where(eq(exerciseTemplates.id, id))
    .limit(1);

  if (!source) return c.json({ error: 'Template não encontrado' }, 404);

  if (source.templateType !== 'system') {
    return c.json({ error: 'Apenas System_Templates podem ser personalizados' }, 400);
  }

  // Fetch all items from source template
  const sourceItems = await db
    .select()
    .from(exerciseTemplateItems)
    .where(eq(exerciseTemplateItems.templateId, source.id))
    .orderBy(exerciseTemplateItems.orderIndex);

  // Create new custom template + copy items in a transaction
  const { id: _id, createdAt: _ca, updatedAt: _ua, ...sourceFields } = source;

  let newTemplate: typeof source;

  await (async (tx: typeof db) => {
    const [created] = await tx
      .insert(exerciseTemplates)
      .values({
        ...sourceFields,
        name: name ?? source.name,
        templateType: 'custom',
        organizationId: user.organizationId ?? null,
        sourceTemplateId: id,
        createdBy: user.uid,
        isDraft: false,
      })
      .returning();

    newTemplate = created;

    if (sourceItems.length > 0) {
      await tx.insert(exerciseTemplateItems).values(
        sourceItems.map((item) => {
          const { id: _iid, createdAt: _ica, updatedAt: _iua, templateId: _tid, ...itemFields } = item;
          return {
            ...itemFields,
            templateId: created.id,
          };
        })
      );
    }
  })(db);

  return c.json({ data: newTemplate! }, 201);
});

// ===== DETALHE COM ITENS =====
app.get('/:id', async (c) => {
  const db = createDb(c.env);
  const { id } = c.req.param();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return c.json({ error: 'Template inválido' }, 400);
  }

  const [template] = await db
    .select()
    .from(exerciseTemplates)
    .where(and(eq(exerciseTemplates.id, id), eq(exerciseTemplates.isActive, true)))
    .limit(1);

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  const items = await db
    .select({
      id: exerciseTemplateItems.id,
      templateId: exerciseTemplateItems.templateId,
      exerciseId: exerciseTemplateItems.exerciseId,
      orderIndex: exerciseTemplateItems.orderIndex,
      sets: exerciseTemplateItems.sets,
      repetitions: exerciseTemplateItems.repetitions,
      duration: exerciseTemplateItems.duration,
      notes: exerciseTemplateItems.notes,
      weekStart: exerciseTemplateItems.weekStart,
      weekEnd: exerciseTemplateItems.weekEnd,
      clinicalNotes: exerciseTemplateItems.clinicalNotes,
      exercise: {
        id: exercises.id,
        name: exercises.name,
        imageUrl: exercises.imageUrl,
        thumbnailUrl: exercises.thumbnailUrl,
      },
    })
    .from(exerciseTemplateItems)
    .leftJoin(exercises, eq(sql`CAST(${exerciseTemplateItems.exerciseId} AS UUID)`, exercises.id))
    .where(eq(exerciseTemplateItems.templateId, template.id))
    .orderBy(exerciseTemplateItems.orderIndex);

  return c.json({ data: { ...template, items } });
});

// ===== CRIAR TEMPLATE =====
app.post('/', requireAuth, async (c) => {
  const db = createDb(c.env);
  const user = c.get('user');
  const body = await c.req.json();
  const { items, ...rawData } = body;

  console.log(`[Templates/Create] Creating template for org ${user.organizationId} with ${items?.length ?? 0} items`);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Inserir o template base
      const [template] = await tx
        .insert(exerciseTemplates)
        .values({
          name: rawData.name,
          description: rawData.description,
          category: rawData.category,
          conditionName: rawData.condition_name ?? rawData.conditionName,
          templateVariant: rawData.template_variant ?? rawData.templateVariant ?? 'Personalizado',
          templateType: rawData.templateType ?? 'custom',
          patientProfile: rawData.patientProfile ?? rawData.patient_profile,
          organizationId: user.organizationId ?? null,
          createdBy: user.uid,
          isDraft: rawData.isDraft ?? false,
          isActive: true,
          exerciseCount: items?.length ?? 0,
          clinicalNotes: rawData.clinicalNotes ?? rawData.clinical_notes,
          contraindications: rawData.contraindications ?? rawData.contraindications,
          precautions: rawData.precautions ?? rawData.precautions,
          progressionNotes: rawData.progressionNotes ?? rawData.progression_notes,
          evidenceLevel: rawData.evidenceLevel ?? rawData.evidence_level,
        })
        .returning();

      let insertedItems: any[] = [];
      
      // 2. Inserir os itens do template se existirem
      if (items && Array.isArray(items) && items.length > 0) {
        insertedItems = await tx
          .insert(exerciseTemplateItems)
          .values(
            items.map((item: any, index: number) => ({
              templateId: template.id,
              exerciseId: item.exercise_id ?? item.exerciseId,
              orderIndex: item.order_index ?? item.orderIndex ?? index,
              sets: item.sets,
              repetitions: item.repetitions,
              duration: item.duration,
              notes: item.notes,
              clinicalNotes: item.clinical_notes ?? item.clinicalNotes,
              focusMuscles: item.focus_muscles ?? item.focusMuscles,
              purpose: item.purpose,
            }))
          )
          .returning();
      }

      return { ...template, items: insertedItems };
    });

    return c.json({ data: result });
  } catch (error: any) {
    console.error("[Templates/Create] Error:", error.message);
    return c.json({ 
      error: 'Erro ao criar template', 
      details: error.message,
      requestId: c.get('requestId') 
    }, 500);
  }
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
    // Substituição dos itens em operações sequenciais
    await (async (tx: typeof db) => {
      await tx
        .delete(exerciseTemplateItems)
        .where(eq(exerciseTemplateItems.templateId, template.id));
      if (items.length > 0) {
        updatedItems = await tx
          .insert(exerciseTemplateItems)
          .values(
            items.map((item: any, index: number) => {
              const { id: _id, createdAt: _ca, ...rest } = item;
              return {
                ...rest,
                templateId: template.id,
                orderIndex: item.orderIndex ?? index,
              };
            })
          )
          .returning();
      }
    })(db);
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return c.json({ error: 'Template inválido' }, 400);
  }

  // Fetch template first to check type
  const [template] = await db
    .select()
    .from(exerciseTemplates)
    .where(eq(exerciseTemplates.id, id))
    .limit(1);

  if (!template) return c.json({ error: 'Template não encontrado' }, 404);

  // System templates cannot be deleted
  if (template.templateType === 'system') {
    return c.json({ error: 'System templates cannot be deleted' }, 403);
  }

  // Soft delete
  await db
    .update(exerciseTemplates)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(exerciseTemplates.id, id));

  return c.json({ ok: true });
});

export { app as templatesRoutes };
