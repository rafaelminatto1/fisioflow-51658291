import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: vi.fn() })),
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
  it("rejects requests without Turnstile token when secret is configured", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/public-booking/booking/demo"),
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
});

