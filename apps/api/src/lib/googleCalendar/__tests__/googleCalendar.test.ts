import { describe, it, expect, vi, beforeEach } from "vitest";
import { appointmentToGoogleEvent, taskToGoogleEvent } from "../mapEvent";
import { refreshAccessToken, insertCalendarEvent } from "../client";

describe("taskToGoogleEvent", () => {
  it("mapeia tarefa com prazo para bloco de 30min às 09h", () => {
    const ev = taskToGoogleEvent({
      id: "t1",
      titulo: "Cobrar convênio",
      data_vencimento: "2026-07-15",
    });
    expect(ev.summary).toBe("Tarefa — Cobrar convênio");
    expect(ev.start).toEqual({ dateTime: "2026-07-15T09:00:00", timeZone: "America/Sao_Paulo" });
    expect(ev.end.dateTime).toBe("2026-07-15T09:30:00");
    expect(ev.description).toContain("#t1");
  });

  it("usa hora_vencimento quando presente e limpa HTML da descrição", () => {
    const ev = taskToGoogleEvent({
      titulo: "Relatório",
      data_vencimento: "2026-07-15T00:00:00.000Z",
      hora_vencimento: "14:30",
      descricao: "<p>Enviar <b>hoje</b></p>",
    });
    expect(ev.start.dateTime).toBe("2026-07-15T14:30:00");
    expect(ev.end.dateTime).toBe("2026-07-15T15:00:00");
    expect(ev.description).toContain("Enviar hoje");
    expect(ev.description).not.toContain("<p>");
  });
});

describe("appointmentToGoogleEvent", () => {
  it("maps date + start/end to a São Paulo event", () => {
    const ev = appointmentToGoogleEvent({
      id: "a1",
      patientName: "Maria",
      date: "2026-07-01",
      startTime: "09:00",
      endTime: "09:45",
    });
    expect(ev.summary).toBe("Atendimento — Maria");
    expect(ev.start).toEqual({ dateTime: "2026-07-01T09:00:00", timeZone: "America/Sao_Paulo" });
    expect(ev.end.dateTime).toBe("2026-07-01T09:45:00");
    expect(ev.description).toContain("#a1");
  });

  it("computes end from duration when end is absent", () => {
    const ev = appointmentToGoogleEvent({ patient_name: "João", date: "2026-07-01", start_time: "10:00:00", durationMinutes: 30 });
    expect(ev.end.dateTime).toBe("2026-07-01T10:30:00");
  });

  it("normaliza `date` quando vem como timestamp ISO (Appointment.date é Date → JSON vira ISO)", () => {
    // O front serializa o Appointment; `date: Date` vira "2026-07-01T00:00:00.000Z".
    // Sem normalização o dateTime saía como "2026-07-01T00:00:00.000ZT09:00:00" (RFC3339 inválido).
    const ev = appointmentToGoogleEvent({
      patientName: "Maria",
      date: "2026-07-01T00:00:00.000Z",
      startTime: "09:00",
      endTime: "09:45",
    } as any);
    expect(ev.start.dateTime).toBe("2026-07-01T09:00:00");
    expect(ev.end.dateTime).toBe("2026-07-01T09:45:00");
  });

  it("extrai HH:MM quando o horário vem como timestamp ISO completo", () => {
    const ev = appointmentToGoogleEvent({
      patientName: "Ana",
      date: "2026-07-01",
      start_time: "2026-07-01T14:30:00.000Z",
      durationMinutes: 60,
    } as any);
    expect(ev.start.dateTime).toBe("2026-07-01T14:30:00");
    expect(ev.end.dateTime).toBe("2026-07-01T15:30:00");
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("returns null without credentials", async () => {
    expect(await refreshAccessToken({} as any, "rt")).toBeNull();
  });
  it("exchanges refresh_token for an access_token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ access_token: "at1" }), { status: 200 })));
    const at = await refreshAccessToken({ GOOGLE_CLIENT_ID: "c", GOOGLE_CLIENT_SECRET: "s" } as any, "rt");
    expect(at).toBe("at1");
  });
});

describe("insertCalendarEvent", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("POSTs the event and returns the created id", async () => {
    const f = vi.fn(async (_u: any, _i?: any) => new Response(JSON.stringify({ id: "evt_123" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const out = await insertCalendarEvent("at1", "primary", {
      summary: "x",
      start: { dateTime: "2026-07-01T09:00:00", timeZone: "America/Sao_Paulo" },
      end: { dateTime: "2026-07-01T09:45:00", timeZone: "America/Sao_Paulo" },
    });
    expect(out.id).toBe("evt_123");
    expect(String(f.mock.calls[0][0])).toContain("/calendars/primary/events");
    expect((f.mock.calls[0][1] as any).headers.Authorization).toBe("Bearer at1");
  });
  it("throws on API error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    await expect(
      insertCalendarEvent("at1", "primary", { summary: "x", start: { dateTime: "", timeZone: "" }, end: { dateTime: "", timeZone: "" } }),
    ).rejects.toThrow(/403/);
  });
});
