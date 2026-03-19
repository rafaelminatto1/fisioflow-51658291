import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type Queryable = ReturnType<typeof createPool>;
type JsonResponder = { json: (body: unknown, status?: number) => Response };

async function hasTable(pool: Queryable, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

function isMissingSchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const typedError = error as Error & {
    code?: string;
    cause?: { code?: string; message?: string };
  };
  const code = typedError.code ?? typedError.cause?.code;
  const message = `${typedError.message} ${typedError.cause?.message ?? ''}`.toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('undefined table') ||
    message.includes('undefined column')
  );
}

function logSchemaFallback(resource: string, error?: unknown) {
  console.warn(`[knowledge] schema fallback for ${resource}`, error);
}

async function ensureTables(c: JsonResponder, pool: Queryable, tableNames: string[]) {
  for (const tableName of tableNames) {
    if (!(await hasTable(pool, tableName))) {
      return c.json(
        {
          error: 'KNOWLEDGE_SCHEMA_UNAVAILABLE',
          message: `Tabela obrigatória ausente: ${tableName}`,
        },
        501,
      );
    }
  }
  return null;
}

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeArticle = (row: Record<string, unknown>) => ({
  id: String(row.article_id ?? row.id),
  organizationId: String(row.organization_id ?? ''),
  title: String(row.title ?? ''),
  type: String(row.article_type ?? 'pdf'),
  url: row.url ? String(row.url) : '',
  group: String(row.group ?? ''),
  subgroup: String(row.subgroup ?? ''),
  focus: parseJsonArray(row.focus),
  evidence: row.evidence ? String(row.evidence) : 'B',
  evidenceLevel: row.evidence ? String(row.evidence) : 'B',
  year: row.year == null ? undefined : Number(row.year),
  source: row.source ? String(row.source) : undefined,
  status: row.status ? String(row.status) : 'pending',
  tags: parseJsonArray(row.tags),
  summary: row.summary ? String(row.summary) : undefined,
  keyFindings: parseJsonArray(row.highlights),
  clinicalImplications: parseJsonArray(row.clinical_implications),
  highlights: parseJsonArray(row.highlights),
  observations: parseJsonArray(row.observations),
  keyQuestions: parseJsonArray(row.key_questions),
  vectorStatus: row.vector_status ? String(row.vector_status) : 'pending',
  viewCount: Number(row.view_count ?? 0),
  citationCount: row.citation_count == null ? undefined : Number(row.citation_count),
  metadata: row.metadata ?? {
    year: row.year == null ? undefined : Number(row.year),
    journal: row.source ? String(row.source) : undefined,
    authors: [],
  },
  createdAt: row.created_at ? String(row.created_at) : null,
  updatedAt: row.updated_at ? String(row.updated_at) : null,
  createdBy: row.created_by ? String(row.created_by) : '',
});

const normalizeAnnotation = (row: Record<string, unknown>) => ({
  id: String(row.id),
  article_id: String(row.article_id),
  organization_id: String(row.organization_id),
  scope: String(row.scope),
  user_id: row.user_id ? String(row.user_id) : undefined,
  highlights: parseJsonArray(row.highlights),
  observations: parseJsonArray(row.observations),
  status: row.status ? String(row.status) : undefined,
  evidence: row.evidence ? String(row.evidence) : undefined,
  created_by: String(row.created_by),
  updated_by: String(row.updated_by),
  created_at: row.created_at ? String(row.created_at) : null,
  updated_at: row.updated_at ? String(row.updated_at) : null,
});

const normalizeCuration = (row: Record<string, unknown>) => ({
  id: String(row.id),
  article_id: String(row.article_id),
  organization_id: String(row.organization_id),
  status: String(row.status),
  notes: row.notes ? String(row.notes) : undefined,
  assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
  created_by: String(row.created_by),
  updated_by: String(row.updated_by),
  created_at: row.created_at ? String(row.created_at) : null,
  updated_at: row.updated_at ? String(row.updated_at) : null,
});

const normalizeAudit = (row: Record<string, unknown>) => ({
  id: String(row.id),
  article_id: String(row.article_id),
  organization_id: String(row.organization_id),
  actor_id: String(row.actor_id),
  action: String(row.action),
  before: row.before ?? undefined,
  after: row.after ?? undefined,
  context: row.context ?? undefined,
  created_at: row.created_at ? String(row.created_at) : null,
});

app.use('*', requireAuth);

