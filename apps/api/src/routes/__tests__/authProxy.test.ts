import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../types/env';

// ── Mock globals ───────────────────────────────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ── Setup: import authRoutes after mocking fetch ───────────────────────────

const buildApp = async () => {
  const { authRoutes } = await import('../auth');
  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/auth', authRoutes);
  return app;
};

const BASE_ENV: Partial<Env> = {
  NEON_AUTH_URL: 'https://auth.example.com/db/auth',
  HYPERDRIVE: {} as any,
  ALLOWED_ORIGINS: '*',
  ENVIRONMENT: 'development',
};

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

const FAKE_JWT = [
  btoa(JSON.stringify({ alg: 'EdDSA' })),
  btoa(JSON.stringify({ sub: 'user-uuid-123', email: 'test@example.com', exp: 9999999999 })),
  'signature',
].join('.');

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna JWT ao fazer proxy de login bem-sucedido', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: FAKE_JWT, user: { id: 'user-uuid-123', email: 'test@example.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    // Mock DB query (profile lookup)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/login', { email: 'test@example.com', password: 'secret123' }),
      BASE_ENV as Env
    );

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.token).toBe(FAKE_JWT);
    expect(json.user.email).toBe('test@example.com');
  });

  it('retorna erro ao fazer proxy de credenciais inválidas', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/login', { email: 'bad@example.com', password: 'wrong' }),
      BASE_ENV as Env
    );

    // Neon Auth forward returns a non-200 status
    expect(res.status).not.toBe(200);
    const json = await res.json() as any;
    expect(json.error).toBeTruthy();
  });

  it('retorna 400 quando email ou senha estão ausentes', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/login', { email: 'test@example.com' }),
      BASE_ENV as Env
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retorna 500 quando NEON_AUTH_URL não configurado', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/login', { email: 'test@example.com', password: 'pass' }),
      { ...BASE_ENV, NEON_AUTH_URL: undefined } as Env
    );

    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna sucesso mesmo sem token', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/logout'),
      BASE_ENV as Env
    );
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });

  it('encaminha logout para Neon Auth quando token presente', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const app = await buildApp();
    await app.fetch(
      makeRequest('POST', '/api/auth/logout', undefined, { Authorization: `Bearer ${FAKE_JWT}` }),
      BASE_ENV as Env
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/sign-out`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => vi.clearAllMocks());

  it('encaminha para Neon Auth forget-password', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/forgot-password', { email: 'test@example.com' }),
      BASE_ENV as Env
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/forget-password`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('retorna 400 sem email', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/auth/forgot-password', {}),
      BASE_ENV as Env
    );
    expect(res.status).toBe(400);
  });
});
