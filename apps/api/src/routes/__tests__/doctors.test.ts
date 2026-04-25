import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery, end: mockEnd })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-doctors-001",
      organizationId: "org-doctors-001",
      role: "admin",
      email: "doctor-admin@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { doctorsRoutes } = await import("../doctors");
  const app = new Hono<any>();
  app.route("/api/doctors", doctorsRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const BASE_ENV = {
  HYPERDRIVE: {},
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "development",
} as const;

describe("doctors routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnd.mockResolvedValue(undefined);
  });

  it("GET /api/doctors lists doctors without attempting runtime DDL", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: "doctor-1",
            name: "Dra. Ana",
            specialty: "Ortopedia",
            crm: "12345",
            crm_state: "SP",
            phone: null,
            email: null,
            clinic_name: null,
            clinic_address: null,
            clinic_phone: null,
            notes: null,
            is_active: true,
            created_at: "2026-04-01T00:00:00.000Z",
            updated_at: "2026-04-01T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/doctors?limit=1000"), BASE_ENV as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      data: [{ id: "doctor-1", name: "Dra. Ana" }],
      total: 1,
      page: 1,
      perPage: 1000,
    });

    const sql = mockQuery.mock.calls.map(([query]) => String(query)).join("\n");
    expect(sql).toContain("FROM doctors");
    expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