app.get('/articles', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'knowledge_articles'))) {
    logSchemaFallback('articles');
    return c.json({ data: [] });
  }

  try {
    const result = await pool.query(
      `
        SELECT *
        FROM knowledge_articles
        WHERE organization_id = $1
        ORDER BY updated_at DESC, title ASC
      `,
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(normalizeArticle) });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('articles', error);
      return c.json({ data: [] });
    }
    throw error;
  }
});

app.post('/articles', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata as Record<string, unknown> : {};
  const articleId = String(body.article_id ?? body.id ?? crypto.randomUUID());

  const result = await pool.query(
    `INSERT INTO knowledge_articles (
        organization_id, article_id, title, article_type, "group", subgroup, focus, evidence, year,
        source, url, tags, status, summary, highlights, clinical_implications, observations, key_questions,
        metadata, vector_status, view_count, citation_count, raw_text, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,
        $19::jsonb,$20,$21,$22,$23,$24,$25,NOW(),NOW()
      )
      RETURNING *`,
    [
      user.organizationId,
      articleId,
      String(body.title ?? ''),
      String(body.type ?? body.article_type ?? 'pdf'),
      String(body.group ?? ''),
      String(body.subgroup ?? ''),
      JSON.stringify(Array.isArray(body.focus) ? body.focus : []),
      String(body.evidenceLevel ?? body.evidence ?? 'Consensus'),
      metadata.year == null ? null : Number(metadata.year),
      metadata.journal ? String(metadata.journal) : (body.source ? String(body.source) : null),
      body.url ? String(body.url) : null,
      JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      String(body.status ?? 'pending'),
      body.summary ? String(body.summary) : null,
      JSON.stringify(Array.isArray(body.keyFindings) ? body.keyFindings : body.highlights ?? []),
      JSON.stringify(Array.isArray(body.clinicalImplications) ? body.clinicalImplications : []),
      JSON.stringify(Array.isArray(body.observations) ? body.observations : []),
      JSON.stringify(Array.isArray(body.keyQuestions) ? body.keyQuestions : []),
      JSON.stringify(metadata),
      String(body.vectorStatus ?? body.vector_status ?? 'pending'),
      Number(body.viewCount ?? body.view_count ?? 0),
      body.citationCount == null ? null : Number(body.citationCount),
      body.rawText ? String(body.rawText) : null,
      user.uid,
      user.uid,
    ],
  );

  return c.json({ data: normalizeArticle(result.rows[0]) }, 201);
});

