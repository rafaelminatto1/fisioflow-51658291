import { Hono } from "hono";
import { eq, and, inArray, sql, cosineDistance } from "drizzle-orm";
import { createDb, createPool, getRawSql } from "../lib/db";
import { requireAuth, type AuthVariables, type AuthUser } from "../lib/auth";
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
import { generateEmbedding1024, generateTurboSketch, runAi, readAiText } from "../lib/ai-native";
import { withAIRetry } from "../lib/ai/retry";
import { WORKERS_AI_MODELS } from "../lib/workersAi";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const KV_TTL = 3600; // 1 hora
const KV_CATEGORIES = "exercises:v2:categories";
const KV_LIST_PREFIX = "exercises:v3:list:";
const KV_CATALOG = "exercises:v1:catalog";

const CONTENT_BACKFILL_FIELDS = [
  "description",
  "tips",
  "precautions",
  "benefits",
  "category_id",
  "subcategory",
  "muscles_primary",
  "muscles_secondary",
  "body_parts",
  "equipment",
] as const;

type ContentBackfillField = (typeof CONTENT_BACKFILL_FIELDS)[number];

const DEFAULT_CONTENT_BACKFILL_FIELDS: ContentBackfillField[] = [
  "description",
  "tips",
  "precautions",
  "benefits",
];

const CONTENT_BACKFILL_PREDICATES: Record<ContentBackfillField, string> = {
  description: "e.description IS NULL OR btrim(e.description) = ''",
  tips: "e.tips IS NULL OR btrim(e.tips) = ''",
  precautions: "e.precautions IS NULL OR btrim(e.precautions) = ''",
  benefits: "e.benefits IS NULL OR btrim(e.benefits) = ''",
  category_id: "e.category_id IS NULL",
  subcategory: "e.subcategory IS NULL OR btrim(e.subcategory) = ''",
  muscles_primary: "e.muscles_primary IS NULL OR cardinality(e.muscles_primary) = 0",
  muscles_secondary: "e.muscles_secondary IS NULL OR cardinality(e.muscles_secondary) = 0",
  body_parts: "e.body_parts IS NULL OR cardinality(e.body_parts) = 0",
  equipment: "e.equipment IS NULL OR cardinality(e.equipment) = 0",
};

function normalizeBackfillTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createBackfillVocabulary(canonicalTerms: string[], aliases: Record<string, string> = {}) {
  const vocabulary = new Map<string, string>();
  for (const term of canonicalTerms) vocabulary.set(normalizeBackfillTerm(term), term);
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (canonicalTerms.includes(canonical)) vocabulary.set(normalizeBackfillTerm(alias), canonical);
  }
  return vocabulary;
}

const BACKFILL_BODY_PARTS = createBackfillVocabulary(
  [
    "Core",
    "Abdômen",
    "Coluna Cervical",
    "Coluna Torácica",
    "Coluna Lombar",
    "Ombro",
    "Cotovelo",
    "Punho/Mão",
    "Quadril",
    "Joelho",
    "Tornozelo/Pé",
    "Panturrilha",
    "Membro Superior",
    "Membro Inferior",
    "Cintura Escapular",
    "Cintura Pélvica",
  ],
  {
    "abdomen": "Abdômen",
    "pescoço": "Coluna Cervical",
    "cervical": "Coluna Cervical",
    "toracica": "Coluna Torácica",
    "lombar": "Coluna Lombar",
    "punho": "Punho/Mão",
    "mão": "Punho/Mão",
    "tornozelo": "Tornozelo/Pé",
    "pé": "Tornozelo/Pé",
    "perna": "Membro Inferior",
    "membros inferiores": "Membro Inferior",
    "membros superiores": "Membro Superior",
  },
);

