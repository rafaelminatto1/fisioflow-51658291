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

function pickTokenFromSession(sessionResult: unknown): string | null {
  const raw = sessionResult as Record<string, any>;
  const session = raw?.data?.session ?? raw?.session ?? null;
  const candidates = [
    raw?.token,
    raw?.accessToken,
    raw?.access_token,
    raw?.idToken,
    raw?.id_token,
    session?.token,
    session?.accessToken,
    session?.access_token,
    session?.idToken,
    session?.id_token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

async function getTokenFromClient(forceSessionReload = false): Promise<string | null> {
  const client = authClient as any;

  if (!forceSessionReload) {
    const storeSession = client?.useSession?.getState?.();
    const fromStore = pickTokenFromSession(storeSession);
    if (fromStore) return fromStore;
  }

  // Alguns SDKs expõem helpers diretos para token.
  try {
    const directToken = await client?.getToken?.();
    if (typeof directToken === 'string' && directToken.trim().length > 0) {
      return directToken.trim();
    }
    const directTokenFromData = pickTokenFromSession(directToken);
    if (directTokenFromData) return directTokenFromData;
  } catch {
    // segue para getSession
  }

  // Neon auth instances may not expose /auth/get-token on all environments.
  // getSession() is the stable path and already carries JWT when authenticated.
  const liveSession = await authClient.getSession();
  const tokenFromSession = pickTokenFromSession(liveSession);
  if (tokenFromSession) return tokenFromSession;

  const liveSessionFromStore = client?.useSession?.getState?.();
  return pickTokenFromSession(liveSessionFromStore);
}

async function getJwtFromSessionEndpoint(): Promise<string | null> {
  const authBase = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
  if (!authBase) return null;

  try {
    const response = await fetch(`${authBase.replace(/\/$/, '')}/get-session`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) return null;

    const headerCandidates = [
      response.headers.get('set-auth-jwt'),
      response.headers.get('x-auth-jwt'),
      response.headers.get('authorization')?.replace(/^Bearer\s+/i, ''),
    ];
    for (const headerToken of headerCandidates) {
      if (typeof headerToken === 'string' && headerToken.trim().length > 0) {
        return headerToken.trim();
      }
    }

    // Fallback: alguns ambientes retornam o token no payload JSON.
    const payload = await response.json().catch(() => null);
    const tokenFromPayload = pickTokenFromSession(payload);
    if (tokenFromPayload) {
      return tokenFromPayload;
    }
  } catch {
    return null;
  }

  return null;
}

export async function getNeonAccessToken(options: GetNeonAccessTokenOptions = {}): Promise<string> {
  if (!isNeonAuthEnabled()) {
    throw new Error('Neon Auth não está habilitado (VITE_NEON_AUTH_URL ausente).');
  }

  let token = await getTokenFromClient(Boolean(options.forceSessionReload));
  if (!token || !looksLikeJwt(token) || isExpired(token)) {
    const jwtFromHeader = await getJwtFromSessionEndpoint();
    if (jwtFromHeader) token = jwtFromHeader;
  }

  if (!token) {
    throw new Error('Token JWT do Neon Auth indisponível.');
  }

  if (!looksLikeJwt(token)) {
    throw new Error('Token do Neon Auth em formato inválido.');
  }

  if (isExpired(token)) {
    const refreshed = await getTokenFromClient(true);
    if (!refreshed || !looksLikeJwt(refreshed) || isExpired(refreshed)) {
      throw new Error('Token JWT do Neon Auth expirado.');
    }
    return refreshed;
  }

  return token;
}
