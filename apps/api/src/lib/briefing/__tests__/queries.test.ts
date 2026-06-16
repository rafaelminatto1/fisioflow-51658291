import { describe, it, expect, vi } from "vitest";
import { gatherBriefingData } from "../queries";

describe("gatherBriefingData", () => {
  it("runs the three org-scoped queries and assembles raw data", async () => {
    const sql = vi.fn(async (q: string, _p?: unknown[]) => {
      if (q.includes("LIKE 'faltou%'")) return { rows: [{ n: 3 }] };
      if (q.includes("FROM patients")) return { rows: [{ n: 7 }] };
      if (q.includes("ORDER BY start_time")) {
        return { rows: [{ id: "1", start_time: "09:00", status: "agendado", patient_id: "p1" }] };
      }
      return { rows: [] };
    });
    const raw = await gatherBriefingData(sql as any, "org-1");
    expect(raw.appointmentsToday).toHaveLength(1);
    expect(raw.appointmentsToday[0]).toMatchObject({ id: "1", status: "agendado", patientId: "p1" });
    expect(raw.noShowsYesterday).toBe(3);
    expect(raw.inactivePatients).toBe(7);
    // all queries scoped to org
    for (const call of sql.mock.calls) expect(call[1]).toEqual(["org-1"]);
  });
});
