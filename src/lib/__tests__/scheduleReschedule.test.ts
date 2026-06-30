import { describe, it, expect } from "vitest";
import { rescheduleParamsFromDrag } from "../scheduleReschedule";

describe("rescheduleParamsFromDrag", () => {
  it("resize: calcula a nova duração a partir do fim (não mantém a antiga)", () => {
    const out = rescheduleParamsFromDrag(
      "2026-07-01T09:00",
      "2026-07-01T10:30",
      60, // duração antiga
    );
    expect(out).toEqual({ date: "2026-07-01", time: "09:00", durationMinutes: 90 });
  });

  it("move: duração preservada quando o fim acompanha o início", () => {
    const out = rescheduleParamsFromDrag("2026-07-02T14:00", "2026-07-02T15:00", 60);
    expect(out).toEqual({ date: "2026-07-02", time: "14:00", durationMinutes: 60 });
  });

  it("sem fim: usa a duração de fallback", () => {
    const out = rescheduleParamsFromDrag("2026-07-01T09:00", undefined, 45);
    expect(out).toEqual({ date: "2026-07-01", time: "09:00", durationMinutes: 45 });
  });

  it("início sem horário (all-day): não calcula duração, usa fallback", () => {
    const out = rescheduleParamsFromDrag("2026-07-01", "2026-07-02", 30);
    expect(out).toEqual({ date: "2026-07-01", time: "", durationMinutes: 30 });
  });

  it("entrada inválida → null", () => {
    expect(rescheduleParamsFromDrag("xpto", undefined, 60)).toBeNull();
  });
});