app.put('/articles/:articleId', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const { articleId } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata as Record<string, unknown> : undefined;
  const sets: string[] = ['updated_by = $1', 'updated_at = NOW()'];
  const params: unknown[] = [user.uid];

  const addSet = (column: string, value: unknown, transform?: (v: unknown) => unknown) => {
    params.push(transform ? transform(value) : value);
    sets.push(`${column} = $${params.length}`);
  };

  if (body.title !== undefined) addSet('title', String(body.title));
  if (body.type !== undefined || body.article_type !== undefined) addSet('article_type', String(body.type ?? body.article_type));
  if (body.group !== undefined) addSet('"group"', String(body.group));
  if (body.subgroup !== undefined) addSet('subgroup', String(body.subgroup));
  if (body.focus !== undefined) addSet('focus', body.focus, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (body.evidenceLevel !== undefined || body.evidence !== undefined) addSet('evidence', String(body.evidenceLevel ?? body.evidence));
  if (body.url !== undefined) addSet('url', body.url ? String(body.url) : null);
  if (body.tags !== undefined) addSet('tags', body.tags, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (body.status !== undefined) addSet('status', String(body.status));
  if (body.summary !== undefined) addSet('summary', body.summary ? String(body.summary) : null);
  if (body.keyFindings !== undefined || body.highlights !== undefined) addSet('highlights', body.keyFindings ?? body.highlights, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (body.clinicalImplications !== undefined) addSet('clinical_implications', body.clinicalImplications, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (body.observations !== undefined) addSet('observations', body.observations, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (body.keyQuestions !== undefined) addSet('key_questions', body.keyQuestions, (v) => JSON.stringify(Array.isArray(v) ? v : []));
  if (metadata !== undefined) {
    addSet('metadata', metadata, (v) => JSON.stringify(v));
    if (metadata.year !== undefined) addSet('year', Number(metadata.year));
    if (metadata.journal !== undefined) addSet('source', metadata.journal ? String(metadata.journal) : null);
  }
  if (body.vectorStatus !== undefined || body.vector_status !== undefined) addSet('vector_status', String(body.vectorStatus ?? body.vector_status));
  if (body.viewCount !== undefined || body.view_count !== undefined) addSet('view_count', Number(body.viewCount ?? body.view_count));
  if (body.citationCount !== undefined || body.citation_count !== undefined) addSet('citation_count', body.citationCount ?? body.citation_count);
  if (body.rawText !== undefined || body.raw_text !== undefined) addSet('raw_text', body.rawText ?? body.raw_text);

  params.push(user.organizationId, articleId);
  const result = await pool.query(
    `UPDATE knowledge_articles
        SET ${sets.join(', ')}
      WHERE organization_id = $${params.length - 1} AND article_id = $${params.length}
      RETURNING *`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Artigo não encontrado' }, 404);
  return c.json({ data: normalizeArticle(result.rows[0]) });
});

app.post('/articles/sync', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const body = (await c.req.json().catch(() => ({}))) as { articles?: Record<string, unknown>[] };
  const articles = Array.isArray(body.articles) ? body.articles : [];

  for (const article of articles) {
    await pool.query(
      `
        INSERT INTO knowledge_articles (
          organization_id, article_id, title, "group", subgroup, focus, evidence, year,
          source, url, tags, status, highlights, observations, key_questions,
          created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7, $8,
          $9, $10, $11::jsonb, $12, $13::jsonb, $14::jsonb, $15::jsonb,
          $16, $17, NOW(), NOW()
        )
        ON CONFLICT (organization_id, article_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          "group" = EXCLUDED."group",
          subgroup = EXCLUDED.subgroup,
          focus = EXCLUDED.focus,
          evidence = EXCLUDED.evidence,
          year = EXCLUDED.year,
          source = EXCLUDED.source,
          url = EXCLUDED.url,
          tags = EXCLUDED.tags,
          status = EXCLUDED.status,
          highlights = EXCLUDED.highlights,
          observations = EXCLUDED.observations,
          key_questions = EXCLUDED.key_questions,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `,
      [
        user.organizationId,
        String(article.id ?? article.article_id ?? ''),
        String(article.title ?? ''),
        String(article.group ?? ''),
        String(article.subgroup ?? ''),
        JSON.stringify(Array.isArray(article.focus) ? article.focus : []),
        String(article.evidence ?? 'B'),
        article.year == null ? null : Number(article.year),
        article.source ? String(article.source) : null,
        article.url ? String(article.url) : null,
        JSON.stringify(Array.isArray(article.tags) ? article.tags : []),
        String(article.status ?? 'pending'),
        JSON.stringify(Array.isArray(article.highlights) ? article.highlights : []),
        JSON.stringify(Array.isArray(article.observations) ? article.observations : []),
        JSON.stringify(Array.isArray(article.keyQuestions) ? article.keyQuestions : article.key_questions ?? []),
        user.uid,
        user.uid,
      ],
    );
  }

  return c.json({ indexed: articles.length });
});

app.post('/articles/index', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'knowledge_articles'))) {
    logSchemaFallback('articles/index');
    return c.json({ indexed: 0 });
  }
  try {
    const result = await pool.query(
      `SELECT count(*)::int AS total FROM knowledge_articles WHERE organization_id = $1`,
      [user.organizationId],
    );
    return c.json({ indexed: Number(result.rows[0]?.total ?? 0) });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('articles/index', error);
      return c.json({ indexed: 0 });
    }
    throw error;
  }
});

app.post('/articles/:articleId/process', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const { articleId } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as { textContent?: string };
  const rawText = String(body.textContent ?? '');
  const summary = rawText
    ? rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 3).join(' ')
    : 'Documento indexado para consulta.';
  const keyFindings = rawText
    ? rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 5)
    : [];

  await pool.query(
    `UPDATE knowledge_articles
        SET vector_status = 'completed',
            raw_text = COALESCE(NULLIF($3, ''), raw_text),
            summary = COALESCE(NULLIF($4, ''), summary),
            highlights = CASE WHEN jsonb_array_length($5::jsonb) > 0 THEN $5::jsonb ELSE highlights END,
            updated_by = $1,
            updated_at = NOW()
      WHERE organization_id = $2 AND article_id = $6`,
    [user.uid, user.organizationId, rawText, summary, JSON.stringify(keyFindings), articleId],
  );

  return c.json({ data: { success: true } });
});

