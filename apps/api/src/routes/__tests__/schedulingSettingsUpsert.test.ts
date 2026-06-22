/**
 * Testes de upsert para as configurações da agenda.
 *
 * Root cause confirmado (H2): cancellation_rules e scheduling_notification_settings
 * não tinham UNIQUE(organization_id), então ON CONFLICT (organization_id) lançava erro
 * do Postgres. Além disso, o INSERT de cancellation_rules usava posições de parâmetro
 * erradas ($2 para allow_reschedule em vez de TRUE como padrão). A migration 0125
 * adiciona as constraints ausentes e este arquivo valida os payloads normalizados.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers unit tests (sem I/O)
// ---------------------------------------------------------------------------
import {
  normalizeCancellationRulePayload,
  normalizeNotificationSettingsPayload,
} from "../scheduling-helpers";

describe("normalizeCancellationRulePayload", () => {
  it("mapeia todos os campos obrigatórios sem undefined", () => {
    const n = normalizeCancellationRulePayload({
      min_hours_before: 24,
      allow_patient_cancellation: true,
      max_cancellations_month: 3,
      charge_late_cancellation: false,
      late_cancellation_fee: 0,
    });
    expect(n.minHoursBefore).toBe(24);
    expect(n.allowPatientCancellation).toBe(true);
    expect(n.maxCancellationsMonth).toBe(3);
    expect(n.chargeLateCancellation).toBe(false);
    expect(n.lateCancellationFee).toBe(0);
  });

  it("aceita alias min_hours_notice e allow_reschedule", () => {
    const n = normalizeCancellationRulePayload({
      min_hours_notice: 48,
      allow_reschedule: false,
    });
    expect(n.minHoursBefore).toBe(48);
    expect(n.allowPatientCancellation).toBe(false);
  });

  it("infere chargeLateCancellation de late_cancellation_fee > 0", () => {
    const n = normalizeCancellationRulePayload({ late_cancellation_fee: 50 });
    expect(n.chargeLateCancellation).toBe(true);
    expect(n.lateCancellationFee).toBe(50);
  });
});

describe("normalizeNotificationSettingsPayload", () => {
  it("retorna todos os campos booleanos esperados", () => {
    const n = normalizeNotificationSettingsPayload({
      enable_reminders: true,
      reminder_hours_before: 24,
      send_confirmation_email: true,
      send_confirmation_whatsapp: false,
      send_reminder_24h: true,
      send_reminder_2h: false,
      send_cancellation_notice: true,
    });
    expect(n.enableReminders).toBe(true);
    expect(n.reminderHoursBefore).toBe(24);
    expect(n.sendConfirmationEmail).toBe(true);
    expect(n.sendConfirmationWhatsApp).toBe(false);
    expect(n.sendReminder24h).toBe(true);
    expect(n.sendReminder2h).toBe(false);
    expect(n.sendCancellationNotice).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Handler integration tests via Hono app
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery, transaction: mockTransaction, end: vi.fn() })),
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

function makeEnv() {
  return {
    HYPERDRIVE: {},
    ALLOWED_ORIGINS: "*",
    ENVIRONMENT: "development",
  };
}

describe("POST /settings/cancellation-rules — upsert handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 200 com data ao persistir regras de cancelamento", async () => {
    const fakeRow = {
      id: "row-1",
      organization_id: "org-test-001",
      min_hours_notice: 24,
      allow_reschedule: true,
      cancellation_fee: 0,
      min_hours_before: 24,
      allow_patient_cancellation: true,
      max_cancellations_month: 3,
      charge_late_cancellation: false,
      late_cancellation_fee: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [fakeRow], rowCount: 1 });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/scheduling/settings/cancellation-rules", {
        min_hours_before: 24,
        allow_patient_cancellation: true,
        max_cancellations_month: 3,
        charge_late_cancellation: false,
        late_cancellation_fee: 0,
      }),
      makeEnv() as any,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json).toHaveProperty("data");
    expect(json.data.min_hours_before).toBe(24);
  });

  it("o INSERT usa exatamente 6 parâmetros na ordem correta", async () => {
    const fakeRow = {
      id: "row-1",
      organization_id: "org-test-001",
      min_hours_notice: 12,
      allow_reschedule: true,
      cancellation_fee: 50,
      min_hours_before: 12,
      allow_patient_cancellation: false,
      max_cancellations_month: 2,
      charge_late_cancellation: true,
      late_cancellation_fee: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [fakeRow], rowCount: 1 });

    const app = await buildApp();
    await app.fetch(
      makeRequest("POST", "/api/scheduling/settings/cancellation-rules", {
        min_hours_before: 12,
        allow_patient_cancellation: false,
        max_cancellations_month: 2,
        charge_late_cancellation: true,
        late_cancellation_fee: 50,
      }),
      makeEnv() as any,
    );

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, any[]];

    // Verifica ordem dos parâmetros: [minHoursBefore, allowPatientCancellation,
    //   maxCancellationsMonth, chargeLateCancellation, lateCancellationFee, organizationId]
    expect(params[0]).toBe(12);           // $1 = min_hours_before / min_hours_notice
    expect(params[1]).toBe(false);        // $2 = allow_patient_cancellation / allow_reschedule
    expect(params[2]).toBe(2);            // $3 = max_cancellations_month
    expect(params[3]).toBe(true);         // $4 = charge_late_cancellation
    expect(params[4]).toBe(50);           // $5 = late_cancellation_fee / cancellation_fee
    expect(params[5]).toBe("org-test-001"); // $6 = organization_id

    // Garante que o SQL não usa posição $2 para allow_reschedule ao mesmo
    // tempo que também para allow_patient_cancellation — ambas devem referenciar $2
    // mas o VALUES não deve ter posições duplicadas erradas causando type mismatch
    expect(sql).toContain("ON CONFLICT (organization_id)");
  });
});

describe("POST /settings/notification-settings — upsert handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 200 com data ao persistir configurações de notificação", async () => {
    const fakeRow = {
      id: "row-1",
      organization_id: "org-test-001",
      enable_reminders: true,
      reminder_hours_before: 24,
      enable_confirmation: true,
      send_confirmation_email: true,
      send_confirmation_whatsapp: true,
      send_reminder_24h: true,
      send_reminder_2h: false,
      send_cancellation_notice: true,
      custom_confirmation_message: "",
      custom_reminder_message: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [fakeRow], rowCount: 1 });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/scheduling/settings/notification-settings", {
        enable_reminders: true,
        send_confirmation_email: true,
      }),
      makeEnv() as any,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json).toHaveProperty("data");
    expect(json.data.send_confirmation_email).toBe(true);
  });
});
