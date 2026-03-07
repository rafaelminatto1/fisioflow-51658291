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
 * Fetches the real JWT from the Neon Auth session.
 * The SDK intercepts the `set-auth-jwt` response header from /get-session
 * and stores it in data.session.token — we use that instead of a raw fetch
 * to avoid CORS header-exposure issues.
 */
async function getJwtFromSessionEndpoint(): Promise<string | null> {
  try {
    const { data } = await authClient.getSession();
    const token = data?.session?.token;
    if (typeof token === 'string' && looksLikeJwt(token)) {
      return token;
    }
    return null;
  } catch {
    return null;
  }
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
