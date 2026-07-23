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
  it("expõe os tipos (Avaliação/Sessão) e NÃO expõe therapists", async () => {
    const data: any = await buildAppointmentScreen(mockPool(), {} as any);
    expect(data.types.map((t: any) => t.id)).toEqual(["evaluation", "session"]);
    expect(data.therapists).toBeUndefined();
    expect(data.slots).toEqual([]);
  });
});

describe("buildSlotsData (sessão = capacidade agregada)", () => {
  it("remove o horário lotado e normaliza a data epoch", async () => {
    const data: any = await buildSlotsData(mockPool(), {} as any, "session", "1785715200000"); // 2026-08-03
    const ids = data.slots.map((s: any) => s.id);
    expect(ids).not.toContain("08:00"); // lotado (1 agendamento / 1 fisio)
    expect(ids).toContain("08:30");
    expect(data.slots[0]).toHaveProperty("title");
  });
});

describe("buildSlotsData (avaliação = profissional designado)", () => {
  it("usa a disponibilidade do fisio designado", async () => {
    const data: any = await buildSlotsData(mockPool(), {} as any, "evaluation", "2026-08-03");
    const ids = data.slots.map((s: any) => s.id);
    expect(ids).not.toContain("08:00");
    expect(ids).toContain("08:30");
  });
});
