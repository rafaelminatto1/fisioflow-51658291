import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-portal-001",
      organizationId: "org-test-001",
      role: "patient",
      email: "portal@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { patientPortalRoutes } = await import("../patientPortal");
  const app = new Hono<any>();
  app.route("/api/patient-portal", patientPortalRoutes);
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

const BASE_ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

describe("patient portal routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET /api/patient-portal/profile returns normalized fallback profile when patients table is unavailable", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "profile-portal-001",
            user_id: "user-portal-001",
            email: "portal@example.com",
            full_name: "Paciente Portal",
            role: "patient",
            organization_id: "org-test-001",
            created_at: "2026-04-05T00:00:00.000Z",
            updated_at: "2026-04-05T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/patient-portal/profile"), BASE_ENV as any);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300, stale-while-revalidate=60");

    await expect(res.json()).resolves.toMatchObject({
      data: {
        id: "profile-portal-001",
        user_id: "user-portal-001",
        email: "portal@example.com",
        full_name: "Paciente Portal",
        profile: {
          id: "profile-portal-001",
          role: "patient",
        },
      },
    });
  });
});
