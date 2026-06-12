import { Hono } from "hono";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createDb, createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { searchAiSearch } from "../lib/cloudflareAiSearch";
import {
  exercises,
  exerciseCategories,
  exerciseFavorites,
  exerciseMediaAttachments,
  wikiDictionary,
} from "@fisioflow/db";
import { removeExerciseFromIndex, syncExerciseToIndex } from "../lib/contentIndexing";
import { generateEmbedding, generateTurboSketch } from "../lib/ai-native";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const KV_TTL = 3600; // 1 hora
const KV_CATEGORIES = "exercises:v2:categories";
const KV_LIST_PREFIX = "exercises:v3:list:";

async function kvGet(env: Env, key: string): Promise<unknown | null> {
  if (!env.FISIOFLOW_CONFIG) return null;
  try {
    const cached = await env.FISIOFLOW_CONFIG.get(key, "json");
    return cached;
  } catch {
    return null;
  }
}

async function kvSet(env: Env, key: string, value: unknown): Promise<void> {
  if (!env.FISIOFLOW_CONFIG) return;
  try {
    await env.FISIOFLOW_CONFIG.put(key, JSON.stringify(value), { expirationTtl: KV_TTL });
  } catch {
    /* non-critical */
  }
}

async function kvDelete(env: Env, ...keys: string[]): Promise<void> {
  if (!env.FISIOFLOW_CONFIG) return;
  const kv = env.FISIOFLOW_CONFIG;
  await Promise.allSettled(keys.map((k) => kv.delete(k)));
}

/**
 * Converte o payload vindo do frontend (mistura snake_case / camelCase) para o shape
 * camelCase exigido pelo Drizzle. Também deriva `imageUrl`/`videoUrl` da primeira
 * mídia da galeria, para mantermos os campos legados em sincronia com
 * `exercise_media_attachments`.
 */
function normalizeExercisePayload(
  raw: Record<string, any>,
  media?: Array<{ url: string; type: string }>,
): Record<string, any> {
  const mapping: Record<string, string> = {
    name_en: "nameEn",
    image_url: "imageUrl",
    thumbnail_url: "thumbnailUrl",
    video_url: "videoUrl",
    pdf_url: "pdfUrl",
    body_parts: "bodyParts",
    muscles_primary: "musclesPrimary",
    muscles_secondary: "musclesSecondary",
    alternative_equipment: "alternativeEquipment",
    indicated_pathologies: "pathologiesIndicated",
    contraindicated_pathologies: "pathologiesContraindicated",
    icd10_codes: "icd10Codes",
    scientific_references: "references",
    sets: "setsRecommended",
    repetitions: "repsRecommended",
    duration: "durationSeconds",
    rest_seconds: "restSeconds",
    category_id: "categoryId",
    is_active: "isActive",
    is_public: "isPublic",
    organization_id: "organizationId",
  };

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    const target = mapping[k] ?? k;
    out[target] = v;
  }

  if (out.references && typeof out.references !== "string") {
    try {
      out.references = JSON.stringify(out.references);
    } catch {
      delete out.references;
    }
  }

  // Drop unknown form-only fields that have no column.
  delete out.precaution_level;
  delete out.precaution_notes;
  delete out.aliases_pt;
  delete out.aliases_en;

  // Sincroniza imageUrl/videoUrl com a primeira mídia da galeria.
  if (Array.isArray(media)) {
    const firstImage = media.find((m) => m?.type === "image")?.url ?? null;
    const firstVideo = media.find((m) => m?.type === "video" || m?.type === "youtube")?.url ?? null;
    if (firstImage !== null || media.length > 0) {
      out.imageUrl = firstImage;
    }
    if (firstVideo !== null || media.length > 0) {
      out.videoUrl = firstVideo;
    }
  }

  return out;
}

async function invalidateListCache(env: Env): Promise<void> {
  // Invalida as primeiras 5 páginas dos limites padrão
  const commonLimits = ["20", "50", "500"];
  const keys: string[] = [];
  for (const limit of commonLimits) {
    for (let p = 1; p <= 5; p++) {
      keys.push(`${KV_LIST_PREFIX}p${p}:l${limit}`);
    }
  }
  await kvDelete(env, ...keys);
}

