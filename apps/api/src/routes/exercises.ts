import { Hono } from 'hono';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { createDb, createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import {
  exercises,
  exerciseCategories,
  exerciseFavorites,
} from '@fisioflow/db';
import { generateEmbedding, generateTurboSketch } from '../lib/ai-native';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const KV_TTL = 3600; // 1 hora
const KV_CATEGORIES = 'exercises:v1:categories';
const KV_LIST_PREFIX = 'exercises:v1:list:';

async function kvGet(env: Env, key: string): Promise<unknown | null> {
  if (!env.FISIOFLOW_CONFIG) return null;
  try {
    const cached = await env.FISIOFLOW_CONFIG.get(key, 'json');
    return cached;
  } catch { return null; }
}

async function kvSet(env: Env, key: string, value: unknown): Promise<void> {
  if (!env.FISIOFLOW_CONFIG) return;
  try {
    await env.FISIOFLOW_CONFIG.put(key, JSON.stringify(value), { expirationTtl: KV_TTL });
  } catch { /* non-critical */ }
}

async function kvDelete(env: Env, ...keys: string[]): Promise<void> {
  if (!env.FISIOFLOW_CONFIG) return;
  const kv = env.FISIOFLOW_CONFIG;
  await Promise.allSettled(keys.map((k) => kv.delete(k)));
}

async function invalidateListCache(env: Env): Promise<void> {
  // Invalida as primeiras 5 páginas dos limites padrão
  const commonLimits = ['20', '50', '500'];
  const keys: string[] = [];
  for (const limit of commonLimits) {
    for (let p = 1; p <= 5; p++) {
      keys.push(`${KV_LIST_PREFIX}p${p}:l${limit}`);
    }
  }
  await kvDelete(env, ...keys);
}

// ===== CATEGORIAS =====
app.get('/categories', requireAuth, async (c) => {
  try {
    const cached = await kvGet(c.env, KV_CATEGORIES);
    if (cached) return c.json({ data: cached });

    const db = createPool(c.env);
    const result = await db.query(
      `SELECT id,
              slug,
              name,
              description,
              icon,
              color,
              order_index AS "orderIndex",
              parent_id AS "parentId"
       FROM exercise_categories
       ORDER BY order_index NULLS LAST, name`,
    );
    const rows = result.rows;

    c.executionCtx.waitUntil(kvSet(c.env, KV_CATEGORIES, rows));
    return c.json({ data: rows });
  } catch (error: any) {
    console.error('[Exercises/Categories] Error:', error.message);
    return c.json({ data: [] }, 500);
  }
});

// ===== LISTA DE EXERCÍCIOS =====
app.get('/', requireAuth, async (c) => {
  try {
  const {
    q,
    category,
    difficulty,
    bodyPart,
    equipment,
    page = '1',
    limit = '20',
    favorites,
  } = c.req.query();

  // Cache only unfiltered requests (most common: browsing the library)
  const isDefaultQuery = !q && !category && !difficulty && !bodyPart && !equipment;
  const cacheKey = isDefaultQuery ? `${KV_LIST_PREFIX}p${page}:l${limit}` : null;

  if (cacheKey) {
    const cached = await kvGet(c.env, cacheKey);
    if (cached) return c.json(cached);
  }

  const db = createPool(c.env);

  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const pageNum = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limitNum = Number.isFinite(parsedLimit)
    ? Math.min(500, Math.max(1, parsedLimit))
    : 20;
  const offset = (pageNum - 1) * limitNum;

  const params: unknown[] = [];
  const whereParts = ['e.is_active = true', 'e.is_public = true'];
  const addParam = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q && q.trim().length > 0) {
    const qParam = addParam(q);
    whereParts.push(
      `to_tsvector('portuguese',
         e.name || ' ' ||
         COALESCE(e.description, '') || ' ' ||
         array_to_string(COALESCE(e.tags, '{}'::text[]), ' ') || ' ' ||
         array_to_string(COALESCE(e.body_parts, '{}'::text[]), ' ')
       ) @@ websearch_to_tsquery('portuguese', ${qParam})`,
    );
  }

  if (difficulty) {
    // Suporte a aliases EN/PT para dificuldade
    const difficultyMap: Record<string, "iniciante" | "intermediario" | "avancado"> = {
      easy: 'iniciante',
      iniciante: 'iniciante',
      medium: 'intermediario',
      intermediario: 'intermediario',
      hard: 'avancado',
      avancado: 'avancado',
    };
    const mapped = difficultyMap[difficulty.toLowerCase()];
    if (mapped) {
      whereParts.push(`e.difficulty = ${addParam(mapped)}`);
    }
  }

  if (bodyPart) {
    whereParts.push(`${addParam(bodyPart)} = ANY(COALESCE(e.body_parts, '{}'::text[]))`);
  }

  if (equipment) {
    whereParts.push(`${addParam(equipment)} = ANY(COALESCE(e.equipment, '{}'::text[]))`);
  }

  if (category && category !== "Todos") {
    whereParts.push(`ec.slug = ${addParam(category)}`);
  }

  if (favorites === 'true') {
    const authUser = c.get('user');
    if (authUser) {
      whereParts.push(
        `EXISTS (
          SELECT 1 FROM exercise_favorites ef
          WHERE ef.exercise_id = e.id
          AND ef.user_id = ${addParam(authUser.uid)}
        )`,
      );
    }
  }

  const whereSql = whereParts.join(' AND ');
  const limitParam = `$${params.length + 1}`;
  const offsetParam = `$${params.length + 2}`;

  const [rows, countResult] = await Promise.all([
    db.query(
      `SELECT e.id,
              e.slug,
              e.name,
              e.category_id AS "categoryId",
              ec.name AS "categoryName",
              e.difficulty,
              e.image_url AS "imageUrl",
              e.thumbnail_url AS "thumbnailUrl",
              e.video_url AS "videoUrl",
              COALESCE(e.muscles_primary, '{}'::text[]) AS "musclesPrimary",
              COALESCE(e.body_parts, '{}'::text[]) AS "bodyParts",
              COALESCE(e.equipment, '{}'::text[]) AS equipment,
              e.duration_seconds AS "durationSeconds",
              e.description,
              COALESCE(e.tags, '{}'::text[]) AS tags,
              NULL AS "embeddingSketch",
              NULL AS "referencePose"
       FROM exercises e
       LEFT JOIN exercise_categories ec ON e.category_id = ec.id
       WHERE ${whereSql}
       ORDER BY e.name
       LIMIT ${limitParam}
       OFFSET ${offsetParam}`,
      [...params, limitNum, offset],
    ),
    db.query(
      `SELECT count(*)::int AS count
       FROM exercises e
       LEFT JOIN exercise_categories ec ON e.category_id = ec.id
       WHERE ${whereSql}`,
      params,
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  const response = {
    data: rows.rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };

  if (cacheKey) {
    c.executionCtx.waitUntil(kvSet(c.env, cacheKey, response));
  }

  return c.json(response);
  } catch (error: any) {
    console.error('[Exercises/List] Error:', error.message);
    return c.json({ data: [], meta: { page: 1, limit: 20, total: 0, pages: 0 } }, 500);
  }
});


// ===== DETALHE DO EXERCÍCIO =====
app.get('/:id', async (c) => {
  try {
    const db = createDb(c.env, 'read');
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
  } catch (error: any) {
    console.error('[Exercises/Detail] Error:', error.message);
    return c.json({ error: 'Erro ao buscar exercício' }, 500);
  }
});

// ===== FAVORITAR (auth obrigatório) =====
app.post('/:id/favorite', requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get('user');
    const { id } = c.req.param();

    await db
      .insert(exerciseFavorites)
      .values({ 
        userId: user.uid, 
        exerciseId: id,
        organizationId: user.organizationId 
      })
      .onConflictDoNothing();

    return c.json({ ok: true });
  } catch (err) {
    console.error('[exercises/:id/favorite] error:', err);
    return c.json({ error: 'Erro ao favoritar exercício' }, 500);
  }
});

app.delete('/:id/favorite', requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get('user');
    const { id } = c.req.param();

    await db
      .delete(exerciseFavorites)
      .where(
        and(
          eq(exerciseFavorites.userId, user.uid), 
          eq(exerciseFavorites.exerciseId, id),
          eq(exerciseFavorites.organizationId, user.organizationId)
        ),
      );

    return c.json({ ok: true });
  } catch (err) {
    console.error('[exercises/:id/unfavorite] error:', err);
    return c.json({ error: 'Erro ao remover favorito' }, 500);
  }
});

