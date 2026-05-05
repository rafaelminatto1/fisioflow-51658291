import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery, transaction: mockTransaction })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-test-001",
      organizationId: "org-test-001",
      role: "admin",
      email: "test@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { settingsRoutes } = await import("../scheduling-settings");
  const app = new Hono<any>();
  app.route("/api/scheduling", settingsRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeD1() {
  const store = new Map<string, { value: string; expires_at: number }>();
  const deletes: string[] = [];

  return {
    deletes,
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            first: vi.fn(async () => {
              const row = store.get(String(args[0]));
              return row ?? null;
            }),
            run: vi.fn(async () => {
              if (sql.startsWith("INSERT OR REPLACE")) {
                store.set(String(args[0]), {
                  value: String(args[1]),
                  expires_at: Number(args[2]),
                });
              }
              if (sql.startsWith("DELETE")) {
                deletes.push(String(args[0]));
                store.delete(String(args[0]));
              }
              return { success: true };
            }),
          };
        },
      };
    },
  };
}

function makeEnv(edgeCache = makeD1()) {
  return {
    HYPERDRIVE: {},
    ALLOWED_ORIGINS: "*",
    ENVIRONMENT: "development",
    EDGE_CACHE: edgeCache,
  };
}

describe("scheduling settings edge cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockResolvedValue([]);
  });

  it("serves business hours from D1 cache after the first database read", async () => {
    const edgeCache = makeD1();
    mockQuery.mockResolvedValueOnce({
      rows: [{ day_of_week: 1, open_time: "07:00", close_time: "21:00", is_open: true }],
    });

    const app = await buildApp();
    const env = makeEnv(edgeCache);

    const first = await app.fetch(
      makeRequest("GET", "/api/scheduling/settings/business-hours"),
      env as any,
    );
    expect(first.status).toBe(200);

    const second = await app.fetch(
      makeRequest("GET", "/api/scheduling/settings/business-hours"),
      env as any,
    );
    expect(second.status).toBe(200);

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("invalidates business hours cache after an upsert", async () => {
    const edgeCache = makeD1();
    mockQuery.mockResolvedValueOnce({
      rows: [{ day_of_week: 1, open_time: "07:00", close_time: "21:00", is_open: true }],
    });

    const app = await buildApp();
    const env = makeEnv(edgeCache);

    await app.fetch(makeRequest("GET", "/api/scheduling/settings/business-hours"), env as any);

    mockQuery.mockResolvedValueOnce({
      rows: [{ day_of_week: 1, open_time: "08:00", close_time: "20:00", is_open: true }],
    });

    const res = await app.fetch(
      makeRequest("PUT", "/api/scheduling/settings/business-hours", {
        day_of_week: 1,
        open_time: "08:00",
        close_time: "20:00",
        is_open: true,
      }),
      env as any,
    );

    expect(res.status).toBe(200);
    expect(edgeCache.deletes).toContain("schedule-settings:v1:business-hours:org-test-001");
  });
});
