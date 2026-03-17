import { Hono } from 'hono';
import { createPool } from '../lib/db';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const pool = await createPool(c.env);

  if (!email) {
    return c.json({ error: 'Email é obrigatório' }, 400);
  }

  try {
    // Busca usuário pelo email ou user_id na tabela profiles
    const result = await pool.query(
      `SELECT id, user_id, email, full_name as name, role, organization_id 
       FROM profiles 
       WHERE email = $1 OR user_id = $1
       LIMIT 1`,
      [email]
    );

    let user = result.rows[0];

    // Se não encontrou pelo user_id, tenta criar um perfil básico
    if (!user) {
      // Cria um perfil temporário para permitir login de desenvolvimento
      const createResult = await pool.query(
        `INSERT INTO profiles (id, user_id, email, full_name, role, organization_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $1, $2, 'admin', '00000000-0000-0000-0000-000000000001'::uuid, NOW(), NOW())
         RETURNING id, user_id, email, full_name as name, role, organization_id`,
        [email, email.split('@')[0] || 'Usuário']
      );
      user = createResult.rows[0];
    }

    // Gera um token simples (em produção, usar JWT real)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return c.json({
      token: token,
      user: {
        id: user.id,
        email: email,
        name: user.name,
        role: user.role || 'admin',
        organizationId: user.organization_id || '00000000-0000-0000-0000-000000000001'
      }
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error.message);
    return c.json({ error: 'Erro no servidor', details: error.message }, 500);
  }
});

app.post('/logout', async (c) => {
  // Logout é stateless - apenas retorna sucesso
  // O cliente deve remover o token localmente
  return c.json({ success: true });
});

export { app as authRoutes };
