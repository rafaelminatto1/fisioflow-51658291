/**
 * Admin Route: POST /api/admin/seed-templates
 *
 * Executa o seed dos System_Templates pré-cadastrados.
 * Protegido por role `admin`. Idempotente — pode ser chamado múltiplas vezes.
 */
import { Hono } from 'hono';
import { createDb } from '../../lib/db';
import { requireAuth, type AuthVariables } from '../../lib/auth';
import type { Env } from '../../types/env';
import { seedExerciseTemplates } from '../../seed/exercise-templates';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');

  if (user.role !== 'admin' && user.role !== 'owner') {
    return c.json({ success: false, error: 'Acesso negado: role admin necessário' }, 403);
  }

  try {
    const db = createDb(c.env);
    const inserted = await seedExerciseTemplates(db);

    return c.json({ success: true, inserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[admin/seed-templates] Error:', message);
    return c.json({ success: false, error: message }, 500);
  }
});

export { app as adminSeedTemplatesRoutes };
