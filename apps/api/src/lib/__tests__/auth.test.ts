import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../types/env";

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => ({ jwks: true })),
  query: vi.fn(),
  getCookie: vi.fn(() => undefined),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: mocks.createRemoteJWKSet,
  jwtVerify: mocks.jwtVerify,
}));

vi.mock("hono/cookie", () => ({
  getCookie: mocks.getCookie,
}));

vi.mock("../db", () => ({
  createPool: vi.fn(() => ({ query: mocks.query })),
  getRawSql: vi.fn(() => mocks.query),
  runWithOrg: vi.fn((_organizationId: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("../dbWrapper", () => ({
  withTimeout: vi.fn((fn: any) => fn),
}));

const env = {
  NEON_AUTH_JWKS_URL: "https://auth.example.com/.well-known/jwks.json",
  NEON_AUTH_ISSUER: "https://auth.example.com",
  NEON_AUTH_AUDIENCE: "https://api.example.com",
  ENVIRONMENT: "development",
  ALLOWED_ORIGINS: "*",
  HYPERDRIVE: {} as any,
} as Env;

function makeFakeJwt(sub: string, email: string, extra: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "EdDSA" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, email, ...extra })).toString("base64url");
  return `${header}.${payload}.fake-signature`;
}

function makeContext(token?: string): any {
  return {
    req: {
      header: (name: string) =>
        name === "Authorization"
          ? `Bearer ${token ?? makeFakeJwt("user-1", "test@example.com")}`
          : undefined,
      query: () => undefined,
      raw: { headers: new Headers() },
    },
  };
}

let verifyToken: (typeof import("../auth"))["verifyToken"];
let DEFAULT_ORG_ID: string;

beforeAll(async () => {
  const auth = await import("../auth");
  verifyToken = auth.verifyToken;
  DEFAULT_ORG_ID = auth.DEFAULT_ORG_ID;
});

describe("verifyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockReset();
    mocks.getCookie.mockReturnValue(undefined);
  });

  it("valida issuer e audience e prefere membership do perfil", async () => {
    mocks.jwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "user-1",
        email: "token@example.com",
        organizationId: "org-from-token",
        role: "viewer",
      },
    });
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          user_id: "user-1",
          email: "db@example.com",
          role: "admin",
          organization_id: "org-from-db",
        },
      ],
    });

    const user = await verifyToken(makeContext(), env);

    expect(mocks.jwtVerify).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({
        issuer: env.NEON_AUTH_ISSUER,
        audience: env.NEON_AUTH_AUDIENCE,
      }),
    );
    expect(user).toEqual({
      uid: "user-1",
      email: "db@example.com",
      organizationId: "org-from-db",
      role: "admin",
    });
  });

  it("permite token valido sem org explicita usando fallback padrão", async () => {
    mocks.jwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "user-2",
        email: "missing-org@example.com",
      },
    });
    mocks.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const user = await verifyToken(
      makeContext(makeFakeJwt("user-2", "missing-org@example.com")),
      env,
    );

    expect(user).toEqual({
      uid: "user-2",
      email: "missing-org@example.com",
      organizationId: DEFAULT_ORG_ID,
      role: "viewer",
    });
  });

  it("usa organizationId explicito do token quando a consulta de perfil falha", async () => {
    mocks.jwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "user-3",
        email: "fallback@example.com",
        organizationId: "org-from-token",
        role: "fisioterapeuta",
      },
    });
    mocks.query.mockRejectedValueOnce(new Error("database unavailable"));

    const user = await verifyToken(
      makeContext(
        makeFakeJwt("user-3", "fallback@example.com", {
          organizationId: "org-from-token",
          role: "fisioterapeuta",
        }),
      ),
      env,
    );

    expect(user).toEqual({
      uid: "user-3",
      email: "fallback@example.com",
      organizationId: "org-from-token",
      role: "fisioterapeuta",
    });
  });
});
