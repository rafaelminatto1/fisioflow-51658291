import { describe, it, expect, vi } from "vitest";
import { buildSlotsData } from "../flowsBooking";

describe("flowsBooking.buildSlotsData", () => {
  it("devolve slots livres no formato do Flow (id/title), sem os já agendados", async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (/appointments/.test(sql)) return { rows: [{ start_time: "08:00:00" }] };
        return { rows: [] };
      }),
    } as any;
    const data = await buildSlotsData(pool, {} as any, "therapist-1", "2026-08-01");
    const ids = (data as any).slots.map((s: any) => s.id);
    expect(ids).not.toContain("08:00"); // agendado -> fora
    expect(ids).toContain("08:30");
    expect((data as any).slots[0]).toHaveProperty("title");
  });
});