// ===== EXERCÍCIOS FAVORITOS DO USUÁRIO =====
app.get('/favorites/me', requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get('user');

    const rows = await db
      .select({
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        categoryId: exercises.categoryId,
        categoryName: exerciseCategories.name,
        difficulty: exercises.difficulty,
        imageUrl: exercises.imageUrl,
        thumbnailUrl: exercises.thumbnailUrl,
        videoUrl: exercises.videoUrl,
        durationSeconds: exercises.durationSeconds,
        description: exercises.description,
      })
      .from(exerciseFavorites)
      .innerJoin(exercises, eq(exerciseFavorites.exerciseId, exercises.id))
      .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
      .where(
        and(
          eq(exerciseFavorites.userId, user.uid), 
          eq(exercises.isActive, true),
          eq(exerciseFavorites.organizationId, user.organizationId)
        )
      );

    return c.json({ data: rows });
  } catch (err) {
    console.error('[exercises/favorites/me] error:', err);
    return c.json({ 
      error: 'Erro ao buscar favoritos',
      details: err instanceof Error ? err.message : String(err)
    }, 500);
  }
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

  // Background tasks: Invalidate cache and update embedding/vectorize
  c.executionCtx.waitUntil((async () => {
    await invalidateListCache(c.env);
    
    // Generate embedding and update Vectorize if binding exists
    if (c.env.CLINICAL_KNOWLEDGE) {
      try {
	        const categoryLabel = row.subcategory || row.categoryId || '';
	        const textToEmbed = `${row.name} ${row.description || ''} ${categoryLabel} ${row.bodyParts?.join(' ') || ''}`.trim();
	        const vector = await generateEmbedding(c.env, textToEmbed);
	        if (vector.length > 0) {
            const sketch = generateTurboSketch(vector);
	          await c.env.CLINICAL_KNOWLEDGE.upsert([{
	            id: row.id,
	            values: vector,
	            metadata: { name: row.name, category: categoryLabel, sketch }
	          }]);
          // Mantemos apenas o sketch no Postgres para busca híbrida local.
          // O vetor bruto continua no Vectorize, evitando mismatch de dimensão da coluna legada.
          await db.update(exercises).set({
            embeddingSketch: sketch
          }).where(eq(exercises.id, row.id));
        }
      } catch (e) {
        console.error('[Exercises] Failed to update semantic index:', e);
      }
    }
  })());

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

  // Background tasks: Invalidate cache and update embedding/vectorize
  c.executionCtx.waitUntil((async () => {
    await invalidateListCache(c.env);
    
    // Only regenerate if relevant fields changed (simple check for now)
    if (c.env.CLINICAL_KNOWLEDGE) {
      try {
        const categoryLabel = row.subcategory || row.categoryId || '';
        const textToEmbed = `${row.name} ${row.description || ''} ${categoryLabel} ${row.bodyParts?.join(' ') || ''}`.trim();
        const vector = await generateEmbedding(c.env, textToEmbed);
        if (vector.length > 0) {
          const sketch = generateTurboSketch(vector);
          await c.env.CLINICAL_KNOWLEDGE.upsert([{
            id: row.id,
            values: vector,
            metadata: { name: row.name, category: categoryLabel, sketch }
          }]);
          await db.update(exercises).set({
            embeddingSketch: sketch
          }).where(eq(exercises.id, row.id));
        }
      } catch (e) {
        console.error('[Exercises] Failed to update semantic index on update:', e);
      }
    }
  })());

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

  c.executionCtx.waitUntil(invalidateListCache(c.env));
  return c.json({ ok: true });
});

