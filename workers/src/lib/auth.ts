/**
 * Neon Auth JWT Verification para Cloudflare Workers
 *
 * O Worker valida exclusivamente JWTs do Neon Auth usando JWKS remoto.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

function normalizeOrgId(_payload: Record<string, unknown>): string {
  // Para clínica única, sempre retornamos o mesmo ID
  return DEFAULT_ORG_ID;
}

function normalizeRole(payload: Record<string, unknown>): string | undefined {
  const roleCandidates = [payload.role, payload.user_role];
  for (const candidate of roleCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

export interface AuthUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  organizationId: string;
  role?: string;
}

export type AuthVariables = { user: AuthUser };

/**
 * Extrai e verifica o token Bearer do header Authorization.
 * Retorna null se inválido ou ausente.
 */
export async function verifyToken(
  authHeader: string | undefined,
  env: Env,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const jwksUrl = env.NEON_AUTH_JWKS_URL;

  if (!jwksUrl) return null;

  try {
    // Aceita issuer explícito e issuer derivado da JWKS URL para evitar falhas por configuração parcial.
    // JWKS URL: https://host/path/.well-known/jwks.json -> issuer derivado: https://host/path
    const derivedIssuer = jwksUrl.replace('/.well-known/jwks.json', '');
    let rootIssuer = '';
    try {
      rootIssuer = new URL(derivedIssuer).origin;
    } catch {
      rootIssuer = '';
    }
    const issuerCandidates = Array.from(
      new Set(
        [env.NEON_AUTH_ISSUER, derivedIssuer, rootIssuer]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .flatMap((value) => [
            value.replace(/\/$/, ''),
            value.replace(/\/$/, '') + '/'
          ]),
      ),
    );

    if (issuerCandidates.length === 0) return null;

    let verifiedPayload: Awaited<ReturnType<typeof jwtVerify>>['payload'] | null = null;
    let lastError: Error | unknown | null = null;
    
    try {
      const jwks = createRemoteJWKSet(new URL(jwksUrl));
      // Verifica assinatura EdDSA e issuer (origin da URL do Neon Auth)
      const issuer = rootIssuer || derivedIssuer;
      const verified = await jwtVerify(token, jwks, issuer ? { issuer } : undefined);
      verifiedPayload = verified.payload;
    } catch (e) {
      lastError = e;
      console.error('[Auth] JWT Validation Failed:', e instanceof Error ? e.message : e);
    }

    if (!verifiedPayload) {
      console.error('[Auth] JWT Verification Failed. Header:', authHeader?.substring(0, 30), 'Error:', lastError instanceof Error ? lastError.message : lastError);
      return null;
    }

    const payload = verifiedPayload;
    const asRecord = payload as Record<string, unknown>;
    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!userId) return null;

    return {
      uid: userId,
      email: payload.email as string | undefined,
      emailVerified: (payload.email_verified as boolean) ?? false,
      organizationId: normalizeOrgId(asRecord),
      role: normalizeRole(asRecord),
    };
  } catch {
    return null;
  }
}

/**
 * Middleware Hono: requer autenticação Neon JWT válida.
 * Injeta o usuário no contexto: c.get('user')
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const user = await verifyToken(c.req.header('Authorization'), c.env);
  
  if (!user) {
    return c.json({ error: 'Não autorizado' }, 401);
  }
  
  c.set('user', user);
  return next();
};
