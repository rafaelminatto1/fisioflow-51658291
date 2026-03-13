import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthClient = {
  getSession: vi.fn(),
  getJWTToken: vi.fn(),
};

vi.mock('@/integrations/neon/auth', () => ({
  authClient: mockAuthClient,
  isNeonAuthEnabled: () => true,
}));

vi.mock('@/lib/config/neon', () => ({
  getNeonAuthUrl: () => 'https://auth.example.com/neondb/auth',
}));

function createJwt(expOffsetSeconds = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    sub: 'user-123',
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('neon-token', () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuthClient.getSession.mockReset();
    mockAuthClient.getJWTToken.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(async () => {
    const mod = await import('../neon-token');
    mod.invalidateNeonTokenCache();
    vi.unstubAllGlobals();
  });

  it('uses getJWTToken when the SDK already has a JWT', async () => {
    const jwt = createJwt();
    mockAuthClient.getJWTToken.mockResolvedValue(jwt);
    const fetchMock = vi.mocked(fetch);

    const { getNeonAccessToken } = await import('../neon-token');

    await expect(getNeonAccessToken()).resolves.toBe(jwt);
    expect(mockAuthClient.getJWTToken).toHaveBeenCalledTimes(1);
    expect(mockAuthClient.getSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to direct /get-session fetch when the SDK session lacks a token', async () => {
    const jwt = createJwt();
    mockAuthClient.getJWTToken.mockResolvedValue(null);
    mockAuthClient.getSession.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const headers = new Headers({ 'set-auth-jwt': jwt });
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200, headers }));

    const { getNeonAccessToken } = await import('../neon-token');

    await expect(getNeonAccessToken()).resolves.toBe(jwt);
    expect(fetch).toHaveBeenCalledWith(
      'https://auth.example.com/neondb/auth/get-session',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('reuses the cached JWT until the cache is invalidated', async () => {
    const jwt = createJwt();
    mockAuthClient.getJWTToken.mockResolvedValue(jwt);

    const { getNeonAccessToken, invalidateNeonTokenCache } = await import('../neon-token');

    await expect(getNeonAccessToken()).resolves.toBe(jwt);
    await expect(getNeonAccessToken()).resolves.toBe(jwt);
    expect(mockAuthClient.getJWTToken).toHaveBeenCalledTimes(1);

    invalidateNeonTokenCache();
    await expect(getNeonAccessToken()).resolves.toBe(jwt);
    expect(mockAuthClient.getJWTToken).toHaveBeenCalledTimes(2);
  });
});
