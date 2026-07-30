import { describe, it, expect, vi } from "vitest";

// `cloudflare:workers` só existe no runtime workerd; este teste roda no
// projeto "node" do vitest, então mockamos o módulo para poder importar
// `shouldStillSend` sem subir o pool de workers.
vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {},
}));

// Testa a lógica pura de recheck extraída: shouldStillSend(row)
import { shouldStillSend } from "./appointmentReminder";

describe("shouldStillSend", () => {
  it("true p/ agendamento ativo no mesmo horário", () => {
    expect(
      shouldStillSend(
        { status: "agendado", date_str: "2026-08-05", time_str: "10:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(true);
  });
  it("false p/ cancelado", () => {
    expect(
      shouldStillSend(
        { status: "cancelado", date_str: "2026-08-05", time_str: "10:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(false);
  });
  it("false se remarcado p/ outro horário", () => {
    expect(
      shouldStillSend(
        { status: "agendado", date_str: "2026-08-06", time_str: "11:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(false);
  });
  it("false se agendamento não existe (row null)", () => {
    expect(
      shouldStillSend(null, { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any),
    ).toBe(false);
  });
});
