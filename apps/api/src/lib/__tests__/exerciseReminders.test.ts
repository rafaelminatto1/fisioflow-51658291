import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnabled = vi.fn();
const mockSend = vi.fn(async (..._a: any[]) => ({ sent: true }));
vi.mock("../whatsappAutomations", () => ({
  areAutomationsEnabled: (...a: any[]) => mockEnabled(...a),
  sendAutomationTemplate: (...a: any[]) => mockSend(...a),
}));

import { dispatchExerciseReminders } from "../exerciseReminders";

function makePool(handlers: { candidates: any[]; claim?: (id: string) => any[] }) {
  return {
    query: vi.fn((sql: string, params?: any[]) => {
      if (/FROM appointments/.test(sql)) return Promise.resolve({ rows: handlers.candidates });
      if (/INSERT INTO appointment_reminder_log/.test(sql)) {
        const rows = handlers.claim ? handlers.claim(params?.[0]) : [{ "?column?": 1 }];
        return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
  } as any;
}

const env = {} as any;

describe("dispatchExerciseReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnabled.mockResolvedValue(true);
  });

  it("envia lembrete_exercicios_v1 (1º nome) p/ candidato com claim novo", async () => {
    const pool = makePool({
      candidates: [
        { id: "appt-1", organization_id: "org-1", full_name: "Ana Paula", phone: "5511999990000" },
      ],
    });

    const out = await dispatchExerciseReminders(pool, env);

    expect(out.sent).toBe(1);
    expect(mockSend).toHaveBeenCalledWith(env, "org-1", "5511999990000", "lembrete_exercicios_v1", [
      "Ana",
    ]);
  });

  it("NÃO reenvia quando o claim colide (dedup via appointment_reminder_log)", async () => {
    const pool = makePool({
      candidates: [
        { id: "appt-1", organization_id: "org-1", full_name: "Ana", phone: "5511999990000" },
      ],
      claim: () => [], // ON CONFLICT DO NOTHING → 0 linhas
    });

    const out = await dispatchExerciseReminders(pool, env);

    expect(out.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("NÃO faz claim nem envia quando a org está com automações desligadas", async () => {
    mockEnabled.mockResolvedValue(false);
    const pool = makePool({
      candidates: [
        { id: "appt-1", organization_id: "org-1", full_name: "Ana", phone: "5511999990000" },
      ],
    });

    const out = await dispatchExerciseReminders(pool, env);

    expect(out.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
    const claimCall = pool.query.mock.calls.find((c: any[]) =>
      /INSERT INTO appointment_reminder_log/.test(String(c[0])),
    );
    expect(claimCall).toBeFalsy();
  });
});
