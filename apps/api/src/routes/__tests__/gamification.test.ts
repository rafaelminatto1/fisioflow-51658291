import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-test-001",
      organizationId: "org-test-001",
      role: "fisioterapeuta",
      email: "test@example.com",
    });
    await next();
  }),
  requireRole: vi.fn(() => async (_c: any, next: any) => {
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { gamificationRoutes } = await import("../gamification");
  const app = new Hono<any>();
  app.route("/api/gamification", gamificationRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const BASE_ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };
const PATIENT_ID = "534bf2ed-419f-4339-92e3-8922c39df474";

describe("gamification quests routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates daily quests with the authenticated organization id", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "daily-quest-001",
            organization_id: "org-test-001",
            patient_id: PATIENT_ID,
            quests_data: [],
            completed_count: 0,
          },
        ],
      });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", `/api/gamification/quests/${PATIENT_ID}`),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: {
        organization_id: "org-test-001",
        patient_id: PATIENT_ID,
      },
    });

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[0][0]).toContain("organization_id = $2");
    expect(mockQuery.mock.calls[0][1]).toEqual([PATIENT_ID, "org-test-001"]);
    expect(mockQuery.mock.calls[1][0]).toContain("organization_id = $3");
    expect(mockQuery.mock.calls[1][1]).toEqual([PATIENT_ID, expect.any(String), "org-test-001"]);
    expect(mockQuery.mock.calls[2][0]).toContain("organization_id, patient_id");
    expect(mockQuery.mock.calls[2][1][0]).toBe("org-test-001");
    expect(mockQuery.mock.calls[2][1][1]).toBe(PATIENT_ID);
  });
});