app.post('/articles/:articleId/ask', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const { articleId } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as { query?: string };
  const question = String(body.query ?? '').trim();
  if (!question) return c.json({ error: 'query é obrigatória' }, 400);

  const result = await pool.query(
    `SELECT title, summary, highlights, raw_text
       FROM knowledge_articles
      WHERE organization_id = $1 AND article_id = $2`,
    [user.organizationId, articleId],
  );

  if (!result.rows.length) return c.json({ error: 'Artigo não encontrado' }, 404);
  const row = result.rows[0];
  const contextBits = [
    row.summary ? `Resumo: ${String(row.summary)}` : '',
    ...parseJsonArray(row.highlights).map((item) => `- ${item}`),
  ].filter(Boolean);

  const answer = contextBits.length
    ? `Documento: ${String(row.title)}\n\n${contextBits.join('\n')}\n\nPergunta: ${question}\n\nResposta resumida com base no conteúdo indexado acima.`
    : `Documento: ${String(row.title)}\n\nO documento foi localizado, mas ainda não possui resumo estruturado. Pergunta recebida: ${question}`;

  return c.json({ data: { answer, contextUsed: contextBits.join('\n') } });
});

app.post('/semantic-search', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as { query?: string; limit?: number };
  const search = String(body.query ?? '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 100));
  if (!search) return c.json({ data: [] });
  if (!(await hasTable(pool, 'knowledge_articles'))) {
    logSchemaFallback('semantic-search');
    return c.json({ data: [] });
  }

  let result;
  try {
    result = await pool.query(
      `
        SELECT article_id, title, subgroup, tags, highlights, observations
        FROM knowledge_articles
        WHERE organization_id = $1
      `,
      [user.organizationId],
    );
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('semantic-search', error);
      return c.json({ data: [] });
    }
    throw error;
  }

  const scored = result.rows
    .map((row) => {
      const haystack = [
        row.title,
        row.subgroup,
        ...parseJsonArray(row.tags),
        ...parseJsonArray(row.highlights),
        ...parseJsonArray(row.observations),
      ]
        .filter(Boolean)
        .join(' \n ')
        .toLowerCase();
      const occurrences = haystack.split(search).length - 1;
      const exactTitleBoost = String(row.title ?? '').toLowerCase().includes(search) ? 5 : 0;
      return {
        article_id: String(row.article_id),
        score: occurrences + exactTitleBoost,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return c.json({ data: scored });
});

app.get('/annotations', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'knowledge_annotations'))) {
    logSchemaFallback('annotations');
    return c.json({ data: [] });
  }
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM knowledge_annotations
        WHERE organization_id = $1
          AND (
            scope = 'organization'
            OR (scope = 'user' AND user_id = $2)
          )
        ORDER BY updated_at DESC
      `,
      [user.organizationId, user.uid],
    );
    return c.json({ data: result.rows.map(normalizeAnnotation) });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('annotations', error);
      return c.json({ data: [] });
    }
    throw error;
  }
});

app.put('/annotations/:articleId', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_annotations', 'knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const articleId = c.req.param('articleId');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const scope = body.scope === 'user' ? 'user' : 'organization';
  const scopeKey = scope === 'user' ? user.uid : 'org';

  const result = await pool.query(
    `
      INSERT INTO knowledge_annotations (
        organization_id, article_id, scope, scope_key, user_id, highlights, observations,
        status, evidence, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb,
        $8, $9, $10, $11, NOW(), NOW()
      )
      ON CONFLICT (organization_id, article_id, scope, scope_key)
      DO UPDATE SET
        highlights = EXCLUDED.highlights,
        observations = EXCLUDED.observations,
        status = EXCLUDED.status,
        evidence = EXCLUDED.evidence,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `,
    [
      user.organizationId,
      articleId,
      scope,
      scopeKey,
      scope === 'user' ? user.uid : null,
      JSON.stringify(Array.isArray(body.highlights) ? body.highlights : []),
      JSON.stringify(Array.isArray(body.observations) ? body.observations : []),
      body.status ? String(body.status) : null,
      body.evidence ? String(body.evidence) : null,
      user.uid,
      user.uid,
    ],
  );

  if (scope === 'organization') {
    await pool.query(
      `
        UPDATE knowledge_articles
        SET highlights = $3::jsonb,
            observations = $4::jsonb,
            updated_by = $5,
            updated_at = NOW()
        WHERE organization_id = $1 AND article_id = $2
      `,
      [
        user.organizationId,
        articleId,
        JSON.stringify(Array.isArray(body.highlights) ? body.highlights : []),
        JSON.stringify(Array.isArray(body.observations) ? body.observations : []),
        user.uid,
      ],
    );
  }

  return c.json({ data: normalizeAnnotation(result.rows[0]) });
});

app.get('/curation', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'knowledge_curation'))) {
    logSchemaFallback('curation');
    return c.json({ data: [] });
  }
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM knowledge_curation
        WHERE organization_id = $1
        ORDER BY updated_at DESC
      `,
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(normalizeCuration) });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('curation', error);
      return c.json({ data: [] });
    }
    throw error;
  }
});

