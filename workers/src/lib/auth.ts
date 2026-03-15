/**
 * Neon Auth JWT Verification para Cloudflare Workers (Powered by Better Auth)
 *
 * O Worker valida JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

let jwksCache: any = null;

function getJwks(url: string) {
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
export async function verifyToken(c: any, env: Env): Promise<AuthUser | null> {
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
  
  const jwksUrl = env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    console.error('[Auth] NEON_AUTH_JWKS_URL not configured');
    return null;
  }

  try {
    const jwks = getJwks(jwksUrl);
    
    // Validação Robusta:
    // Decodifica primeiro para logar debug se necessário
    const decoded = decodeJwt(token);
    
    // Verifica a assinatura via JWKS real (Segurança total)
    // Ignoramos AUDIENCE e ISSUER estritos para suportar múltiplos domínios (Web/Mobile/Custom)
    const { payload } = await jwtVerify(token, jwks, {
      clockTolerance: '10m' // Tolerância alta para evitar erros de sincronismo de relógio
    });

    const userId = (payload.sub as string) || (payload as any).userId || (payload as any).id;
    if (!userId) {
      console.error('[Auth] Token verified but userId missing', payload);
      return null;
    }

    return {
      uid: userId,
      email: payload.email as string,
      organizationId: (payload as any).orgId || (payload as any).organizationId || DEFAULT_ORG_ID,
      role: (payload as any).role || 'admin'
    };
  } catch (e) {
    console.error('[Auth Error] JWT verification failed:', e instanceof Error ? e.message : String(e));
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
