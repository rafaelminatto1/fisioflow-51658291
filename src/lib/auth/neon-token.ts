import { authClient, isNeonAuthEnabled } from '@/integrations/neon/auth';

interface GetNeonAccessTokenOptions {
  forceSessionReload?: boolean;
}

const JWT_SEGMENTS = 3;

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === JWT_SEGMENTS;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds;
}

/** In-memory cache so we don't call /get-session on every request */
let cachedJwt: string | null = null;
let cachedJwtExpiry = 0;

function getCachedJwt(): string | null {
  if (!cachedJwt) return null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Keep a 30-second buffer
  if (cachedJwtExpiry > 0 && nowSeconds >= cachedJwtExpiry - 30) return null;
  return cachedJwt;
}

function setCachedJwt(token: string): void {
  cachedJwt = token;
  const payload = decodeJwtPayload(token);
  cachedJwtExpiry = payload?.exp ?? 0;
}

/**
 * Fetches the real JWT from the Neon Auth `/get-session` endpoint.
 * Neon Auth puts the JWT in the `set-auth-jwt` response header (not the JSON body).
 * The JSON body only contains an opaque session token.
 */
async function getJwtFromSessionEndpoint(): Promise<string | null> {
  const authBase = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
  if (!authBase) return null;

  try {
    const response = await fetch(`${authBase.replace(/\/$/, '')}/get-session`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) return null;

    // JWT is in the set-auth-jwt header (as confirmed from Neon Auth response analysis)
    const headerCandidates = [
      response.headers.get('set-auth-jwt'),
      response.headers.get('x-auth-jwt'),
      response.headers.get('authorization')?.replace(/^Bearer\s+/i, ''),
    ];

    for (const headerToken of headerCandidates) {
      if (typeof headerToken === 'string' && looksLikeJwt(headerToken.trim())) {
        return headerToken.trim();
      }
    }
  } catch {
    // Network error, fail silently
  }

  return null;
}

export async function getNeonAccessToken(options: GetNeonAccessTokenOptions = {}): Promise<string> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não está habilitado (VITE_NEON_AUTH_URL ausente).');
  }

  // 1. Return from memory cache if still valid
  if (!options.forceSessionReload) {
    const cached = getCachedJwt();
    if (cached) return cached;
  }

  // 2. Fetch the real JWT from Neon Auth's /get-session (set-auth-jwt header)
  const jwt = await getJwtFromSessionEndpoint();

  if (!jwt) {
    throw new Error('Token JWT do Neon Auth indisponível. Certifique-se de estar logado.');
  }

  if (!looksLikeJwt(jwt)) {
    throw new Error('Token do Neon Auth em formato inválido (não é um JWT).');
  }

  if (isExpired(jwt)) {
    throw new Error('Token JWT do Neon Auth expirado. Faça login novamente.');
  }

  // Cache for subsequent calls
  setCachedJwt(jwt);
  return jwt;
}

/** Call this after successful login to clear the cache and force a fresh JWT fetch */
export function invalidateNeonTokenCache(): void {
  cachedJwt = null;
  cachedJwtExpiry = 0;
}

// Re-export for backwards compatibility (some hooks call getSession via authClient directly)
export { authClient };
