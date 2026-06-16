import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPatientHistory, getPatientHistorySchema } from "../tools/getPatientHistory";

describe("getPatientHistory", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires a uuid patientId", () => {
    expect(() => getPatientHistorySchema.parse({ patientId: "x" })).toThrow();
    expect(
      getPatientHistorySchema.parse({ patientId: "11111111-1111-4111-8111-111111111111" }).patientId,
    ).toMatch(/1111/);
  });
  it("fetches patient then sessions and merges", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("/api/sessions")
        ? new Response(JSON.stringify({ data: [{ id: "s1" }] }), { status: 200 })
        : new Response(JSON.stringify({ id: "p1", full_name: "Maria" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    const out = await getPatientHistory("https://api.test", "tok", {
      patientId: "11111111-1111-4111-8111-111111111111",
    });
    expect(out.patient).toMatchObject({ id: "p1" });
    expect(out.sessions).toHaveLength(1);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/api/patients/11111111-1111-4111-8111-111111111111"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/sessions?patientId=11111111-1111-4111-8111-111111111111"))).toBe(true);
  });
});
