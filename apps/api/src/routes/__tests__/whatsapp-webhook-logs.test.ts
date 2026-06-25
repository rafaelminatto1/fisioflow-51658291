import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { uid: "user-1", organizationId: "org-1", role: "admin", email: "admin@test.com" });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { whatsappRoutes } = await import("../whatsapp");
  const app = new Hono<any>();
  app.route("/api/whatsapp", whatsappRoutes);
  return app;
}

describe("GET /api/whatsapp/webhook-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows from wa_raw_events with processing metadata", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "evt-1",
          event_type: "message",
          phone_number_id: "123456",
          meta_message_id: "wamid.abc",
          processing_state: "org_unresolved",
          failure_reason: "phone_number_id_not_mapped",
          signature_valid: true,
          raw_payload: { entry: [] },
          created_at: new Date("2026-06-25T12:00:00Z"),
        },
      ],
    });

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/whatsapp/webhook-logs?limit=10", {
        headers: { Authorization: "Bearer fake-token" },
      }),
      { HYPERDRIVE: {}, ENVIRONMENT: "development" } as any,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data[0]).toMatchObject({
      id: "evt-1",
      event_type: "message",
      phone_number_id: "123456",
      processing_state: "org_unresolved",
      failure_reason: "phone_number_id_not_mapped",
    });
  });
});
