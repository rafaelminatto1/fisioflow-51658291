import { authClient, isNeonAuthEnabled } from '@/integrations/neon/auth';
import { getNeonAuthUrl } from '@/lib/config/neon';

const JWT_SEGMENTS = 3;
const SESSION_FETCH_TIMEOUT_MS = 5000;

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

/** In-memory cache — evita chamar /token a cada request */
let cachedJwt: string | null = null;
let cachedJwtExpiry = 0;

function getCachedJwt(): string | null {
  if (!cachedJwt) return null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Buffer de 30 segundos antes do vencimento
  if (cachedJwtExpiry > 0 && nowSeconds >= cachedJwtExpiry - 30) return null;
  return cachedJwt;
}

function setCachedJwt(token: string): void {
  cachedJwt = token;
  const payload = decodeJwtPayload(token);
  cachedJwtExpiry = payload?.exp ?? 0;
}

async function fetchJwtFromSdk(): Promise<string | null> {
  // 1. Tenta o método recomendado .token() (disponível no SDK do Neon Auth / Better Auth)
  try {
    // NOTA: authClient é um Proxy. Não utilize `.call(authClient)` aqui, 
    // pois o Proxy intercepta chamadas internas (como fetchOptions) 
    // e constrói caminhos de API inválidos (ex: /fetch-options/method/to-upper-case).
    if (typeof (authClient as any).token === 'function') {
      const { data } = await (authClient as any).token();
      const token = data?.token;
      if (typeof token === 'string' && looksLikeJwt(token)) return token;
    }
  } catch (err) {
    // Silently continue to next fallback
  }

  // 2. Tenta obter da sessão ativa
  try {
    const { data } = await authClient.getSession();
    const token =
      (data as any)?.session?.token ||
      (data as any)?.token ||
      (data as any)?.session?.access_token;
    if (typeof token === 'string' && looksLikeJwt(token)) return token;
  } catch {
    // Fallback below
  }

  return null;
}

async function fetchJwtFromDirectSessionFetch(): Promise<string | null> {
  const neonAuthUrl = getNeonAuthUrl();
  if (!neonAuthUrl || typeof fetch !== 'function') return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(`${neonAuthUrl}/get-session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      signal: controller?.signal,
    });

    const jwt = response.headers.get('set-auth-jwt');
    return typeof jwt === 'string' && looksLikeJwt(jwt) ? jwt : null;
  } catch {
    return null;
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

/**
 * Obtém JWT do Neon Auth de forma resiliente.
 *
 * Ordem:
 * 1. SDK (`getJWTToken` ou `getSession`)
 * 2. Requisição direta para `/get-session`, lendo o header `set-auth-jwt`
 *
 * O fallback direto evita ficar preso no cache interno do SDK quando a sessão
 * existe, mas o token ainda não foi materializado para as chamadas da API.
 */
async function fetchJwt(): Promise<string | null> {
  const sdkJwt = await fetchJwtFromSdk();
  if (sdkJwt) return sdkJwt;

  return fetchJwtFromDirectSessionFetch();
}

export async function getNeonAccessToken(options: { forceSessionReload?: boolean } = {}): Promise<string> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não está habilitado (VITE_NEON_AUTH_URL ausente).');
  }

  if (!options.forceSessionReload) {
    const cached = getCachedJwt();
    if (cached) return cached;
  }

  const jwt = await fetchJwt();

  if (!jwt) {
    throw new Error('Token JWT do Neon Auth indisponível. Certifique-se de estar logado.');
  }

  if (isExpired(jwt)) {
    throw new Error('Token JWT do Neon Auth expirado. Faça login novamente.');
  }

  setCachedJwt(jwt);
  return jwt;
}

/** Limpa o cache — chamar após login bem-sucedido */
export function invalidateNeonTokenCache(): void {
  cachedJwt = null;
  cachedJwtExpiry = 0;
}

// Re-export para compatibilidade
export { authClient };
