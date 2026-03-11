import { authClient, isNeonAuthEnabled } from '@/integrations/neon/auth';

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

/**
 * Obtém JWT via authClient.getSession() — o token JWT fica em data.session.token.
 * Fallback: intercepta o header set-auth-jwt da resposta HTTP.
 */
async function fetchJwt(): Promise<string | null> {
  // Método primário: data.session.token retornado por getSession()
  try {
    const { data } = await authClient.getSession();
    const token =
      (data as any)?.session?.token ||
      (data as any)?.token;
    if (typeof token === 'string' && looksLikeJwt(token)) return token;
  } catch {
    // Fallback abaixo
  }

  // Fallback: intercepta set-auth-jwt header retornado por getSession()
  return new Promise((resolve) => {
    authClient.getSession({
      fetchOptions: {
        onSuccess: (ctx: any) => {
          const jwt = ctx.response?.headers?.get?.('set-auth-jwt');
          resolve(typeof jwt === 'string' && looksLikeJwt(jwt) ? jwt : null);
        },
        onError: () => resolve(null),
      },
    }).catch(() => resolve(null));
  });
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
