/**
 * Rotas: Wiki / Base de Conhecimento
 * GET /api/wiki               — lista páginas publicadas
 * GET /api/wiki/:slug         — página completa (incrementa viewCount)
 * GET /api/wiki/:slug/children — sub-páginas
 * GET /api/wiki/:slug/versions — histórico de versões (auth)
 */
import { Hono } from 'hono';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { createDb, createPool } from '../lib/db';
import { requireAuth, verifyToken, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { wikiPages, wikiPageVersions } from '@fisioflow/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== CATEGORIAS (ANTES de /:slug para evitar conflito de rota) =====
app.get('/categories', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const result = await db.query(
    `SELECT * FROM wiki_categories WHERE organization_id = $1 ORDER BY order_index ASC, name ASC`,
    [user.organizationId]
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/categories', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const body = await c.req.json();
  const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const result = await db.query(
    `INSERT INTO wiki_categories (organization_id, name, slug, description, icon, color, parent_id, order_index)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (organization_id, slug) DO NOTHING RETURNING *`,
    [user.organizationId, body.name, body.slug ?? slug, body.description ?? null, body.icon ?? null,
     body.color ?? null, body.parent_id ?? null, body.order_index ?? 0]
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/categories/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  await db.query(`DELETE FROM wiki_categories WHERE id = $1 AND organization_id = $2`, [c.req.param('id'), user.organizationId]);
  return c.json({ ok: true });
});

// ===== LISTA DE PÁGINAS =====
app.get('/', async (c) => {
  const authUser = await verifyToken(c, c.env);
  const db = await createDb(c.env);

  const { q, category, page = '1', limit = '30' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    eq(wikiPages.isPublished, true),
    eq(wikiPages.isPublic, true),
    isNull(wikiPages.deletedAt),
    isNull(wikiPages.parentId), // apenas páginas raiz
  ];

  if (q) conditions.push(ilike(wikiPages.title, `%${q}%`));
  if (category) conditions.push(eq(wikiPages.category, category));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: wikiPages.id,
        slug: wikiPages.slug,
        title: wikiPages.title,
        icon: wikiPages.icon,
        category: wikiPages.category,
        tags: wikiPages.tags,
        viewCount: wikiPages.viewCount,
        version: wikiPages.version,
        updatedAt: wikiPages.updatedAt,
      })
      .from(wikiPages)
      .where(where)
      .orderBy(wikiPages.title)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(wikiPages).where(where),
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

// ===== PÁGINA COMPLETA =====
app.get('/:slug', async (c) => {
  const authUser = await verifyToken(c, c.env);
  const db = await createDb(c.env);
  const { slug } = c.req.param();

  const row = await db
    .select()
    .from(wikiPages)
    .where(
      and(
        eq(wikiPages.slug, slug),
        eq(wikiPages.isPublished, true),
        eq(wikiPages.isPublic, true),
        isNull(wikiPages.deletedAt),
      ),
    )
    .limit(1);

  if (!row.length) return c.json({ error: 'Página não encontrada' }, 404);

  // Incrementa viewCount (fire-and-forget, não bloqueia response)
  c.executionCtx.waitUntil(
    db
      .update(wikiPages)
      .set({ viewCount: sql`${wikiPages.viewCount} + 1` })
      .where(eq(wikiPages.id, row[0].id)),
  );

  return c.json({ data: row[0] });
});

// ===== SUB-PÁGINAS =====
app.get('/:slug/children', async (c) => {
  const authUser = await verifyToken(c, c.env);
  const db = await createDb(c.env);
  const { slug } = c.req.param();

  const parent = await db
    .select({ id: wikiPages.id })
    .from(wikiPages)
    .where(and(eq(wikiPages.slug, slug), isNull(wikiPages.deletedAt)))
    .limit(1);

  if (!parent.length) return c.json({ error: 'Página não encontrada' }, 404);

  const children = await db
    .select({
      id: wikiPages.id,
      slug: wikiPages.slug,
      title: wikiPages.title,
      icon: wikiPages.icon,
      viewCount: wikiPages.viewCount,
      updatedAt: wikiPages.updatedAt,
    })
    .from(wikiPages)
    .where(
      and(
        eq(wikiPages.parentId, parent[0].id),
        eq(wikiPages.isPublished, true),
        eq(wikiPages.isPublic, true),
        isNull(wikiPages.deletedAt),
      ),
    )
    .orderBy(wikiPages.title);

  return c.json({ data: children });
});

// ===== HISTÓRICO DE VERSÕES (auth obrigatório) =====
app.get('/:slug/versions', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createDb(c.env);
  const { slug } = c.req.param();

  const page = await db
    .select({ id: wikiPages.id })
    .from(wikiPages)
    .where(and(eq(wikiPages.slug, slug), isNull(wikiPages.deletedAt)))
    .limit(1);

  if (!page.length) return c.json({ error: 'Página não encontrada' }, 404);

  const versions = await db
    .select()
    .from(wikiPageVersions)
    .where(eq(wikiPageVersions.pageId, page[0].id))
    .orderBy(sql`${wikiPageVersions.version} DESC`)
    .limit(50);

  return c.json({ data: versions });
});

// ===== LISTA PÁGINAS DA ORGANIZAÇÃO (auth required) =====
app.get('/org/list', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createDb(c.env);
  const { q, category } = c.req.query();

  const conditions = [
    eq(wikiPages.isPublished, true),
    isNull(wikiPages.deletedAt),
  ];

  if (user.organizationId) {
    conditions.push(eq(wikiPages.organizationId, user.organizationId));
  }
  if (q) conditions.push(ilike(wikiPages.title, `%${q}%`));
  if (category) conditions.push(eq(wikiPages.category, category));

  const rows = await db
    .select()
    .from(wikiPages)
    .where(and(...conditions))
    .orderBy(sql`${wikiPages.updatedAt} DESC`);

  return c.json({ data: rows });
});

