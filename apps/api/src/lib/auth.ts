/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler, Context } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { createPool } from './db';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) jwksCache = createRemoteJWKSet(new URL(url));
  return jwksCache;
}

export interface AuthUser {
  uid: string;
  email?: string;
  organizationId: string;
  role?: string;
}

export type AuthVariables = { user: AuthUser };

/**
 * Extrai e verifica o token Neon Auth.
 * Aceita Header Authorization ou Cookies do Better Auth.
 */
export async function verifyToken<E extends { Bindings: Env }>(c: Context<E>, env: Env): Promise<AuthUser | null> {
  // 1. Tenta obter o token (header, query param para WebSocket, ou cookie)
  let token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    token = c.req.query?.('token') ||
            getCookie(c, 'better-auth.session-token') ||
            getCookie(c, 'auth_session') ||
            getCookie(c, '__session');
  }

  if (!token) {
    console.log('[Auth] No token found in headers or cookies');
    return null;
  }

  // 2. Valida como JWT do Neon Auth
  const jwksUrl = env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    console.error('[Auth] NEON_AUTH_JWKS_URL not configured');
    return null;
  }

  try {
    // Verificacao temporaria para tokens simples (32 caracteres)
    if (token.length < 50) {
      console.log('[Auth] Token simples detectado, usando fallback de validacao');
      
      // Fallback A: Chamada ao /get-session do Neon Auth (Better Auth)
      // Nota: Better Auth precisa do cookie para o /get-session funcionar corretamente
      if (env.NEON_AUTH_URL) {
        try {
          const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Cookie': `better-auth.session-token=${token}` 
            }
          });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json() as any;
            const userId = sessionData.user?.id || sessionData.session?.userId;
            if (userId) {
              console.log('[Auth] Sessao validada via /get-session');
              return {
                uid: userId,
                email: sessionData.user?.email,
                organizationId: sessionData.user?.organizationId || DEFAULT_ORG_ID,
                role: sessionData.user?.role || 'viewer'
              };
            }
          }
        } catch (e) {
          console.error('[Auth] Erro na validacao via fetch:', e);
        }
      }

      // Fallback B: Consulta direta ao banco de dados (mais robusto)
      try {
        const pool = createPool(env);
        const res = await (pool as any).query(`
          SELECT s."userId", u.email, u.role, p.organization_id 
          FROM neon_auth.session s
          JOIN neon_auth."user" u ON s."userId" = u.id
          LEFT JOIN public.profiles p ON s."userId"::text = p.user_id
          WHERE s.token = $1 AND s."expiresAt" > now()
          LIMIT 1
        `, [token]);

        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          console.log('[Auth] Sessao validada via DB para userId:', row.userId);
          return {
            uid: row.userId,
            email: row.email,
            organizationId: row.organization_id || DEFAULT_ORG_ID,
            role: row.role || 'viewer'
          };
        }
      } catch (dbErr) {
        console.error('[Auth] Erro na validacao via DB:', dbErr);
      }

      console.error('[Auth] Token simples nao pode ser validado');
      return null;
    }

    const jwks = getJwks(jwksUrl);
    
    // Validacao Robusta:
    
    
    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      clockTolerance: '10m',
    };
    if (env.NEON_AUTH_ISSUER) {
      verifyOptions.issuer = env.NEON_AUTH_ISSUER;
    }
    const { payload } = await jwtVerify(token, jwks, verifyOptions);

    const userId = (payload.sub as string) || (payload as any).userId || (payload as any).id;
    if (!userId) {
      console.error('[Auth] Token verified but userId missing', payload);
      return null;
    }

    return {
      uid: userId,
      email: payload.email as string,
      organizationId: (payload as any).orgId || (payload as any).organizationId || DEFAULT_ORG_ID,
      role: (payload as any).role || 'viewer'
    };
  } catch (e) {
    console.error('[Auth Error] JWT verification failed:', e instanceof Error ? e.message : String(e));
    
    if (env.NEON_AUTH_URL) {
      try {
        const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cookie': `better-auth.session-token=${token}` 
          },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json() as any;
          const userId = sessionData.user?.id || sessionData.session?.userId;
          if (userId) {
            return {
              uid: userId,
              email: sessionData.user?.email,
              organizationId: sessionData.user?.organizationId || DEFAULT_ORG_ID,
              role: sessionData.user?.role || 'viewer',
            };
          }
        }
      } catch (sessionErr) {
        console.error('[Auth Error] Session fallback failed:', sessionErr instanceof Error ? sessionErr.message : String(sessionErr));
      }
    }
    return null;
  }
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthUser } }> = async (c, next) => {
  const user = await verifyToken(c, c.env);
  if (!user) {
    return c.json({ 
      error: 'Nao autorizado', 
      code: 'UNAUTHORIZED',
      message: 'Sua sessao expirou ou o token e invalido. Por favor, faca login novamente.'
    }, 401);
  }
  c.set('user', user);
  await next();
};
