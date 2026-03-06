import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasProfilesTable(env: Env): Promise<boolean> {
  const pool = createPool(env);
  try {
    const result = await pool.query("SELECT to_regclass('public.profiles')::text AS table_name");
    return Boolean(result.rows[0]?.table_name);
  } finally {
    await pool.end();
  }
}

app.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const fallbackProfile = {
    id: user.uid,
    user_id: user.uid,
    email: user.email ?? null,
    full_name: user.email?.split('@')[0] ?? 'Usuário',
    role: user.role ?? 'authenticated',
    organization_id: user.organizationId,
    organizationId: user.organizationId,
    email_verified: user.emailVerified,
  };

  if (!(await hasProfilesTable(c.env))) {
    return c.json({ data: fallbackProfile });
  }

  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        email,
        full_name,
        role,
        organization_id,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
      FROM profiles
      WHERE user_id = $1 OR id::text = $1
      LIMIT 1
      `,
      [user.uid],
    );

    const row = result.rows[0];
    if (!row) {
      return c.json({ data: fallbackProfile });
    }

    return c.json({
      data: {
        ...row,
        organizationId: row.organization_id ?? user.organizationId,
        email_verified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('[profile/me] fallback due to query error:', error);
    return c.json({ data: fallbackProfile });
  } finally {
    await pool.end();
  }
});

app.put('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fallbackProfile = {
    id: user.uid,
    user_id: user.uid,
    email: typeof body.email === 'string' ? body.email : user.email ?? null,
    full_name:
      typeof body.full_name === 'string'
        ? body.full_name
        : (typeof body.fullName === 'string' ? body.fullName : user.email?.split('@')[0] ?? 'Usuário'),
    role: typeof body.role === 'string' ? body.role : user.role ?? 'authenticated',
    organization_id:
      typeof body.organization_id === 'string'
        ? body.organization_id
        : (typeof body.organizationId === 'string' ? body.organizationId : user.organizationId),
    organizationId:
      typeof body.organizationId === 'string'
        ? body.organizationId
        : (typeof body.organization_id === 'string' ? body.organization_id : user.organizationId),
    email_verified: user.emailVerified,
  };

  if (!(await hasProfilesTable(c.env))) {
    return c.json({ data: fallbackProfile });
  }

  const pool = createPool(c.env);
  try {
    const email = typeof body.email === 'string' ? body.email : user.email ?? null;
    const fullName =
      typeof body.full_name === 'string'
        ? body.full_name
        : (typeof body.fullName === 'string' ? body.fullName : user.email?.split('@')[0] ?? 'Usuário');
    const role = typeof body.role === 'string' ? body.role : user.role ?? 'authenticated';
    const organizationId =
      typeof body.organization_id === 'string'
        ? body.organization_id
        : (typeof body.organizationId === 'string' ? body.organizationId : user.organizationId);

    const updateResult = await pool.query(
      `
      UPDATE profiles
      SET
        email = $2,
        full_name = $3,
        role = $4,
        organization_id = $5,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        id,
        user_id,
        email,
        full_name,
        role,
        organization_id,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
      `,
      [user.uid, email, fullName, role, organizationId],
    );

    if (updateResult.rows[0]) {
      return c.json({
        data: {
          ...updateResult.rows[0],
          organizationId: updateResult.rows[0].organization_id,
          email_verified: user.emailVerified,
        },
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO profiles (
        user_id,
        email,
        full_name,
        role,
        organization_id,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, false, true, NOW(), NOW())
      RETURNING
        id,
        user_id,
        email,
        full_name,
        role,
        organization_id,
        onboarding_completed,
        is_active,
        created_at,
        updated_at
      `,
      [user.uid, email, fullName, role, organizationId],
    );

    return c.json({
      data: {
        ...insertResult.rows[0],
        organizationId: insertResult.rows[0].organization_id,
        email_verified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('[profile/me PUT] fallback due to query error:', error);
    return c.json({ data: fallbackProfile });
  } finally {
    await pool.end();
  }
});

export { app as profileRoutes };
