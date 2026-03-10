import { Hono } from 'hono';
import { createPool } from '../lib/db';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const pool = createPool(c.env);

  try {
    // No schema real, a tabela é 'profiles'
    const result = await pool.query(
      'SELECT id, email, full_name as name, role, organization_id FROM profiles WHERE email = $1 LIMIT 1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    return c.json({
      token: 'mock-session-token-neon-auth',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization_id
      }
    });
  } catch (error: any) {
    return c.json({ error: 'Erro no servidor', details: error.message }, 500);
  }
});

export { app as authRoutes };