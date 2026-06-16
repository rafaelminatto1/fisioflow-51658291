import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleSession, scheduleSessionSchema } from "../tools/scheduleSession";

describe("scheduleSession", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("validates required fields and formats", () => {
    expect(() =>
      scheduleSessionSchema.parse({ patientId: "11111111-1111-4111-8111-111111111111" }),
    ).toThrow();
    const ok = scheduleSessionSchema.parse({
      patientId: "11111111-1111-4111-8111-111111111111",
      date: "2026-07-01",
      startTime: "09:00",
    });
    expect(ok.date).toBe("2026-07-01");
  });
  it("POSTs to /api/appointments with the body", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "a1" }), { status: 201 }));
    vi.stubGlobal("fetch", f);
    await scheduleSession("https://api.test", "tok", {
      patientId: "11111111-1111-4111-8111-111111111111",
      date: "2026-07-01",
      startTime: "09:00",
      durationMinutes: 50,
    });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/api/appointments");
    expect((init as any).method).toBe("POST");
    const body = JSON.parse((init as any).body);
    expect(body).toMatchObject({
      patientId: "11111111-1111-4111-8111-111111111111",
      date: "2026-07-01",
      startTime: "09:00",
      durationMinutes: 50,
    });
  });
});
