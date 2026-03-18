/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
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
    // Verificação temporária para tokens simples (32 caracteres)
    if (token.length < 50) {
      console.log('[Auth] Token simples detectado, usando fallback de validação');
      // Para tokens simples, fazer uma chamada ao /get-session para validar
      if (env.NEON_AUTH_URL) {
        try {
          const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json() as any;
            const userId = sessionData.user?.id || sessionData.session?.userId;
            if (userId) {
              console.log('[Auth] Sessão validada via /get-session');
              return {
                uid: userId,
                email: sessionData.user?.email,
                organizationId: sessionData.user?.organizationId || DEFAULT_ORG_ID,
                role: sessionData.user?.role || 'viewer'
              };
            }
          }
        } catch (e) {
          console.error('[Auth] Erro na validação de sessão:', e);
        }
      }
      // Se não conseguiu validar, retornar null
      console.error('[Auth] Token simples não pode ser validado');
      return null;
    }

    const jwks = getJwks(jwksUrl);
    
    // Validação Robusta:
    // Decodifica primeiro para logar debug se necessário
    const decoded = decodeJwt(token);
    
    // Verifica a assinatura via JWKS real (Segurança total)
    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      clockTolerance: '10m', // Tolerância para evitar erros de sincronismo de relógio
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
    // Fallback: validate as session token via Neon Auth /get-session
    if (env.NEON_AUTH_URL) {
      try {
        const sessionRes = await fetch(`${env.NEON_AUTH_URL}/get-session`, {
          headers: { 'Authorization': `Bearer ${token}` },
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
    // Retorna 401 com detalhes do erro para o frontend
    return c.json({ 
      error: 'Não autorizado', 
      code: 'UNAUTHORIZED',
      message: 'Sua sessão expirou ou o token é inválido. Por favor, faça login novamente.'
    }, 401);
  }
  c.set('user', user);
  await next();
};