// ===== CATEGORIAS =====
app.get("/categories", requireAuth, async (c) => {
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
    console.error("[Exercises/Categories] Error:", error.message);
    return c.json({ data: [] }, 500);
  }
});

// ===== LISTA DE EXERCÍCIOS =====
app.get("/", requireAuth, async (c) => {
  try {
    const {
      q,
      category,
      difficulty,
      bodyPart,
      equipment,
      page = "1",
      limit = "20",
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
    const limitNum = Number.isFinite(parsedLimit) ? Math.min(500, Math.max(1, parsedLimit)) : 20;
    const offset = (pageNum - 1) * limitNum;

    const params: unknown[] = [];
    const whereParts = ["e.is_active = true", "e.is_public = true"];
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
        easy: "iniciante",
        iniciante: "iniciante",
        medium: "intermediario",
        intermediario: "intermediario",
        hard: "avancado",
        avancado: "avancado",
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

    if (favorites === "true") {
      const authUser = c.get("user");
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

    const whereSql = whereParts.join(" AND ");
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
              e.duration_seconds AS duration,
              e.sets_recommended AS sets,
              e.reps_recommended AS repetitions,
              e.pathologies_indicated AS "indicated_pathologies",
              e.pathologies_contraindicated AS "contraindicated_pathologies",
              e."references" AS "scientific_references",
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
    console.error("[Exercises/List] Error:", error.message);
    return c.json({ data: [], meta: { page: 1, limit: 20, total: 0, pages: 0 } }, 500);
  }
});

// ===== DETALHE DO EXERCÍCIO =====
app.get("/:id", async (c) => {
  try {
    const db = createDb(c.env, "read");
    const { id } = c.req.param();

    // Aceita UUID ou slug
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const condition = isUuid ? eq(exercises.id, id) : eq(exercises.slug, id);

    const row = await db
      .select()
      .from(exercises)
      .where(and(condition, eq(exercises.isActive, true)))
      .limit(1);

    if (!row.length) return c.json({ error: "Exercício não encontrado" }, 404);

    const exercise = row[0];

    const attachments = await db
      .select({
        id: exerciseMediaAttachments.id,
        url: exerciseMediaAttachments.url,
        type: exerciseMediaAttachments.type,
        caption: exerciseMediaAttachments.caption,
        orderIndex: exerciseMediaAttachments.orderIndex,
      })
      .from(exerciseMediaAttachments)
      .where(eq(exerciseMediaAttachments.exerciseId, exercise.id))
      .orderBy(exerciseMediaAttachments.orderIndex);

    // Fallback legado: se não há attachments mas o exercise tem image_url/video_url, sintetiza.
    const media: Array<{
      id: string;
      url: string;
      type: "image" | "video" | "youtube";
      caption: string | null;
      orderIndex: number;
    }> =
      attachments.length > 0
        ? attachments.map((a) => ({
            id: a.id,
            url: a.url,
            type: a.type as "image" | "video" | "youtube",
            caption: a.caption,
            orderIndex: a.orderIndex,
          }))
        : [];

    if (media.length === 0) {
      if (exercise.imageUrl) {
        media.push({
          id: `legacy-image-${exercise.id}`,
          url: exercise.imageUrl,
          type: "image",
          caption: null,
          orderIndex: 0,
        });
      }
      if (exercise.videoUrl) {
        const isYoutube =
          exercise.videoUrl.includes("youtube.com") || exercise.videoUrl.includes("youtu.be");
        media.push({
          id: `legacy-video-${exercise.id}`,
          url: exercise.videoUrl,
          type: isYoutube ? "youtube" : "video",
          caption: null,
          orderIndex: media.length,
        });
      }
    }

    return c.json({ data: { ...exercise, media } });
  } catch (error: any) {
    console.error("[Exercises/Detail] Error:", error.message);
    return c.json({ error: "Erro ao buscar exercício" }, 500);
  }
});

// ===== FAVORITAR (auth obrigatório) =====
app.post("/:id/favorite", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");
    const { id } = c.req.param();

    await db
      .insert(exerciseFavorites)
      .values({
        userId: user.uid,
        exerciseId: id,
        organizationId: user.organizationId,
      })
      .onConflictDoNothing();

    return c.json({ ok: true });
  } catch (err) {
    console.error("[exercises/:id/favorite] error:", err);
    return c.json({ error: "Erro ao favoritar exercício" }, 500);
  }
});

