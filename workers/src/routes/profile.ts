import { Hono } from 'hono';
import { eq, and, inArray } from 'drizzle-orm';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createDb } from '../lib/db';

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

export { app as profileRoutes };