const BACKFILL_EQUIPMENT = createBackfillVocabulary(
  [
    "Sem Equipamento",
    "Colchonete",
    "Faixa Elástica",
    "Mini Band",
    "Halteres",
    "Caneleira",
    "Bola Suíça",
    "Bola Pequena",
    "Rolo de Espuma",
    "Medicine Ball",
    "Kettlebell",
    "Barra Fixa",
    "Banco",
    "Caixa",
    "Degrau",
    "Bicicleta Ergométrica",
    "Esteira",
    "BOSU",
    "Roda Abdominal",
  ],
  {
    nenhum: "Sem Equipamento",
    "sem equipamento": "Sem Equipamento",
    "peso corporal": "Sem Equipamento",
    chão: "Sem Equipamento",
    tapete: "Colchonete",
    theraband: "Faixa Elástica",
    elástico: "Faixa Elástica",
    "elástico forte": "Faixa Elástica",
    "ab wheel": "Roda Abdominal",
    bosu: "BOSU",
  },
);

const BACKFILL_EQUIPMENT_CONTEXT: Record<string, string[]> = {
  Colchonete: ["colchonete"],
  "Faixa Elástica": ["faixa elastica", "theraband", "elastico"],
  "Mini Band": ["mini band", "loop band"],
  Halteres: ["halter", "dumbbell"],
  Caneleira: ["caneleira"],
  "Bola Suíça": ["bola suica", "bola de pilates", "swiss ball"],
  "Bola Pequena": ["bola pequena"],
  "Rolo de Espuma": ["rolo de espuma", "foam roller"],
  "Medicine Ball": ["medicine ball"],
  Kettlebell: ["kettlebell"],
  "Barra Fixa": ["barra fixa"],
  Banco: ["banco"],
  Caixa: ["caixa", "box pliometrico"],
  Degrau: ["degrau", "escada"],
  "Bicicleta Ergométrica": ["bicicleta ergonometrica", "bike ergonometrica"],
  Esteira: ["esteira"],
  BOSU: ["bosu"],
  "Roda Abdominal": ["roda abdominal", "ab wheel"],
};

const BACKFILL_MUSCLES = createBackfillVocabulary(
  [
    "Reto Abdominal",
    "Oblíquos",
    "Transverso do Abdômen",
    "Eretores da Espinha",
    "Multífidos",
    "Quadríceps",
    "Isquiotibiais",
    "Glúteo Máximo",
    "Glúteo Médio",
    "Glúteo Mínimo",
    "Adutores",
    "Abdutores do Quadril",
    "Gastrocnêmio",
    "Sóleo",
    "Tibial Anterior",
    "Peitoral Maior",
    "Peitoral Menor",
    "Latíssimo do Dorso",
    "Trapézio",
    "Romboides",
    "Deltoide",
    "Bíceps Braquial",
    "Tríceps Braquial",
    "Serrátil Anterior",
    "Manguito Rotador",
    "Flexores do Punho",
    "Extensores do Punho",
    "Assoalho Pélvico",
  ],
  {
    abdominal: "Reto Abdominal",
    "obliquo abdominal": "Oblíquos",
    "abdominal obliquo": "Oblíquos",
    "eretor da coluna": "Eretores da Espinha",
    "musculatura da região lombar": "Eretores da Espinha",
    "gluteos": "Glúteo Máximo",
    "gluteo medio": "Glúteo Médio",
    "gluteo minimo": "Glúteo Mínimo",
    "triceps": "Tríceps Braquial",
    "biceps": "Bíceps Braquial",
  },
);

function parseBackfillFields(value: unknown): ContentBackfillField[] {
  if (!Array.isArray(value)) return DEFAULT_CONTENT_BACKFILL_FIELDS;

  const fields = value.filter(
    (field): field is ContentBackfillField =>
      typeof field === "string" && (CONTENT_BACKFILL_FIELDS as readonly string[]).includes(field),
  );

  return fields.length > 0 ? [...new Set(fields)] : DEFAULT_CONTENT_BACKFILL_FIELDS;
}

function cleanBackfillString(value: unknown, maxLength = 4_000): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s{3,}/g, "\n\n");
  if (["n a", "na", "null", "subcategory"].includes(normalizeBackfillTerm(cleaned))) return null;
  return cleaned.length > 0 ? cleaned.slice(0, maxLength) : null;
}

