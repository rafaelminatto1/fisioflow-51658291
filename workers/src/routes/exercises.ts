/**
 * Rotas: Exercícios e Categorias
 * GET /api/exercises          — lista com filtros
 * GET /api/exercises/:id      — detalhe
 * GET /api/exercises/categories — categorias
 * POST /api/exercises/:id/favorite  — favoritar (auth)
 * DELETE /api/exercises/:id/favorite — desfavoritar (auth)
 */
import { Hono } from 'hono';
import { eq, and, ilike, inArray, sql } from 'drizzle-orm';
import { createDb } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import {
  exercises,
  exerciseCategories,
  exerciseFavorites,
} from '@fisioflow/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== CATEGORIAS =====
app.get('/categories', async (c) => {
  const db = await createDb(c.env);
  const rows = await db
    .select()
    .from(exerciseCategories)
    .orderBy(exerciseCategories.orderIndex);

  return c.json({ data: rows });
});

// ===== LISTA DE EXERCÍCIOS =====
app.get('/', async (c) => {
  const db = await createDb(c.env);
  const { q, category, difficulty, bodyPart, page = '1', limit = '20' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(exercises.isActive, true), eq(exercises.isPublic, true)];

  if (q) conditions.push(ilike(exercises.name, `%${q}%`));
  if (difficulty) {
    conditions.push(
      eq(exercises.difficulty, difficulty as 'iniciante' | 'intermediario' | 'avancado'),
    );
  }

  // Filtros por categoryId (busca slug da categoria primeiro)
  let categoryCondition = null;
  if (category) {
    const cat = await db
      .select({ id: exerciseCategories.id })
      .from(exerciseCategories)
      .where(eq(exerciseCategories.slug, category))
      .limit(1);
    if (cat.length > 0) {
      categoryCondition = eq(exercises.categoryId, cat[0].id);
    }
  }

  const where = categoryCondition
    ? and(...conditions, categoryCondition)
    : and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        categoryId: exercises.categoryId,
        difficulty: exercises.difficulty,
        imageUrl: exercises.imageUrl,
        thumbnailUrl: exercises.thumbnailUrl,
        videoUrl: exercises.videoUrl,
        musclesPrimary: exercises.musclesPrimary,
        bodyParts: exercises.bodyParts,
        equipment: exercises.equipment,
        durationSeconds: exercises.durationSeconds,
        description: exercises.description,
      })
      .from(exercises)
      .where(where)
      .orderBy(exercises.name)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(exercises).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// ===== DETALHE DO EXERCÍCIO =====
app.get('/:id', async (c) => {
  const db = await createDb(c.env);
  const { id } = c.req.param();

  // Aceita UUID ou slug
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const condition = isUuid
    ? eq(exercises.id, id)
    : eq(exercises.slug, id);

  const row = await db
    .select()
    .from(exercises)
    .where(and(condition, eq(exercises.isActive, true)))
    .limit(1);

  if (!row.length) return c.json({ error: 'Exercício não encontrado' }, 404);

  return c.json({ data: row[0] });
});

// ===== FAVORITAR (auth obrigatório) =====
app.post('/:id/favorite', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  await db
    .insert(exerciseFavorites)
    .values({ userId: user.uid, exerciseId: id })
    .onConflictDoNothing();

  return c.json({ ok: true });
});

app.delete('/:id/favorite', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  await db
    .delete(exerciseFavorites)
    .where(
      and(eq(exerciseFavorites.userId, user.uid), eq(exerciseFavorites.exerciseId, id)),
    );

  return c.json({ ok: true });
});

// ===== EXERCÍCIOS FAVORITOS DO USUÁRIO =====
app.get('/favorites/me', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');

  const favs = await db
    .select({ exerciseId: exerciseFavorites.exerciseId })
    .from(exerciseFavorites)
    .where(eq(exerciseFavorites.userId, user.uid));

  if (!favs.length) return c.json({ data: [] });

  const ids = favs.map((f) => f.exerciseId);
  const rows = await db
    .select()
    .from(exercises)
    .where(and(inArray(exercises.id, ids), eq(exercises.isActive, true)));

  return c.json({ data: rows });
});

// ===== CRIAR EXERCÍCIO =====
app.post('/', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');
  const body = await c.req.json();

  const [row] = await db
    .insert(exercises)
    .values({
      ...body,
      createdBy: user.uid,
    })
    .returning();

  return c.json({ data: row });
});

// ===== ATUALIZAR EXERCÍCIO =====
app.put('/:id', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const { id } = c.req.param();
  const body = await c.req.json();

  // Remove campos imutáveis
  delete body.id;
  delete body.createdBy;
  delete body.createdAt;

  const [row] = await db
    .update(exercises)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id))
    .returning();

  if (!row) return c.json({ error: 'Exercício não encontrado' }, 404);

  return c.json({ data: row });
});

// ===== DELETAR EXERCÍCIO (soft delete) =====
app.delete('/:id', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const { id } = c.req.param();

  const [row] = await db
    .update(exercises)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id))
    .returning();

  if (!row) return c.json({ error: 'Exercício não encontrado' }, 404);

  return c.json({ ok: true });
});

// ===== BUSCA SEMÂNTICA (por nome, descrição e tags) =====
app.get('/search/semantic', async (c) => {
  const db = await createDb(c.env);
  const { q, limit = '10' } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ error: 'Parâmetro q obrigatório (mínimo 2 caracteres)' }, 400);
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const rows = await db
    .select()
    .from(exercises)
    .where(
      and(
        eq(exercises.isActive, true),
        eq(exercises.isPublic, true),
        sql`(
          ${exercises.name} ILIKE ${'%' + q + '%'}
          OR ${exercises.description} ILIKE ${'%' + q + '%'}
          OR ${exercises.tags}::text ILIKE ${'%' + q + '%'}
          OR ${exercises.bodyParts}::text ILIKE ${'%' + q + '%'}
        )`,
      ),
    )
    .limit(limitNum);

  return c.json({ data: rows });
});

export { app as exercisesRoutes };
