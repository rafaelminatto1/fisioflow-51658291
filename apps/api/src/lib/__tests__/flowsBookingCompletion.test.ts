import { describe, it, expect, vi } from "vitest";
import {
  isBookingIntent,
  createBookingRequestFromFlow,
} from "../flowsBookingCompletion";

describe("isBookingIntent", () => {
  it("detecta pedidos claros de agendar", () => {
    expect(isBookingIntent("quero agendar")).toBe(true);
    expect(isBookingIntent("gostaria de marcar uma avaliação")).toBe(true);
    expect(isBookingIntent("agendar sessão de fisio")).toBe(true);
    expect(isBookingIntent("Agendamento")).toBe(true);
    expect(isBookingIntent("posso agendar um horário?")).toBe(true);
  });
  it("ignora mensagens sem intenção de agendar", () => {
    expect(isBookingIntent("bom dia, tudo bem?")).toBe(false);
    expect(isBookingIntent("quanto custa a sessão?")).toBe(false);
    expect(isBookingIntent("")).toBe(false);
    expect(isBookingIntent(undefined)).toBe(false);
  });
});

describe("createBookingRequestFromFlow", () => {
  it("cria o pedido e monta a confirmação (normaliza data epoch e tipo)", async () => {
    const calls: any[] = [];
    const pool = {
      query: vi.fn(async (sql: string, params: any[]) => {
        calls.push({ sql, params });
        if (/FROM profiles/.test(sql)) {
          return { rows: [{ user_id: "user-1", full_name: "Dra. Ana" }] };
        }
        return { rows: [] };
      }),
    } as any;

    // 2026-08-03 em epoch millis (UTC) = 1785715200000
    const res = await createBookingRequestFromFlow(pool, "org-1", "João", "5511999999999", {
      type: "evaluation",
      therapist: "therapist-1",
      date: "1785715200000",
      slot: "08:30",
    });

    expect(res).not.toBeNull();
    expect(res!.professionalName).toBe("Dra. Ana");
    expect(res!.typeLabel).toBe("Avaliação");
    expect(res!.isoDate).toBe("2026-08-03");
    expect(res!.time).toBe("08:30");
    expect(res!.confirmationText).toContain("Avaliação");
    expect(res!.confirmationText).toContain("Dra. Ana");
    expect(res!.confirmationText).toContain("03/08/2026 às 08:30");

    const insert = calls.find((c) => /INSERT INTO public_booking_requests/.test(c.sql));
    expect(insert).toBeTruthy();
    expect(insert.params).toContain("2026-08-03");
    expect(insert.params).toContain("08:30");
  });

  it("retorna null se faltar dado ou profissional inexistente", async () => {
    const poolNoProf = { query: vi.fn(async () => ({ rows: [] })) } as any;
    expect(
      await createBookingRequestFromFlow(poolNoProf, "org-1", "João", "5511", {
        therapist: "x",
        date: "2026-08-03",
        slot: "08:30",
      }),
    ).toBeNull();
    expect(
      await createBookingRequestFromFlow(poolNoProf, "org-1", "João", "5511", { type: "session" }),
    ).toBeNull();
  });
});
