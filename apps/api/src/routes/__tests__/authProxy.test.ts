import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../../types/env";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
  getRawSql: vi.fn(() => mockQuery),
  runWithOrg: vi.fn((_orgId: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../../lib/dbWrapper", () => ({
  withTimeout: vi.fn((fn: any) => fn),
}));

const buildApp = async () => {
  const { authRoutes } = await import("../auth");
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/auth", authRoutes);
  return app;
};

const BASE_ENV: Partial<Env> = {
  NEON_AUTH_URL: "https://auth.example.com/db/auth",
  HYPERDRIVE: {} as any,
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "development",
};

function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const FAKE_JWT = [
  btoa(JSON.stringify({ alg: "EdDSA" })),
  btoa(JSON.stringify({ sub: "user-uuid-123", email: "test@example.com", exp: 9999999999 })),
  "signature",
].join(".");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
  });

  it("retorna erro ao fazer proxy de credenciais inválidas", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/login", { email: "bad@example.com", password: "wrong" }),
      BASE_ENV as Env,
    );

    expect(res.status).not.toBe(200);
  });

  it("retorna 400 quando email ou senha estão ausentes", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/login", { email: "test@example.com" }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retorna 500 quando NEON_AUTH_URL não configurado", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/login", { email: "test@example.com", password: "pass" }),
      { ...BASE_ENV, NEON_AUTH_URL: undefined } as Env,
    );

    expect(res.status).toBe(500);
  });
});

describe("POST /api/auth/signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 quando email ou senha estão ausentes", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/signup", { email: "new@example.com" }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("exige Turnstile quando secret está configurado", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/signup", {
        email: "new@example.com",
        password: "secret123",
      }),
      { ...BASE_ENV, TURNSTILE_SECRET_KEY: "turnstile-secret" } as Env,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Token Turnstile obrigatório",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna sucesso mesmo sem token", async () => {
    const app = await buildApp();
    const res = await app.fetch(makeRequest("POST", "/api/auth/logout"), BASE_ENV as Env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
  });

  it("encaminha logout para Neon Auth quando token presente", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const app = await buildApp();
    await app.fetch(
      makeRequest("POST", "/api/auth/logout", undefined, { Authorization: `Bearer ${FAKE_JWT}` }),
      BASE_ENV as Env,
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/sign-out`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encaminha para Neon Auth forget-password", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/forgot-password", { email: "test@example.com" }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/forget-password`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retorna 400 sem email", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/forgot-password", {}),
      BASE_ENV as Env,
    );
    expect(res.status).toBe(400);
  });

  it("exige Turnstile quando secret está configurado", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/forgot-password", { email: "test@example.com" }),
      { ...BASE_ENV, TURNSTILE_SECRET_KEY: "turnstile-secret" } as Env,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Token Turnstile obrigatório",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encaminha para Neon Auth reset-password", async () => {
    mockFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/reset-password", {
        token: "reset-token",
        password: "new-secret123",
      }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      message: "Senha redefinida com sucesso",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/reset-password`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retorna 400 sem token ou senha", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/auth/reset-password", { token: "reset-token" }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna session null quando Authorization está ausente", async () => {
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/auth/session"), BASE_ENV as Env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ session: null });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("encaminha get-session para Neon Auth quando token está presente", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          session: { userId: "user-uuid-123" },
          user: { email: "test@example.com" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/auth/session", undefined, { Authorization: `Bearer ${FAKE_JWT}` }),
      BASE_ENV as Env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.not.toHaveProperty("error");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_ENV.NEON_AUTH_URL}/get-session`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${FAKE_JWT}`,
        }),
      }),
    );
  });
});
