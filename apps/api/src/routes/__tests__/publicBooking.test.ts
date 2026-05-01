import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { publicBookingRoutes } = await import("../publicBooking");
  const app = new Hono<any>();
  app.route("/api/public-booking", publicBookingRoutes);
  return app;
}

const BASE_ENV = {
  HYPERDRIVE: {},
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "development",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
} as const;

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("public booking protection", () => {
  it("GET /booking/:slug does NOT require Turnstile (patients browse freely)", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/public-booking/booking/demo"),
      BASE_ENV as any,
    );
    // No Turnstile → 404 (profile not found), not 400 (token missing)
    expect(res.status).not.toBe(400);
  });

  it("POST /booking rejects without Turnstile token when secret is configured", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/public-booking/booking", {
        slug: "demo",
        date: "2026-05-10",
        time: "10:00",
        patient: { name: "João", phone: "11999999999" },
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Token Turnstile obrigatório",
    });
  });

  it("applies IP rate limiting before public booking handlers", async () => {
    const first = vi.fn().mockResolvedValue({ count: 31 });
    const env = {
      ...BASE_ENV,
      EDGE_CACHE: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({ first })),
        })),
      },
    };

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/public-booking/booking/demo", undefined, {
        "CF-Connecting-IP": "203.0.113.10",
      }),
      env as any,
    );

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      error: "Rate limit exceeded",
    });
  });

  it("POST /checkin returns 400 for missing or short token", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/public-booking/checkin", { token: "" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/Token/i);
  });

  it("POST /checkin returns 404 for unknown token", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/public-booking/checkin", {
        token: "a".repeat(64),
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(404);
  });

  it("GET /booking/:slug/availability returns 400 for missing date", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/public-booking/booking/demo/availability"),
      BASE_ENV as any,
    );
    expect(res.status).toBe(400);
  });
});
