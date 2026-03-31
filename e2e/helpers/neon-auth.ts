import { request, type BrowserContext, type StorageState } from '@playwright/test';

type SharedAuthSession = {
  storageState: StorageState;
  bearer: string;
};

const DEFAULT_ALLOWED_AUTH_ORIGIN = 'https://www.moocafisio.com.br';
const neonAuthUrl = process.env.VITE_NEON_AUTH_URL || '';
const sessionCache = new Map<string, Promise<SharedAuthSession>>();

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

export function getE2EAuthOrigin(): string {
  return normalizeOrigin(
    process.env.E2E_NEON_AUTH_ORIGIN ||
      process.env.E2E_AUTH_ORIGIN ||
      DEFAULT_ALLOWED_AUTH_ORIGIN,
  );
}

export function isCanonicalMoocaOrigin(value: string): boolean {
  try {
    const { hostname } = new URL(normalizeOrigin(value));
    return hostname === 'moocafisio.com.br' || hostname === 'www.moocafisio.com.br';
  } catch {
    return false;
  }
}

async function createSession(email: string, password: string): Promise<SharedAuthSession> {
  if (!neonAuthUrl) {
    throw new Error('VITE_NEON_AUTH_URL ausente para os testes E2E.');
  }

  const requestOrigin = getE2EAuthOrigin();
  const authContext = await request.newContext({
    baseURL: requestOrigin,
    extraHTTPHeaders: {
      origin: requestOrigin,
    },
  });

  try {
    const signIn = await authContext.post(`${neonAuthUrl}/sign-in/email`, {
      data: { email, password },
      headers: {
        'content-type': 'application/json',
      },
    });

    if (!signIn.ok()) {
      throw new Error(`Falha no sign-in HTTP: ${signIn.status()} ${await signIn.text()}`);
    }

    const session = await authContext.get(`${neonAuthUrl}/get-session`, {
      headers: {
        origin: requestOrigin,
      },
    });

    if (!session.ok()) {
      throw new Error(`Falha no get-session HTTP: ${session.status()} ${await session.text()}`);
    }

    const bearer = session.headers()['set-auth-jwt'];
    if (!bearer || bearer.split('.').length !== 3) {
      throw new Error('Header set-auth-jwt ausente ou inválido no Neon Auth.');
    }

    const storageState = await authContext.storageState();
    return {
      storageState,
      bearer: `Bearer ${bearer}`,
    };
  } finally {
    await authContext.dispose();
  }
}

export async function getSharedAuthSession(email: string, password: string): Promise<SharedAuthSession> {
  const cacheKey = `${email}::${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached) return cached;

  const sessionPromise = createSession(email, password).catch((error) => {
    sessionCache.delete(cacheKey);
    throw error;
  });
  sessionCache.set(cacheKey, sessionPromise);
  return sessionPromise;
}

export async function authenticateBrowserContext(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  const session = await getSharedAuthSession(email, password);
  await context.addCookies(session.storageState.cookies);
}

export async function getSharedBearer(email: string, password: string): Promise<string> {
  const session = await getSharedAuthSession(email, password);
  return session.bearer;
}