app.delete("/:id/favorite", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");
    const { id } = c.req.param();

    await db
      .delete(exerciseFavorites)
      .where(
        and(
          eq(exerciseFavorites.userId, user.uid),
          eq(exerciseFavorites.exerciseId, id),
          eq(exerciseFavorites.organizationId, user.organizationId),
        ),
      );

    return c.json({ ok: true });
  } catch (err) {
    console.error("[exercises/:id/unfavorite] error:", err);
    return c.json({ error: "Erro ao remover favorito" }, 500);
  }
});

// ===== EXERCÍCIOS FAVORITOS DO USUÁRIO =====
app.get("/favorites/me", requireAuth, async (c) => {
  try {
    const db = await createDb(c.env);
    const user = c.get("user");

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
          eq(exerciseFavorites.organizationId, user.organizationId),
        ),
      );

    return c.json({ data: rows });
  } catch (err) {
    console.error("[exercises/favorites/me] error:", err);
    return c.json(
      {
        error: "Erro ao buscar favoritos",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

// ===== CRIAR EXERCÍCIO =====
app.post("/", requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get("user");
  const body = await c.req.json();

  const { media, ...rawExerciseData } = body;
  const exerciseData = normalizeExercisePayload(rawExerciseData, media) as any;

  const [row] = await db
    .insert(exercises)
    .values({
      ...exerciseData,
      createdBy: user.uid,
    })
    .returning();

  // Processar mídias
  if (media && Array.isArray(media) && media.length > 0) {
    await db.insert(exerciseMediaAttachments).values(
      media.map((m: any, idx: number) => ({
        exerciseId: row.id,
        mediaId: m.id, // Se vier da galeria
        type: m.type,
        url: m.url,
        caption: m.caption,
        orderIndex: m.orderIndex ?? idx,
        // organizationId omitido: coluna não existe em produção (schema drift)
      })) as any,
    );
  }

  // Adicionar ao dicionário automaticamente
  try {
    await db.insert(wikiDictionary).values({
      pt: row.name,
      en: row.nameEn || row.name,
      category: "exercise",
      subcategory: row.subcategory,
      aliasesPt: row.aliases || [],
      descriptionPt: row.description,
      organizationId: row.organizationId,
      isGlobal: row.isPublic || false,
      createdBy: row.createdBy,
    });
  } catch (dictErr) {
    console.error("[exercises] Error adding to dictionary:", dictErr);
  }

  // Background tasks: Invalidate cache and update embedding/vectorize
  c.executionCtx.waitUntil(
    (async () => {
      await invalidateListCache(c.env);

      // Generate embedding and update database sketch
      try {
        const categoryLabel = row.subcategory || row.categoryId || "";
        const textToEmbed =
          `${row.name} ${row.description || ""} ${categoryLabel} ${row.bodyParts?.join(" ") || ""}`.trim();
        const vector = await generateEmbedding(c.env, textToEmbed);
        if (vector.length > 0) {
          const sketch = generateTurboSketch(vector);
          // Mantemos apenas o sketch no Postgres para busca híbrida local.
          await db
            .update(exercises)
            .set({
              embeddingSketch: sketch,
            })
            .where(eq(exercises.id, row.id));
        }
      } catch (e) {
        console.error("[Exercises] Failed to update semantic index sketch:", e);
      }

      await syncExerciseToIndex(c.env, row.id);
    })(),
  );

  return c.json({ data: row });
});

// ===== ATUALIZAR EXERCÍCIO =====
app.put("/:id", requireAuth, async (c) => {
  const db = await createDb(c.env);
  const { id } = c.req.param();
  const body = await c.req.json();
  const { media, ...rawExerciseData } = body;
  const exerciseData = normalizeExercisePayload(rawExerciseData, media) as any;
  const _user = c.get("user");

  // Remove campos imutáveis
  delete exerciseData.id;
  delete exerciseData.createdBy;
  delete exerciseData.createdAt;

  const [row] = await db
    .update(exercises)
    .set({
      ...exerciseData,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id))
    .returning();

  if (!row) return c.json({ error: "Exercício não encontrado" }, 404);

  // Sincronizar mídias (estratégia: deletar e inserir para simplificar ordenação)
  if (media && Array.isArray(media)) {
    await db.delete(exerciseMediaAttachments).where(eq(exerciseMediaAttachments.exerciseId, id));

    if (media.length > 0) {
      await db.insert(exerciseMediaAttachments).values(
        media.map((m: any, idx: number) => ({
          exerciseId: id,
          mediaId: m.id,
          type: m.type,
          url: m.url,
          caption: m.caption,
          orderIndex: m.orderIndex ?? idx,
          // organizationId omitido: coluna não existe em produção (schema drift)
        })) as any,
      );
    }
  }

  // Background tasks: Invalidate cache and update embedding/vectorize
  c.executionCtx.waitUntil(
    (async () => {
      await invalidateListCache(c.env);

      // Only regenerate if relevant fields changed (simple check for now)
      try {
        const categoryLabel = row.subcategory || row.categoryId || "";
        const textToEmbed =
          `${row.name} ${row.description || ""} ${categoryLabel} ${row.bodyParts?.join(" ") || ""}`.trim();
        const vector = await generateEmbedding(c.env, textToEmbed);
        if (vector.length > 0) {
          const sketch = generateTurboSketch(vector);
          await db
            .update(exercises)
            .set({
              embeddingSketch: sketch,
            })
            .where(eq(exercises.id, row.id));
        }
      } catch (e) {
        console.error("[Exercises] Failed to update semantic index sketch on update:", e);
      }

      await syncExerciseToIndex(c.env, row.id);
    })(),
  );

  return c.json({ data: row });
});

// ===== DELETAR EXERCÍCIO (soft delete) =====
app.delete("/:id", requireAuth, async (c) => {
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

  if (!row) return c.json({ error: "Exercício não encontrado" }, 404);

  c.executionCtx.waitUntil(invalidateListCache(c.env));
  c.executionCtx.waitUntil(removeExerciseFromIndex(c.env, id));
  return c.json({ ok: true });
});

// ===== BUSCA SEMÂNTICA (AI Powered via Vectorize) =====
app.get("/search/semantic", async (c) => {
  const { q, limit = "10" } = c.req.query();

  if (!q || q.trim().length < 2) {
    return c.json({ error: "Parâmetro q obrigatório (mínimo 2 caracteres)" }, 400);
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  // 1. If AI Search is available, use it (modern RAG/semantic search)
  if (c.env.AI_SEARCH) {
    try {
      const { sources } = await searchAiSearch(c.env, {
        messages: [
          { role: "system", content: "You are a physiotherapy exercise search assistant." },
          { role: "user", content: q },
        ],
        maxNumResults: limitNum,
        filters: { source: "exercises" },
      });

      if (sources.length > 0) {
        const matchedIds = sources.map((s) => s.id.replace(/^exercise-/, "").replace(/^exercise:/, ""));
        const db = await createDb(c.env);
        const rows = await db
          .select()
          .from(exercises)
          .where(and(inArray(exercises.id, matchedIds), eq(exercises.isActive, true)));

        // Sort rows by the original match order (relevance)
        const sortedRows = matchedIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
        return c.json({ data: sortedRows, meta: { method: "ai_search" } });
      }
    } catch (e) {
      console.error("[Exercises] AI Search semantic search error:", e);
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

  return c.json({ data: rows, meta: { method: "text" } });
});

export { app as exercisesRoutes };
