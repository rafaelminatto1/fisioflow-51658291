import { Hono } from 'hono';
import { createPool } from '../lib/db';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

async function forwardToNeonAuth(
  neonAuthUrl: string,
  path: string,
  method: string,
  body?: unknown,
  authHeader?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;
  return fetch(`${neonAuthUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function fetchUserProfile(pool: ReturnType<typeof createPool>, userId: string) {
  const result = await pool.query(
    `SELECT id, user_id, email, full_name as name, role, organization_id
     FROM profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

function extractSubFromJwt(token: string): string | null {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.sub || decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

// POST /api/auth/login
app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email e senha são obrigatórios' }, 400);
  }

  const neonAuthUrl = c.env.NEON_AUTH_URL;
  if (!neonAuthUrl) {
    return c.json({ error: 'Configuração de auth ausente no servidor' }, 500);
  }

  try {
    const neonRes = await forwardToNeonAuth(neonAuthUrl, '/sign-in/email', 'POST', { email, password });
    const neonData = await neonRes.json() as Record<string, any>;

    if (!neonRes.ok) {
      const status = neonRes.status === 401 ? 401 : neonRes.status === 400 ? 400 : 500;
      return c.json(
        { error: neonData.message || neonData.error || 'Credenciais inválidas' },
        status
      );
    }

    const token: string | null =
      neonData.token ||
      neonData.access_token ||
      neonRes.headers.get('set-auth-jwt') ||
      null;

    if (!token) {
      return c.json({ error: 'Token não recebido do servidor de autenticação' }, 500);
    }

    const userId = extractSubFromJwt(token);
    let userProfile: any = null;
    if (userId) {
      try {
        const pool = createPool(c.env);
        userProfile = await fetchUserProfile(pool, userId);
      } catch {
        // Profile fetch is optional — don't block login
      }
    }

    return c.json({
      token,
      user: {
        id: userProfile?.id || userId || neonData.user?.id || email,
        email: userProfile?.email || neonData.user?.email || email,
        name: userProfile?.name || neonData.user?.name || email.split('@')[0],
        role: userProfile?.role || neonData.user?.role || 'fisioterapeuta',
        organizationId:
          userProfile?.organization_id ||
          neonData.user?.organizationId ||
          '00000000-0000-0000-0000-000000000001',
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login proxy error:', error.message);
    return c.json({ error: 'Erro no servidor', details: error.message }, 500);
  }
});

// POST /api/auth/signup
app.post('/signup', async (c) => {
  const { email, password, name } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email e senha são obrigatórios' }, 400);
  }

  const neonAuthUrl = c.env.NEON_AUTH_URL;
  if (!neonAuthUrl) {
    return c.json({ error: 'Configuração de auth ausente no servidor' }, 500);
  }

  try {
    const neonRes = await forwardToNeonAuth(neonAuthUrl, '/sign-up/email', 'POST', { email, password, name });
    const neonData = await neonRes.json() as Record<string, any>;

    if (!neonRes.ok) {
      const status = neonRes.status === 409 ? 409 : neonRes.status === 400 ? 400 : 500;
      return c.json(
        { error: neonData.message || neonData.error || 'Erro ao criar conta' },
        status
      );
    }

    const token = neonData.token || neonData.access_token || neonRes.headers.get('set-auth-jwt');
    return c.json({ token, user: neonData.user || { email, name }, message: 'Conta criada com sucesso' });
  } catch (error: any) {
    console.error('[Auth] Signup proxy error:', error.message);
    return c.json({ error: 'Erro ao criar conta', details: error.message }, 500);
  }
});

// POST /api/auth/forgot-password
app.post('/forgot-password', async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: 'Email é obrigatório' }, 400);

  const neonAuthUrl = c.env.NEON_AUTH_URL;
  if (!neonAuthUrl) return c.json({ error: 'Configuração de auth ausente no servidor' }, 500);

  try {
    const neonRes = await forwardToNeonAuth(neonAuthUrl, '/forget-password', 'POST', { email });
    if (!neonRes.ok) {
      const neonData = await neonRes.json() as Record<string, any>;
      const statusFP = neonRes.status === 400 ? 400 : 500;
      return c.json(
        { error: neonData.message || 'Erro ao solicitar recuperação de senha' },
        statusFP
      );
    }
    return c.json({ success: true, message: 'Email de recuperação enviado' });
  } catch (error: any) {
    return c.json({ error: 'Erro ao processar solicitação', details: error.message }, 500);
  }
});

// POST /api/auth/reset-password
app.post('/reset-password', async (c) => {
  const { token, password } = await c.req.json();
  if (!token || !password) {
    return c.json({ error: 'Token e nova senha são obrigatórios' }, 400);
  }

  const neonAuthUrl = c.env.NEON_AUTH_URL;
  if (!neonAuthUrl) return c.json({ error: 'Configuração de auth ausente no servidor' }, 500);

  try {
    const neonRes = await forwardToNeonAuth(neonAuthUrl, '/reset-password', 'POST', { token, password });
    if (!neonRes.ok) {
      const neonData = await neonRes.json() as Record<string, any>;
      const statusRP = neonRes.status === 400 ? 400 : 500;
      return c.json(
        { error: neonData.message || 'Erro ao redefinir senha' },
        statusRP
      );
    }
    return c.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error: any) {
    return c.json({ error: 'Erro ao processar solicitação', details: error.message }, 500);
  }
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  const neonAuthUrl = c.env.NEON_AUTH_URL;

  if (neonAuthUrl && authHeader) {
    try {
      await forwardToNeonAuth(neonAuthUrl, '/sign-out', 'POST', {}, authHeader);
    } catch {
      // Best-effort: don't fail client logout if server-side revoke fails
    }
  }

  return c.json({ success: true });
});

// GET /api/auth/session
app.get('/session', async (c) => {
  const authHeader = c.req.header('Authorization');
  const neonAuthUrl = c.env.NEON_AUTH_URL;

  if (!neonAuthUrl) return c.json({ error: 'Configuração de auth ausente no servidor' }, 500);
  if (!authHeader) return c.json({ session: null }, 200);

  try {
    const neonRes = await fetch(`${neonAuthUrl}/get-session`, {
      headers: { Authorization: authHeader },
    });
    if (!neonRes.ok) return c.json({ session: null }, 200);
    const data = await neonRes.json();
    return c.json(data);
  } catch {
    return c.json({ error: 'Erro ao verificar sessão' }, 500);
  }
});

export { app as authRoutes };
