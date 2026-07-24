import { describe, it, expect, vi } from "vitest";
import { buildSlotsData, buildAppointmentScreen } from "../flowsBooking";

function mockPool() {
  return {
    query: vi.fn(async (sql: string) => {
      if (/FROM organizations ORDER BY created_at/.test(sql)) return { rows: [{ id: "org-1" }] };
      if (/SELECT id FROM profiles/.test(sql)) return { rows: [{ id: "fisio-1" }] }; // 1 fisio
      if (/evaluation_professional_id/.test(sql)) return { rows: [{ pid: null }] };
      // capacidade agregada: 08:00 com 1 agendamento (lotado, pois só 1 fisio)
      if (/GROUP BY 1/.test(sql)) return { rows: [{ t: "08:00", n: 1 }] };
      // disponibilidade de 1 fisio (avaliação): 08:00 ocupado
      if (/SELECT start_time FROM appointments/.test(sql)) return { rows: [{ start_time: "08:00:00" }] };
      return { rows: [] };
    }),
  } as any;
}

describe("buildAppointmentScreen", () => {
  it("expõe os tipos (Avaliação/Sessão) e períodos", async () => {
    const data: any = await buildAppointmentScreen(mockPool(), {} as any);
    expect(data.types.map((t: any) => t.id)).toEqual(["evaluation", "session"]);
    expect(data.periods.map((p: any) => p.id)).toEqual(["manha", "tarde_noite"]);
    expect(data.slots).toEqual([]);
  });
});

describe("buildSlotsData (horários cheios, períodos e sábado)", () => {
  it("retorna apenas horários cheios da manhã e inclui outra_hora", async () => {
    const data: any = await buildSlotsData(mockPool(), {} as any, "session", "2026-08-03", "manha"); // Segunda-feira
    const ids = data.slots.map((s: any) => s.id);
    expect(ids).not.toContain("08:00"); // lotado no mock
    expect(ids).not.toContain("08:30"); // horários fracionados removidos
    expect(ids).toContain("07:00");
    expect(ids).toContain("09:00");
    expect(ids).toContain("12:00");
    expect(ids).not.toContain("13:00"); // período tarde_noite não incluído em manha
    expect(ids).toContain("outra_hora");
  });

  it("retorna horários cheios da tarde/noite", async () => {
    const data: any = await buildSlotsData(mockPool(), {} as any, "session", "2026-08-03", "tarde_noite");
    const ids = data.slots.map((s: any) => s.id);
    expect(ids).toContain("13:00");
    expect(ids).toContain("20:00");
    expect(ids).not.toContain("07:00");
    expect(ids).toContain("outra_hora");
  });

  it("restringe sábado apenas aos horários da manhã (07h às 12h)", async () => {
    // 2026-08-01 é um Sábado
    const data: any = await buildSlotsData(mockPool(), {} as any, "session", "2026-08-01", "tarde_noite");
    const ids = data.slots.map((s: any) => s.id);
    expect(ids).toContain("07:00");
    expect(ids).toContain("12:00");
    expect(ids).not.toContain("13:00"); // pular tarde no sábado
    expect(ids).toContain("outra_hora");
  });
});