app.get('/articles/:articleId/notes', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { articleId } = c.req.param();
  if (!(await hasTable(pool, 'knowledge_notes'))) {
    logSchemaFallback('notes');
    return c.json({ data: [] });
  }
  try {
    const result = await pool.query(
      `SELECT id, article_id, user_id, content, page_ref, highlight_color, created_at
         FROM knowledge_notes
        WHERE organization_id = $1 AND article_id = $2 AND user_id = $3
        ORDER BY created_at DESC`,
      [user.organizationId, articleId, user.uid],
    );
    return c.json({ data: result.rows || result });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('notes', error);
      return c.json({ data: [] });
    }
    throw error;
  }
});

app.post('/articles/:articleId/notes', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_notes']);
  if (schemaUnavailable) return schemaUnavailable;
  const { articleId } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO knowledge_notes (
        organization_id, article_id, user_id, content, page_ref, highlight_color, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING id, article_id, user_id, content, page_ref, highlight_color, created_at`,
    [
      user.organizationId,
      articleId,
      user.uid,
      String(body.content ?? ''),
      body.pageRef ?? null,
      body.highlightColor ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/curation/:articleId', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_curation']);
  if (schemaUnavailable) return schemaUnavailable;
  const articleId = c.req.param('articleId');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const result = await pool.query(
    `
      INSERT INTO knowledge_curation (
        organization_id, article_id, status, notes, assigned_to,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      ON CONFLICT (organization_id, article_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        assigned_to = EXCLUDED.assigned_to,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `,
    [
      user.organizationId,
      articleId,
      String(body.status ?? 'pending'),
      body.notes ? String(body.notes) : null,
      body.assigned_to ? String(body.assigned_to) : null,
      user.uid,
      user.uid,
    ],
  );
  return c.json({ data: normalizeCuration(result.rows[0]) });
});

app.get('/audit', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  if (!(await hasTable(pool, 'knowledge_audit'))) {
    logSchemaFallback('audit');
    return c.json({ data: [] });
  }
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM knowledge_audit
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      [user.organizationId],
    );
    return c.json({ data: result.rows.map(normalizeAudit) });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('audit', error);
      return c.json({ data: [] });
    }
    throw error;
  }
});

app.post('/audit', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_audit']);
  if (schemaUnavailable) return schemaUnavailable;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await pool.query(
    `
      INSERT INTO knowledge_audit (
        organization_id, article_id, actor_id, action, before, after, context, created_at
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW()
      )
      RETURNING *
    `,
    [
      user.organizationId,
      String(body.article_id ?? ''),
      body.actor_id ? String(body.actor_id) : user.uid,
      String(body.action ?? 'update_annotation'),
      body.before ? JSON.stringify(body.before) : null,
      body.after ? JSON.stringify(body.after) : null,
      body.context ? JSON.stringify(body.context) : null,
    ],
  );
  return c.json({ data: normalizeAudit(result.rows[0]) }, 201);
});

app.delete('/articles/:articleId', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const schemaUnavailable = await ensureTables(c, pool, ['knowledge_articles']);
  if (schemaUnavailable) return schemaUnavailable;
  const { articleId } = c.req.param();

  const result = await pool.query(
    `DELETE FROM knowledge_articles
      WHERE organization_id = $1 AND article_id = $2
      RETURNING *`,
    [user.organizationId, articleId],
  );

  if (!result.rows.length) return c.json({ error: 'Artigo não encontrado' }, 404);
  return c.json({ success: true });
});

app.get('/profiles', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const ids = String(c.req.query('ids') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!ids.length) return c.json({ data: {} });
  if (!(await hasTable(pool, 'profiles')) || !(await hasTable(pool, 'organization_members'))) {
    logSchemaFallback('profiles');
    return c.json({ data: {} });
  }

  let result;
  try {
    result = await pool.query(
      `
        SELECT p.user_id, p.full_name, p.avatar_url
        FROM profiles p
        JOIN organization_members om ON om.user_id = p.user_id
        WHERE om.organization_id = $1
          AND p.user_id = ANY($2::text[])
      `,
      [user.organizationId, ids],
    );
  } catch (error) {
    if (isMissingSchemaError(error)) {
      logSchemaFallback('profiles', error);
      return c.json({ data: {} });
    }
    throw error;
  }

  const data = Object.fromEntries(
    result.rows.map((row) => [
      String(row.user_id),
      { full_name: row.full_name ? String(row.full_name) : undefined, avatar_url: row.avatar_url ? String(row.avatar_url) : undefined },
    ]),
  );
  return c.json({ data });
});

export { app as knowledgeRoutes };
