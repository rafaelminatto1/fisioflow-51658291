import { describe, it, expect } from "vitest";
import { buildBriefing } from "../buildBriefing";

describe("buildBriefing", () => {
  it("aggregates counts by status and totals", () => {
    const b = buildBriefing({
      date: "2026-06-16",
      appointmentsToday: [
        { id: "1", startTime: "09:00", status: "agendado", patientId: "p1" },
        { id: "2", startTime: "10:00", status: "atendido", patientId: "p2" },
        { id: "3", startTime: "11:00", status: "agendado", patientId: "p3" },
      ],
      noShowsYesterday: 2,
      inactivePatients: 5,
    });
    expect(b.total).toBe(3);
    expect(b.countsByStatus).toEqual({ agendado: 2, atendido: 1 });
    expect(b.noShowsYesterday).toBe(2);
    expect(b.inactivePatients).toBe(5);
    expect(b.summary).toContain("3 atendimentos");
    expect(b.summary).toContain("Faltas ontem: 2");
  });

  it("handles an empty day", () => {
    const b = buildBriefing({ date: "2026-06-16", appointmentsToday: [], noShowsYesterday: 0, inactivePatients: 0 });
    expect(b.total).toBe(0);
    expect(b.countsByStatus).toEqual({});
    expect(b.summary).toContain("0 atendimentos");
  });
});
