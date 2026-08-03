import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
  createDb: vi.fn(() => ({})),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: (_c: any, next: any) => next(),
  requireRole: (allowedRoles: string | string[]) => async (c: any, next: any) => {
    const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
      r.toLowerCase(),
    );
    const user = c.get("user");
    const roles: string[] = [
      String(user?.role ?? ""),
      ...(Array.isArray(user?.roles) ? user.roles : []),
    ]
      .map((r) => String(r).trim().toLowerCase())
      .filter(Boolean);
    if (!roles.some((r) => allowed.includes(r))) {
      return c.json({ error: "admin_only" }, 403);
    }
    await next();
  },
}));

vi.mock("../../lib/realtime", () => ({ broadcastToOrg: vi.fn() }));
vi.mock("../../lib/webpush", () => ({ sendPushToOrg: vi.fn() }));
vi.mock("../../lib/backgroundEvents", () => ({ triggerBackgroundEvent: vi.fn() }));

const adminUser = {
  uid: "admin-1",
  organizationId: "00000000-0000-0000-0000-000000000001",
  role: "admin",
  roles: ["admin"],
};
const fisioUser = {
  uid: "fisio-1",
  organizationId: "00000000-0000-0000-0000-000000000001",
  role: "fisioterapeuta",
  roles: ["fisioterapeuta"],
};

async function buildApp(user: any, create: any) {
  const { Hono } = await import("hono");
  const { appointmentsRoutes } = await import("../appointments");
  const app = new Hono<any>();
  app.use("/*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/api/appointments", appointmentsRoutes);
  const env = {
    ENVIRONMENT: "development",
    ALLOWED_ORIGINS: "*",
    WORKFLOW_APPOINTMENT_REMINDER: { create },
  } as any;
  return { app, env };
}

function post(path: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

// data futura fixa (mesmo padrão do id determinístico)
const futureRow = {
  id: "11111111-1111-1111-1111-111111111111",
  organization_id: "00000000-0000-0000-0000-000000000001",
  patient_id: "22222222-2222-2222-2222-222222222222",
  date_str: "2099-12-31",
  time_str: "10:00",
  patient_name: "Maria",
  patient_phone: "+5511999",
  therapist_name: "Rafael",
  rcfg: null,
};

beforeEach(() => {
  mockQuery.mockReset();
});

describe("POST /api/appointments/reminders/backfill", () => {
  it("bloqueia não-admin com 403", async () => {
    const create = vi.fn();
    const { app, env } = await buildApp(fisioUser, create);
    const res = await app.fetch(post("/api/appointments/reminders/backfill"), env);
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("admin agenda workflow com id determinístico para cada agendamento elegível", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [futureRow] });
    const create = vi.fn().mockResolvedValue({ id: "reminder-11111111-1111-1111-1111-111111111111" });
    const { app, env } = await buildApp(adminUser, create);
    const res = await app.fetch(post("/api/appointments/reminders/backfill"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toEqual({ candidates: 1, scheduled: 1 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "reminder-11111111-1111-1111-1111-111111111111" }),
    );
  });

  it("pula agendamentos sem telefone (não conta)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...futureRow, patient_phone: null }] });
    const create = vi.fn();
    const { app, env } = await buildApp(adminUser, create);
    const res = await app.fetch(post("/api/appointments/reminders/backfill"), env);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toEqual({ candidates: 1, scheduled: 0 });
    expect(create).not.toHaveBeenCalled();
  });
});
