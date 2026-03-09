/**
 * Rotas: Wiki / Base de Conhecimento
 * GET /api/wiki               — lista páginas publicadas
 * GET /api/wiki/:slug         — página completa (incrementa viewCount)
 * GET /api/wiki/:slug/children — sub-páginas
 * GET /api/wiki/:slug/versions — histórico de versões (auth)
 */
import { Hono } from 'hono';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { createDb } from '../lib/db';
import { requireAuth, verifyToken, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { wikiPages, wikiPageVersions } from '../../../src/server/db/schema/wiki';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== LISTA DE PÁGINAS =====
app.get('/', async (c) => {
  const authUser = await verifyToken(c.req.header('Authorization'), c.env);
  const db = createDb(c.env, authUser?.organizationId);

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
  const authUser = await verifyToken(c.req.header('Authorization'), c.env);
  const db = createDb(c.env, authUser?.organizationId);
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
  const authUser = await verifyToken(c.req.header('Authorization'), c.env);
  const db = createDb(c.env, authUser?.organizationId);
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
  const db = createDb(c.env, user.organizationId);
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
  const db = createDb(c.env, user.organizationId);
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
  const db = createDb(c.env, user.organizationId);

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
  const db = createDb(c.env, user.organizationId);
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
  const db = createDb(c.env);
  const user = c.get('user');
  const body = await c.req.json();
  const { comment, ...pageData } = body;

  const [row] = await db
    .insert(wikiPages)
    .values({
      ...pageData,
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
  const db = createDb(c.env);
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
  const db = createDb(c.env);
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

export { app as wikiRoutes };
