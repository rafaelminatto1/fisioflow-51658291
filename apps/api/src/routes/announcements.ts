import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { broadcastToOrg } from '../lib/realtime';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// GET: Listar comunicados e políticas
app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { type = 'all', limit = '50' } = c.req.query();

  try {
    const conditions = ['a.organization_id = $1'];
    const params: unknown[] = [user.organizationId];

    if (type !== 'all') {
      params.push(type);
      conditions.push(`a.type = $${params.length}`);
    }

    params.push(Number(limit));

    // Se o usuário não for admin, precisamos saber se ele já leu
    
    
    const query = `
      SELECT 
        a.*,
        EXISTS (
          SELECT 1 FROM announcement_reads ar 
          WHERE ar.announcement_id = a.id AND ar.user_id = '${user.uid}'
        ) as is_read
      FROM announcements a
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${params.length}
    `;

    const result = await pool.query(query, params);
    
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Announcements] Error fetching:', error);
    return c.json({ error: 'Erro ao buscar comunicados' }, 500);
  }
});

// POST: Criar novo comunicado (Apenas Admin)
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const isAdmin = user.role === 'admin' || user.role === 'owner';
  
  if (!isAdmin) {
    return c.json({ error: 'Não autorizado' }, 403);
  }

  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  if (!body.title || !body.content) {
    return c.json({ error: 'Título e conteúdo são obrigatórios' }, 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO announcements (organization_id, title, content, is_mandatory, type, media_url, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        user.organizationId,
        String(body.title),
        String(body.content),
        Boolean(body.isMandatory ?? false),
        String(body.type ?? 'announcement'),
        body.mediaUrl ? String(body.mediaUrl) : null,
        user.uid,
      ],
    );

    const row = result.rows[0];

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'ANNOUNCEMENT_RECEIVED',
      payload: { 
        id: row.id,
        title: row.title,
        type: row.type,
        timestamp: row.created_at
      }
    });

    // TODO: Implementar lógica de disparo Push em massa aqui
    // Ex: buscar todos FCM Tokens da org e disparar payload via Firebase Admin/API

    return c.json({ data: row }, 201);
  } catch (error) {
    console.error('[Announcements] Error creating:', error);
    return c.json({ error: 'Erro ao criar comunicado' }, 500);
  }
});

// POST: Marcar como lido
app.post('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  try {
    const result = await pool.query(
      `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [id, user.uid],
    );

    return c.json({ ok: true });
  } catch (error) {
    console.error('[Announcements] Error marking as read:', error);
    return c.json({ error: 'Erro ao registrar leitura' }, 500);
  }
});

// GET: Estatísticas de conformidade
app.get('/compliance', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);

  try {
    const result = await pool.query(
      `
        SELECT 
          a.id, a.title, a.type,
          COUNT(ar.id) as read_count
        FROM announcements a
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
        WHERE a.organization_id = $1 AND a.is_mandatory = true
        GROUP BY a.id, a.title, a.type
      `,
      [user.organizationId]
    );

    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Announcements] Error fetching compliance stats:', error);
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500);
  }
});

export { app as announcementsRoutes };