function cleanBackfillArray(value: unknown, vocabulary?: Map<string, string>): string[] | null {
  const input = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!input) return null;

  const seen = new Set<string>();
  const cleaned = input
    .map((item) => cleanBackfillString(item, 200))
    .filter((item): item is string => item !== null)
    .map((item) => vocabulary?.get(normalizeBackfillTerm(item)) ?? (vocabulary ? null : item))
    .filter((item): item is string => item !== null)
    .filter((item) => {
      const key = item.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  return cleaned.length > 0 ? cleaned : null;
}

function cleanBackfillEquipment(value: unknown, context: string): string[] | null {
  const equipment = cleanBackfillArray(value, BACKFILL_EQUIPMENT);
  if (!equipment) return null;

  const normalizedContext = normalizeBackfillTerm(context);
  const supported = equipment.filter((item) => {
    if (item === "Sem Equipamento") return true;
    return BACKFILL_EQUIPMENT_CONTEXT[item]?.some((term) => normalizedContext.includes(normalizeBackfillTerm(term)));
  });

  return supported.length > 0 ? supported : null;
}

function parseBackfillJson(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

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

// ===== CATÁLOGO POR DIFICULDADE =====
app.get("/catalog", requireAuth, async (c) => {
  try {
    const cached = await kvGet(c.env, KV_CATALOG);
    if (cached) return c.json(cached);

    const db = createPool(c.env);

    const summaryRows = await db.query(
      `SELECT e.difficulty,
              COUNT(*)::int AS count
       FROM exercises e
       WHERE e.is_active = true AND e.is_public = true
       GROUP BY e.difficulty
       ORDER BY e.difficulty`,
    );

    const categoryRows = await db.query(
      `SELECT e.difficulty,
              COALESCE(ec.slug, 'sem-categoria') AS category_slug,
              COALESCE(ec.name, 'Sem Categoria') AS category_name,
              COALESCE(ec.color, '#6b7280') AS category_color,
              COUNT(*)::int AS count
       FROM exercises e
       LEFT JOIN exercise_categories ec ON ec.id = e.category_id
       WHERE e.is_active = true AND e.is_public = true
       GROUP BY e.difficulty, ec.slug, ec.name, ec.color
       ORDER BY e.difficulty, count DESC`,
    );

    const gapRows = await db.query(
      `SELECT e.id, e.slug, e.name, e.difficulty,
              (e.description IS NULL OR btrim(e.description) = '') AS missing_description,
              (e.tips IS NULL OR btrim(e.tips) = '') AS missing_tips,
              (e.precautions IS NULL OR btrim(e.precautions) = '') AS missing_precautions,
              (e.benefits IS NULL OR btrim(e.benefits) = '') AS missing_benefits,
              e.category_id IS NULL AS missing_category,
              (e.muscles_primary IS NULL OR cardinality(e.muscles_primary) = 0) AS missing_muscles_primary,
              (e.body_parts IS NULL OR cardinality(e.body_parts) = 0) AS missing_body_parts,
              (e.equipment IS NULL OR cardinality(e.equipment) = 0) AS missing_equipment
       FROM exercises e
       WHERE e.is_active = true
          AND e.is_public = true
          AND (e.description IS NULL OR btrim(e.description) = ''
               OR e.tips IS NULL OR btrim(e.tips) = ''
               OR e.precautions IS NULL OR btrim(e.precautions) = ''
               OR e.benefits IS NULL OR btrim(e.benefits) = ''
               OR e.category_id IS NULL
               OR e.muscles_primary IS NULL OR cardinality(e.muscles_primary) = 0
               OR e.body_parts IS NULL OR cardinality(e.body_parts) = 0
               OR e.equipment IS NULL OR cardinality(e.equipment) = 0)
        ORDER BY e.difficulty, e.name`,
    );

    const byDifficulty: Record<string, { count: number; categories: Array<{ slug: string; name: string; color: string; count: number }> }> = {};
    for (const r of summaryRows.rows as Array<{ difficulty: string; count: number }>) {
      byDifficulty[r.difficulty] = { count: r.count, categories: [] };
    }
    for (const r of categoryRows.rows as Array<{ difficulty: string; category_slug: string; category_name: string; category_color: string; count: number }>) {
      if (byDifficulty[r.difficulty]) {
        byDifficulty[r.difficulty].categories.push({
          slug: r.category_slug,
          name: r.category_name,
          color: r.category_color,
          count: r.count,
        });
      }
    }

    const gaps = (gapRows.rows as Array<{
      id: string;
      slug: string;
      name: string;
      difficulty: string;
      missing_description?: boolean;
      missing_tips?: boolean;
      missing_precautions?: boolean;
      missing_benefits?: boolean;
      missing_category?: boolean;
      missing_muscles_primary?: boolean;
      missing_body_parts?: boolean;
      missing_equipment?: boolean;
    }>).map((r) => {
      const missing = [
        r.missing_description && "description",
        r.missing_tips && "tips",
        r.missing_precautions && "precautions",
        r.missing_benefits && "benefits",
        r.missing_category && "category_id",
        r.missing_muscles_primary && "muscles_primary",
        r.missing_body_parts && "body_parts",
        r.missing_equipment && "equipment",
      ].filter((field): field is string => Boolean(field));

      return { id: r.id, slug: r.slug, name: r.name, difficulty: r.difficulty, missing };
    });

    const total = Object.values(byDifficulty).reduce((sum, d) => sum + d.count, 0);

    const payload = {
      data: {
        total,
        byDifficulty,
        contentGaps: gaps,
        contentGapsCount: gaps.length,
      },
    };

    c.executionCtx.waitUntil(kvSet(c.env, KV_CATALOG, payload));
    return c.json(payload);
  } catch (error: any) {
    console.error("[Exercises/Catalog] Error:", error.message);
    return c.json({ data: { total: 0, byDifficulty: {}, contentGaps: [], contentGapsCount: 0 } }, 500);
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

    const hasImage = media.some((m) => m.type === "image");
    if (!hasImage && exercise.imageUrl) {
      media.push({
        id: `legacy-image-${exercise.id}`,
        url: exercise.imageUrl,
        type: "image",
        caption: null,
        orderIndex: media.length,
      });
    }

    const hasVideo = media.some((m) => m.type !== "image");
    if (!hasVideo && exercise.videoUrl) {
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
        const vectorData = await generateEmbedding1024(c.env, textToEmbed);
        if (vectorData.length > 0) {
          const sketch = generateTurboSketch(vectorData);
          await db
            .update(exercises)
            .set({
              embedding: vectorData,
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
        const vectorData = await generateEmbedding1024(c.env, textToEmbed);
        if (vectorData.length > 0) {
          const sketch = generateTurboSketch(vectorData);
          await db
            .update(exercises)
            .set({
              embedding: vectorData,
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
        const matchedIds = sources.map((s) =>
          s.id.replace(/^exercise-/, "").replace(/^exercise:/, ""),
        );
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

  // 2. Fallback to pgvector Search (Busca Inteligente nativa)
  try {
    const db = await createDb(c.env);
    const queryVector = await generateEmbedding1024(c.env, q);
    
    if (queryVector.length > 0) {
      const similarity = sql<number>`1 - (${cosineDistance(exercises.embedding, queryVector)})`;
      
      const vectorRows = await db
        .select({
          id: exercises.id,
          slug: exercises.slug,
          name: exercises.name,
          categoryId: exercises.categoryId,
          difficulty: exercises.difficulty,
          imageUrl: exercises.imageUrl,
          thumbnailUrl: exercises.thumbnailUrl,
          videoUrl: exercises.videoUrl,
          durationSeconds: exercises.durationSeconds,
          description: exercises.description,
          similarity,
        })
        .from(exercises)
        .where(and(eq(exercises.isActive, true), eq(exercises.isPublic, true)))
        .orderBy(cosineDistance(exercises.embedding, queryVector))
        .limit(limitNum);
        
      if (vectorRows.length > 0) {
        return c.json({ data: vectorRows, meta: { method: "pgvector" } });
      }
    }
  } catch (e) {
    console.error("[Exercises] pgvector search error:", e);
  }

  // 3. Fallback to optimized Text Search (websearch)
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

// POST /api/exercises/embeddings/backfill — gera embeddings (bge-m3) p/ exercícios sem vetor (lotes).
app.post("/embeddings/backfill", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Apenas admin" }, 403);
  const sqlRaw = getRawSql(c.env, "write");
  const sel = await sqlRaw(
    `SELECT id, name, description FROM exercises WHERE embedding IS NULL LIMIT 20`,
    [],
  );
  let processed = 0;
  for (const r of (sel.rows ?? []) as Array<{ id: string; name: string; description?: string }>) {
    const text = [r.name, r.description].filter(Boolean).join(". ").slice(0, 1000);
    if (text.length < 3) continue;
    try {
      const vec = await generateEmbedding1024(c.env, text);
      if (vec.length > 0) {
        await sqlRaw(`UPDATE exercises SET embedding = $1::vector WHERE id = $2`, [
          JSON.stringify(vec),
          r.id,
        ]);
        processed++;
      }
    } catch (e) {
      console.error("[Exercises] backfill embedding error", e);
    }
  }
  const rem = await sqlRaw(`SELECT count(*)::int AS n FROM exercises WHERE embedding IS NULL`, []);
  return c.json({ processed, remaining: (rem.rows?.[0] as { n?: number })?.n ?? 0 });
});

async function authorizeBackfill(c: any, next: any) {
  const previewToken = c.req.header("X-Preview-Token");
  if (previewToken && c.env.ADMIN_PREVIEW_TOKEN && previewToken === c.env.ADMIN_PREVIEW_TOKEN) {
    c.set("user", { uid: "preview-admin", organizationId: "preview", role: "admin", email: "preview@admin" } as unknown as AuthUser);
    await next();
    return;
  }
  await requireAuth(c, next);
}

// ===== AI BACKFILL DE CONTEÚDO =====

// TEMPORARY: dry-run-only preview endpoint guarded by ADMIN_PREVIEW_TOKEN.
// Allows validating AI output quality in production without minting a JWT.
// Will be removed after backfill completes.
app.post("/content/backfill/preview", async (c) => {
  const previewToken = c.env.ADMIN_PREVIEW_TOKEN;
  if (!previewToken || c.req.header("X-Preview-Token") !== previewToken) {
    return c.json({ error: "preview_unauthorized" }, 401);
  }
  const body = await c.req.json().catch(() => ({})) as { batchSize?: unknown; fields?: unknown };
  const fields = parseBackfillFields(body.fields);
  const batchSize = Math.max(1, Math.min(20, Math.floor(typeof body.batchSize === "number" ? body.batchSize : 10)));
  const sqlRaw = getRawSql(c.env, "write");

  const categoryResult = await sqlRaw(
    `SELECT id, slug, name FROM exercise_categories WHERE organization_id IS NULL ORDER BY name`,
    [],
  );
  const categories = (categoryResult.rows ?? []) as Array<{ id: string; slug: string; name: string }>;
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const predicates = fields.map((field) => `(${CONTENT_BACKFILL_PREDICATES[field]})`);

  const sel = await sqlRaw(
    `SELECT e.id, e.name, e.description, e.tips, e.precautions, e.benefits,
            e.category_id, e.subcategory, e.muscles_primary, e.muscles_secondary,
            e.body_parts, e.equipment
     FROM exercises e
       WHERE e.is_active = true
         AND e.is_public = true
         AND (${predicates.join(" OR ")})
       ORDER BY e.name
       LIMIT $1`,
    [batchSize],
  );

  const rows = (sel.rows ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    tips: string | null;
    precautions: string | null;
    benefits: string | null;
    category_id: string | null;
    subcategory: string | null;
    muscles_primary: string[] | null;
    muscles_secondary: string[] | null;
    body_parts: string[] | null;
    equipment: string[] | null;
  }>;

  const model = WORKERS_AI_MODELS.llama_3_1_8b;
  const samples: Array<{ id: string; name: string; raw: string; parsed: Record<string, unknown>; updates: Record<string, unknown> }> = [];

  for (const r of rows) {
    const needs = {
      description: fields.includes("description") && !cleanBackfillString(r.description),
      tips: fields.includes("tips") && !cleanBackfillString(r.tips),
      precautions: fields.includes("precautions") && !cleanBackfillString(r.precautions),
      benefits: fields.includes("benefits") && !cleanBackfillString(r.benefits),
      category_id: fields.includes("category_id") && !r.category_id,
      subcategory: fields.includes("subcategory") && !cleanBackfillString(r.subcategory, 100),
      muscles_primary: fields.includes("muscles_primary") && !cleanBackfillArray(r.muscles_primary),
      muscles_secondary: fields.includes("muscles_secondary") && !cleanBackfillArray(r.muscles_secondary),
      body_parts: fields.includes("body_parts") && !cleanBackfillArray(r.body_parts),
      equipment: fields.includes("equipment") && !cleanBackfillArray(r.equipment),
    };
    const fieldsToFill = Object.entries(needs).filter(([, needed]) => needed).map(([field]) => field);
    if (fieldsToFill.length === 0) continue;

    const prompt = `Você é um fisioterapeuta especialista. Gere dados clínicos em português brasileiro para o exercício abaixo.
Retorne SOMENTE JSON válido, sem markdown ou explicações.

Exercício: ${r.name}
Descrição atual: ${r.description ?? "vazia"}
Campos a preencher: ${fieldsToFill.join(", ")}.
Categorias válidas (use somente o slug em category_slug): ${JSON.stringify(categories.map(({ slug, name }) => ({ slug, name })))}.
Partes do corpo permitidas: ${JSON.stringify([...new Set(BACKFILL_BODY_PARTS.values())])}.
Equipamentos permitidos: ${JSON.stringify([...new Set(BACKFILL_EQUIPMENT.values())])}.
Músculos permitidos: ${JSON.stringify([...new Set(BACKFILL_MUSCLES.values())])}.

Formato JSON: {"description":"...","tips":"...","precautions":"...","benefits":"...","category_slug":"...","subcategory":"...","muscles_primary":["..."],"muscles_secondary":["..."],"body_parts":["..."],"equipment":["..."]}.`;

    try {
      const resp = await runAi(c.env, model, {
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente especializado em fisioterapia. Gere conteúdo técnico e clínico em português brasileiro. Responda sempre em formato JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }, { cache: false });

      const rawText = readAiText(resp);
      const parsed = parseBackfillJson(rawText);
      const updates: Record<string, unknown> = {};
      const addString = (field: keyof typeof needs, column: string, maxLength?: number) => {
        const value = cleanBackfillString(parsed[field], maxLength);
        if (needs[field] && value) updates[column] = value;
      };

      addString("description", "description");
      addString("tips", "tips");
      addString("precautions", "precautions");
      addString("benefits", "benefits");
      addString("subcategory", "subcategory", 100);
      const addVocabularyArray = (
        field: "muscles_primary" | "muscles_secondary" | "body_parts" | "equipment",
        column: string,
        vocabulary: Map<string, string>,
      ) => {
        const value = cleanBackfillArray(parsed[field], vocabulary);
        if (needs[field] && value) updates[column] = value;
      };

      addVocabularyArray("muscles_primary", "muscles_primary", BACKFILL_MUSCLES);
      addVocabularyArray("muscles_secondary", "muscles_secondary", BACKFILL_MUSCLES);
      addVocabularyArray("body_parts", "body_parts", BACKFILL_BODY_PARTS);
      const equipment = cleanBackfillEquipment(parsed.equipment, `${r.name} ${r.description ?? ""}`);
      if (needs.equipment && equipment) updates.equipment = equipment;

      const categorySlug = cleanBackfillString(parsed.category_slug, 100)?.toLocaleLowerCase("pt-BR");
      if (needs.category_id && categorySlug && categoryIdBySlug.has(categorySlug)) {
        updates.category_id = categoryIdBySlug.get(categorySlug)!;
      }

      if (samples.length < 20) samples.push({ id: r.id, name: r.name, raw: rawText.slice(0, 1000), parsed, updates });
    } catch (e) {
      if (samples.length < 20) samples.push({ id: r.id, name: r.name, raw: `ERROR: ${(e as Error).message}`, parsed: {}, updates: {} });
    }
  }

  return c.json({ fields, batchSize, samples, count: samples.length });
});

app.post("/content/backfill", authorizeBackfill, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Apenas admin" }, 403);

  const body = await c.req.json().catch(() => ({})) as {
    batchSize?: unknown;
    dryRun?: unknown;
    fields?: unknown;
  };
  const fields = parseBackfillFields(body.fields);
  const requestedBatchSize = typeof body.batchSize === "number" ? body.batchSize : 10;
  const batchSize = Math.max(1, Math.min(20, Math.floor(requestedBatchSize)));
  const dryRun = body.dryRun === true;
  const sqlRaw = getRawSql(c.env, "write");

  const categoryResult = await sqlRaw(
    `SELECT id, slug, name
     FROM exercise_categories
     WHERE organization_id IS NULL
     ORDER BY name`,
    [],
  );
  const categories = (categoryResult.rows ?? []) as Array<{ id: string; slug: string; name: string }>;
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const predicates = fields.map((field) => `(${CONTENT_BACKFILL_PREDICATES[field]})`);

  const sel = await sqlRaw(
    `SELECT e.id, e.name, e.description, e.tips, e.precautions, e.benefits,
            e.category_id, e.subcategory, e.muscles_primary, e.muscles_secondary,
            e.body_parts, e.equipment
     FROM exercises e
       WHERE e.is_active = true
         AND e.is_public = true
         AND (${predicates.join(" OR ")})
       ORDER BY e.name
       LIMIT $1`,
    [batchSize],
  );

  const rows = (sel.rows ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    tips: string | null;
    precautions: string | null;
    benefits: string | null;
    category_id: string | null;
    subcategory: string | null;
    muscles_primary: string[] | null;
    muscles_secondary: string[] | null;
    body_parts: string[] | null;
    equipment: string[] | null;
  }>;

  let processed = 0;
  let failed = 0;
  const samples: Array<{ id: string; name: string; updates: Record<string, unknown> }> = [];
  const model = WORKERS_AI_MODELS.llama_3_1_8b;

  for (const r of rows) {
    const needs = {
      description: fields.includes("description") && !cleanBackfillString(r.description),
      tips: fields.includes("tips") && !cleanBackfillString(r.tips),
      precautions: fields.includes("precautions") && !cleanBackfillString(r.precautions),
      benefits: fields.includes("benefits") && !cleanBackfillString(r.benefits),
      category_id: fields.includes("category_id") && !r.category_id,
      subcategory: fields.includes("subcategory") && !cleanBackfillString(r.subcategory, 100),
      muscles_primary: fields.includes("muscles_primary") && !cleanBackfillArray(r.muscles_primary),
      muscles_secondary: fields.includes("muscles_secondary") && !cleanBackfillArray(r.muscles_secondary),
      body_parts: fields.includes("body_parts") && !cleanBackfillArray(r.body_parts),
      equipment: fields.includes("equipment") && !cleanBackfillArray(r.equipment),
    };
    const fieldsToFill = Object.entries(needs)
      .filter(([, needed]) => needed)
      .map(([field]) => field);

    if (fieldsToFill.length === 0) continue;

    const prompt = `Você é um fisioterapeuta especialista. Gere dados clínicos em português brasileiro para o exercício abaixo.
Retorne SOMENTE JSON válido, sem markdown ou explicações.

Exercício: ${r.name}
Descrição atual: ${r.description ?? "vazia"}
Campos a preencher: ${fieldsToFill.join(", ")}.
Categorias válidas (use somente o slug em category_slug): ${JSON.stringify(categories.map(({ slug, name }) => ({ slug, name })))}.
Partes do corpo permitidas: ${JSON.stringify([...new Set(BACKFILL_BODY_PARTS.values())])}.
Equipamentos permitidos: ${JSON.stringify([...new Set(BACKFILL_EQUIPMENT.values())])}.
Músculos permitidos: ${JSON.stringify([...new Set(BACKFILL_MUSCLES.values())])}.

Formato JSON: {"description":"...","tips":"...","precautions":"...","benefits":"...","category_slug":"...","subcategory":"...","muscles_primary":["..."],"muscles_secondary":["..."],"body_parts":["..."],"equipment":["..."]}.`;

    try {
      // Retry em erro transitório da Workers AI (429/5xx/timeout) — reduz as
      // falhas recorrentes do backfill sem re-tentar erros determinísticos.
      const resp = await withAIRetry(
        () =>
          runAi(
            c.env,
            model,
            {
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um assistente especializado em fisioterapia. Gere conteúdo técnico e clínico em português brasileiro. Responda sempre em formato JSON válido.",
                },
                { role: "user", content: prompt },
              ],
            },
            { cache: false },
          ),
        { retries: 1 },
      );

      const parsed = parseBackfillJson(readAiText(resp));
      const updates: Record<string, unknown> = {};
      const addString = (field: keyof typeof needs, column: string, maxLength?: number) => {
        const value = cleanBackfillString(parsed[field], maxLength);
        if (needs[field] && value) updates[column] = value;
      };

      addString("description", "description");
      addString("tips", "tips");
      addString("precautions", "precautions");
      addString("benefits", "benefits");
      addString("subcategory", "subcategory", 100);
      const addVocabularyArray = (
        field: "muscles_primary" | "muscles_secondary" | "body_parts" | "equipment",
        column: string,
        vocabulary: Map<string, string>,
      ) => {
        const value = cleanBackfillArray(parsed[field], vocabulary);
        if (needs[field] && value) updates[column] = value;
      };

      addVocabularyArray("muscles_primary", "muscles_primary", BACKFILL_MUSCLES);
      addVocabularyArray("muscles_secondary", "muscles_secondary", BACKFILL_MUSCLES);
      addVocabularyArray("body_parts", "body_parts", BACKFILL_BODY_PARTS);
      const equipment = cleanBackfillEquipment(parsed.equipment, `${r.name} ${r.description ?? ""}`);
      if (needs.equipment && equipment) updates.equipment = equipment;

      const categorySlug = cleanBackfillString(parsed.category_slug, 100)?.toLocaleLowerCase("pt-BR");
      if (needs.category_id && categorySlug && categoryIdBySlug.has(categorySlug)) {
        updates.category_id = categoryIdBySlug.get(categorySlug)!;
      }

      if (Object.keys(updates).length === 0) {
        failed++;
        continue;
      }

      if (!dryRun) {
        const updateColumns = Object.keys(updates);
        const params = updateColumns.map((column) => updates[column]);
        params.push(r.id);
        await sqlRaw(
          `UPDATE exercises
           SET ${updateColumns.map((column, index) => `${column} = $${index + 1}`).join(", ")},
               updated_at = now()
           WHERE id = $${params.length}`,
          params,
        );
      }
      processed++;
      if (samples.length < 3) samples.push({ id: r.id, name: r.name, updates });
    } catch (e) {
      // warn (não error): já retentou o transitório; falha persistente aqui é
      // por-item e não-fatal. Loga nome p/ diagnóstico sem poluir o stream de erros.
      console.warn(
        "[Exercises/ContentBackfill] IA falhou para",
        r.id,
        r.name,
        e instanceof Error ? e.message : e,
      );
      failed++;
    }
  }

  const remainingPredicates = fields.map((field) => `(${CONTENT_BACKFILL_PREDICATES[field]})`);
  const remaining = await sqlRaw(
    `SELECT count(*)::int AS n FROM exercises e
     WHERE e.is_active = true AND e.is_public = true
       AND (${remainingPredicates.join(" OR ")})`,
    [],
  );

  if (!dryRun) c.executionCtx.waitUntil(kvDelete(c.env, KV_CATALOG));

  return c.json({
    processed,
    failed,
    dryRun,
    fields,
    samples,
    remaining: (remaining.rows?.[0] as { n?: number })?.n ?? 0,
  });
});


export { app as exercisesRoutes };
