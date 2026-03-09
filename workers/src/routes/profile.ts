import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [table, column],
  );
  return result.rows.length > 0;
}

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

app.get('/therapists', requireAuth, async (c) => {
  const user = c.get('user');
  const fallback = [
    {
      id: user.uid,
      name: user.email?.split('@')[0] ?? 'Usuário',
      crefito: undefined as string | undefined,
    },
  ];

  if (!(await hasProfilesTable(c.env))) {
    return c.json({ data: fallback });
  }

  const pool = createPool(c.env);
  try {
    const [hasOrganizationId, hasRole, hasIsActive, hasCrefito] = await Promise.all([
      hasColumn(pool, 'profiles', 'organization_id'),
      hasColumn(pool, 'profiles', 'role'),
      hasColumn(pool, 'profiles', 'is_active'),
      hasColumn(pool, 'profiles', 'crefito'),
    ]);

    const params: unknown[] = [];
    const where: string[] = [];

    if (hasOrganizationId) {
      params.push(user.organizationId);
      where.push(`organization_id = $${params.length}`);
    }
    if (hasRole) {
      where.push(`role IN ('admin', 'fisioterapeuta')`);
    }
    if (hasIsActive) {
      where.push(`is_active = true`);
    }

    const crefitoSelect = hasCrefito ? 'crefito' : 'NULL::text AS crefito';
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(user_id, ''), id::text) AS id,
        full_name,
        email,
        ${crefitoSelect}
      FROM profiles
      ${whereClause}
      ORDER BY full_name ASC NULLS LAST, email ASC NULLS LAST
      `,
      params,
    );

    const data = result.rows.map((row: { id: string; full_name?: string | null; email?: string | null; crefito?: string | null }) => ({
      id: row.id,
      name: row.full_name || row.email?.split('@')[0] || 'Sem nome',
      crefito: row.crefito ?? undefined,
    }));

    return c.json({ data: data.length ? data : fallback });
  } catch (error) {
    console.error('[profile/therapists] fallback due to query error:', error);
    return c.json({ data: fallback });
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
    const supportsMfaEnabled = await hasColumn(pool, 'profiles', 'mfa_enabled');
    const supportsMfaMethod = await hasColumn(pool, 'profiles', 'mfa_method');
    const mfaEnabled = body.mfa_enabled;
    const mfaMethod = body.mfa_method;

    const extraAssignments: string[] = [];
    const extraValues: unknown[] = [];
    if (supportsMfaEnabled && mfaEnabled !== undefined) {
      extraValues.push(Boolean(mfaEnabled));
      extraAssignments.push(`mfa_enabled = $${5 + extraValues.length}`);
    }
    if (supportsMfaMethod && body.mfa_method !== undefined) {
      extraValues.push(typeof mfaMethod === 'string' ? mfaMethod : null);
      extraAssignments.push(`mfa_method = $${5 + extraValues.length}`);
    }

    const updateResult = await pool.query(
      `
      UPDATE profiles
      SET
        email = $2,
        full_name = $3,
        role = $4,
        organization_id = $5,
        ${extraAssignments.length ? `${extraAssignments.join(', ')},` : ''}
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
      [user.uid, email, fullName, role, organizationId, ...extraValues],
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

    const insertColumns = [
      'user_id',
      'email',
      'full_name',
      'role',
      'organization_id',
      'onboarding_completed',
      'is_active',
      'created_at',
      'updated_at',
    ];
    const insertValues: unknown[] = [user.uid, email, fullName, role, organizationId, false, true];
    if (supportsMfaEnabled) {
      insertColumns.splice(5, 0, 'mfa_enabled');
      insertValues.splice(5, 0, Boolean(mfaEnabled));
    }
    if (supportsMfaMethod) {
      insertColumns.splice(supportsMfaEnabled ? 6 : 5, 0, 'mfa_method');
      insertValues.splice(supportsMfaEnabled ? 6 : 5, 0, typeof mfaMethod === 'string' ? mfaMethod : null);
    }
    insertValues.push(new Date().toISOString(), new Date().toISOString());

    const insertResult = await pool.query(
      `
      INSERT INTO profiles (${insertColumns.join(', ')})
      VALUES (${insertValues.map((_, index) => `$${index + 1}`).join(', ')})
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
      insertValues,
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
