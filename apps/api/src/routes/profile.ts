import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createDb, createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  
  const fallbackProfile = {
    id: user.uid,
    user_id: user.uid,
    email: user.email ?? null,
    full_name: user.email?.split('@')[0] ?? 'Usuário',
    role: user.role ?? 'admin',
    organization_id: user.organizationId,
    email_verified: false,
  };

  try {
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, user.uid)
    });

    if (!profile) return c.json({ data: fallbackProfile });

    return c.json({ 
      data: {
        id: profile.id,
        user_id: profile.userId,
        email: profile.email,
        full_name: profile.fullName,
        role: profile.role,
        organization_id: profile.organizationId
      }
    });
  } catch (error) {
    console.error('[Profile/Me] Drizzle error:', error);
    return c.json({ data: fallbackProfile });
  }
});

app.get('/therapists', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  try {
    const therapists = await db.query.profiles.findMany({
      where: (profiles, { and, eq, inArray }) => and(
        eq(profiles.organizationId, user.organizationId),
        inArray(profiles.role, ['admin', 'fisioterapeuta'])
      ),
      columns: {
        id: true,
        fullName: true
      }
    });

    return c.json({ 
      data: therapists.map(t => ({ id: t.id, name: t.fullName })) 
    });
  } catch (error) {
    console.error('[Profile/Therapists] Drizzle error:', error);
    return c.json({ data: [] });
  }
});

app.put('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const payload: Record<string, unknown> = await c.req
    .json<Record<string, unknown>>()
    .catch(() => ({} as Record<string, unknown>));

  const hasFullName = typeof payload.full_name === 'string';
  const hasBirthDate = Object.prototype.hasOwnProperty.call(payload, 'birth_date');

  if (!hasFullName && !hasBirthDate) {
    return c.json({ error: 'Nenhum campo suportado enviado para atualizacao.' }, 400);
  }

  const fullName = hasFullName ? String(payload.full_name).trim() : null;
  const birthDateValue =
    hasBirthDate && typeof payload.birth_date === 'string' && payload.birth_date.trim()
      ? String(payload.birth_date).trim()
      : null;

  try {
    const existing = await pool.query(
      `
        SELECT id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        FROM profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.uid],
    );

    const query = existing.rows.length > 0
      ? `
          UPDATE profiles
          SET
            full_name = CASE WHEN $1::boolean THEN $2 ELSE full_name END,
            birth_date = CASE WHEN $3::boolean THEN $4::date ELSE birth_date END,
            updated_at = NOW()
          WHERE user_id = $5
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        `
      : `
          INSERT INTO profiles (
            user_id,
            email,
            full_name,
            role,
            organization_id,
            birth_date,
            created_at,
            updated_at
          )
          VALUES ($5, $6, $7, $8, $9, $10::date, NOW(), NOW())
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        `;

    const params = existing.rows.length > 0
      ? [hasFullName, fullName, hasBirthDate, birthDateValue, user.uid]
      : [
          hasFullName,
          fullName,
          hasBirthDate,
          birthDateValue,
          user.uid,
          user.email ?? null,
          fullName || user.email?.split('@')[0] || 'Usuário',
          user.role ?? 'admin',
          user.organizationId,
          birthDateValue,
        ];

    const result = await pool.query(query, params);
    const row = result.rows[0];

    return c.json({
      data: {
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        organization_id: row.organization_id,
        birth_date: row.birth_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    console.error('[Profile/Update] error:', error);
    return c.json({ error: 'Falha ao atualizar perfil.' }, 500);
  }
});

export { app as profileRoutes };
