import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../routes/evidence", () => ({
  runSearch: vi.fn(async () => ({ count: 1, data: [{ pmid: "1" }] })),
}));

const sql = vi.fn(async () => ({ rows: [{ id: "p1", name: "X" }] }));
vi.mock("../../db", () => ({ getRawSql: () => sql }));

import { buildRegistry } from "../../../agents/tools";

const ctx = {
  env: {} as any,
  user: { uid: "u", organizationId: "11111111-1111-4111-8111-111111111111" } as any,
  token: "tok",
  baseUrl: "https://api.test",
};

describe("copilot tools registry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the four tools", () => {
    const names = buildRegistry()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual([
      "get_patient_history",
      "schedule_session",
      "search_evidence",
      "search_exercises",
    ]);
  });

  it("search_evidence delegates to runSearch", async () => {
    const t = buildRegistry().find((t) => t.name === "search_evidence")!;
    const out: any = await t.execute(ctx, { q: "knee pain" });
    expect(out.count).toBe(1);
  });

  it("search_exercises queries the db", async () => {
    const t = buildRegistry().find((t) => t.name === "search_exercises")!;
    const out: any = await t.execute(ctx, { q: "agachamento" });
    expect(Array.isArray(out)).toBe(true);
    expect(sql).toHaveBeenCalled();
  });

  it("schedule_session self-fetches the appointments endpoint", async () => {
    const f = vi.fn(async (..._a: unknown[]) => new Response(JSON.stringify({ data: { id: "a1" } }), { status: 201 }));
    vi.stubGlobal("fetch", f);
    const t = buildRegistry().find((t) => t.name === "schedule_session")!;
    await t.execute(ctx, {
      patientId: "11111111-1111-4111-8111-111111111111",
      date: "2026-07-01",
      startTime: "09:00",
    });
    expect(String(f.mock.calls[0][0])).toContain("https://api.test/api/appointments");
  });
});