// ===== BUSCAR PÁGINA POR ID =====
app.get('/by-id/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const db = await createDb(c.env);

  const rows = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.id, id), isNull(wikiPages.deletedAt)))
    .limit(1);

  if (!rows.length) return c.json({ error: 'Página não encontrada' }, 404);
  return c.json({ data: rows[0] });
});

// ===== BULK UPDATE TRIAGE ORDERING =====
app.patch('/triage', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createDb(c.env);
  const { updates } = await c.req.json() as {
    updates: Array<{ id: string; triage_order?: number; tags?: string[]; category?: string }>;
  };

  await Promise.all(updates.map(({ id, ...fields }) =>
    db.update(wikiPages)
      .set({
        ...(fields.category !== undefined && { category: fields.category }),
        ...(fields.tags !== undefined && { tags: fields.tags }),
        updatedBy: user.uid,
        updatedAt: new Date(),
      })
      .where(eq(wikiPages.id, id))
  ));

  return c.json({ ok: true });
});

// ===== CRIAR PÁGINA =====
app.post('/', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');
  const body = await c.req.json();
  const { comment, ...pageData } = body;

  // Gera slug único a partir do título se não enviado
  if (!pageData.slug && pageData.title) {
    const base = String(pageData.title)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
    pageData.slug = `${base}-${Date.now()}`;
  }

  const [row] = await db
    .insert(wikiPages)
    .values({
      ...pageData,
      organizationId: user.organizationId,
      createdBy: user.uid,
      version: 1,
    })
    .returning();

  // Save first version
  await db.insert(wikiPageVersions).values({
    pageId: row.id,
    title: row.title,
    content: row.content || '',
    htmlContent: row.htmlContent,
    version: 1,
    comment: comment || 'Página criada',
    createdBy: user.uid,
  });

  return c.json({ data: row });
});

// ===== ATUALIZAR PÁGINA =====
app.put('/:slug', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const user = c.get('user');
  const { slug } = c.req.param();
  const body = await c.req.json();
  const { comment, ...pageData } = body;

  delete pageData.id;
  delete pageData.createdBy;
  delete pageData.createdAt;
  delete pageData.version;
  delete pageData.viewCount;

  // Primeiro busca a versão atual
  const [currentPage] = await db
    .select({ id: wikiPages.id, version: wikiPages.version })
    .from(wikiPages)
    .where(and(eq(wikiPages.slug, slug), isNull(wikiPages.deletedAt)))
    .limit(1);

  if (!currentPage) return c.json({ error: 'Página não encontrada' }, 404);

  const nextVersion = currentPage.version + 1;

  const [updatedPage] = await db
    .update(wikiPages)
    .set({
      ...pageData,
      version: nextVersion,
      updatedBy: user.uid,
      updatedAt: new Date(),
    })
    .where(eq(wikiPages.id, currentPage.id))
    .returning();

  // Salva o histórico
  await db.insert(wikiPageVersions).values({
    pageId: updatedPage.id,
    title: updatedPage.title,
    content: updatedPage.content || '',
    htmlContent: updatedPage.htmlContent,
    version: nextVersion,
    comment: comment || 'Página atualizada',
    createdBy: user.uid,
  });

  return c.json({ data: updatedPage });
});

// ===== DELETAR PÁGINA (soft delete) =====
app.delete('/:slug', requireAuth, async (c) => {
  const db = await createDb(c.env);
  const { slug } = c.req.param();

  const [row] = await db
    .update(wikiPages)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(wikiPages.slug, slug))
    .returning();

  if (!row) return c.json({ error: 'Página não encontrada' }, 404);

  return c.json({ ok: true });
});

// ===== COMENTÁRIOS =====
app.get('/:pageId/comments', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const result = await db.query(
    `SELECT * FROM wiki_comments WHERE page_id = $1 AND organization_id = $2 AND deleted_at IS NULL ORDER BY created_at ASC`,
    [c.req.param('pageId'), user.organizationId]
  );
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/:pageId/comments', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  const body = await c.req.json();
  const result = await db.query(
    `INSERT INTO wiki_comments (organization_id, page_id, parent_comment_id, content, created_by, block_id, selection_text, selection_start, selection_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [user.organizationId, c.req.param('pageId'), body.parent_comment_id ?? null, body.content,
     user.uid, body.block_id ?? null, body.selection_text ?? null, body.selection_start ?? null, body.selection_end ?? null]
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch('/comments/:id/resolve', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);
  await db.query(
    `UPDATE wiki_comments SET resolved = TRUE, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
    [c.req.param('id'), user.organizationId]
  );
  return c.json({ ok: true });
});

export { app as wikiRoutes };
