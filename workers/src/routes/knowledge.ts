import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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
  title: String(row.title ?? ''),
  group: String(row.group ?? ''),
  subgroup: String(row.subgroup ?? ''),
  focus: parseJsonArray(row.focus),
  evidence: row.evidence ? String(row.evidence) : 'B',
  year: row.year == null ? undefined : Number(row.year),
  source: row.source ? String(row.source) : undefined,
  url: row.url ? String(row.url) : undefined,
  status: row.status ? String(row.status) : 'pending',
  tags: parseJsonArray(row.tags),
  highlights: parseJsonArray(row.highlights),
  observations: parseJsonArray(row.observations),
  keyQuestions: parseJsonArray(row.key_questions),
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
  const pool = createPool(c.env);
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
});

app.post('/articles/sync', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
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
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT count(*)::int AS total FROM knowledge_articles WHERE organization_id = $1`,
    [user.organizationId],
  );
  return c.json({ indexed: Number(result.rows[0]?.total ?? 0) });
});

app.post('/semantic-search', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as { query?: string; limit?: number };
  const search = String(body.query ?? '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 100));
  if (!search) return c.json({ data: [] });

  const result = await pool.query(
    `
      SELECT article_id, title, subgroup, tags, highlights, observations
      FROM knowledge_articles
      WHERE organization_id = $1
    `,
    [user.organizationId],
  );

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
  const pool = createPool(c.env);
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
});

app.put('/annotations/:articleId', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
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
  const pool = createPool(c.env);
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
});

app.put('/curation/:articleId', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
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
  const pool = createPool(c.env);
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
});

app.post('/audit', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
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

app.get('/profiles', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const ids = String(c.req.query('ids') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!ids.length) return c.json({ data: {} });

  const result = await pool.query(
    `
      SELECT p.user_id, p.full_name, p.avatar_url
      FROM profiles p
      JOIN organization_members om ON om.user_id = p.user_id
      WHERE om.organization_id = $1
        AND p.user_id = ANY($2::text[])
    `,
    [user.organizationId, ids],
  );

  const data = Object.fromEntries(
    result.rows.map((row) => [
      String(row.user_id),
      { full_name: row.full_name ? String(row.full_name) : undefined, avatar_url: row.avatar_url ? String(row.avatar_url) : undefined },
    ]),
  );
  return c.json({ data });
});

export { app as knowledgeRoutes };