// ===== BUSCA SEMÂNTICA (AI Powered via Vectorize) =====
app.get('/search/semantic', async (c) => {
  const { q, limit = '10' } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ error: 'Parâmetro q obrigatório (mínimo 2 caracteres)' }, 400);
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  // 1. If Vectorize is available, use it
  if (c.env.CLINICAL_KNOWLEDGE) {
    try {
      const vector = await generateEmbedding(c.env, q);
      const matches = await c.env.CLINICAL_KNOWLEDGE.query(vector, { 
        limit: limitNum,
        topK: limitNum // Vectorize query options
      } as any);

      if (matches.matches && matches.matches.length > 0) {
        const matchedIds = matches.matches.map(m => m.id);
        const db = await createDb(c.env);
        const rows = await db
          .select()
          .from(exercises)
          .where(and(
            inArray(exercises.id, matchedIds),
            eq(exercises.isActive, true)
          ));
        
        // Sort rows by the original match order (relevance)
        const sortedRows = matchedIds.map(id => rows.find(r => r.id === id)).filter(Boolean);
        return c.json({ data: sortedRows, meta: { method: 'vector' } });
      }
    } catch (e) {
      console.error('[Exercises] Semantic search error:', e);
      // Fallback below
    }
  }

  // 2. Fallback to optimized Text Search (websearch)
  const db = await createDb(c.env);
  const rows = await db
    .select()
    .from(exercises)
    .where(
      and(
        eq(exercises.isActive, true),
        eq(exercises.isPublic, true),
        sql`to_tsvector('portuguese', 
          ${exercises.name} || ' ' || 
          coalesce(${exercises.description}, '') || ' ' || 
          array_to_string(${exercises.tags}, ' ') || ' ' || 
          array_to_string(${exercises.bodyParts}, ' ')
        ) @@ websearch_to_tsquery('portuguese', ${q})`,
      ),
    )
    .limit(limitNum);

  return c.json({ data: rows, meta: { method: 'text' } });
});

export { app as exercisesRoutes };
