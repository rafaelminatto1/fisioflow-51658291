import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockRunAi = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: () => ({
    query: mockQuery,
  }),
}));

vi.mock("../../lib/ai-native", () => ({
  runAi: (...args: unknown[]) => mockRunAi(...args),
  readAiText: () => "",
}));

describe("ai-concierge — disponibilidade automática", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T15:00:00Z"));
    mockQuery.mockReset();
    mockRunAi.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("responde horários de amanhã de manhã quando a config está ligada", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [
            {
              concierge: {
                availabilityAutoReply: true,
                availabilityScope: "organization",
                availabilityProfileSlug: "",
              },
            },
          ],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }, { id: "ther-2" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({
          rows: [
            { slot: "07:00", booked_count: 2 },
            { slot: "07:30", booked_count: 1 },
            { slot: "08:00", booked_count: 0 },
            { slot: "12:00", booked_count: 0 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Quais horários disponíveis para amanhã de manhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.intent).toBe("scheduling");
    expect(response.reply).toContain("amanhã de manhã");
    expect(response.reply).toContain("07:30");
    expect(response.reply).toContain("08:00");
    expect(response.reply).not.toContain("07:00");
    expect(response.reply).not.toContain("12:00");
    expect(mockRunAi).not.toHaveBeenCalled();
  });

  it("não responde disponibilidade quando a config está desligada", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ concierge: { availabilityAutoReply: false } }],
    });
    mockRunAi.mockResolvedValue({
      response: JSON.stringify({ reply: "", intent: "other", answerable: false }),
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Quais horários disponíveis para amanhã?",
      [],
    );

    expect(response.answerable).toBe(false);
    expect(mockRunAi).toHaveBeenCalledOnce();
  });

  it("entende dia da semana com semana que vem", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-13");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário disponível na segunda que vem à tarde?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("segunda que vem à tarde");
  });

  it("entende data explícita no formato dd/mm", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-05");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Quais horários disponíveis em 05/07 de manhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("05/07 de manhã");
  });

  it("entende prazo relativo em dias", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-17");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário disponível daqui a 15 dias à noite?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("daqui a 15 dias à noite");
  });

  it("entende 'outra semana' como próxima semana útil", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-11");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário no sábado da outra semana?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("sábado que vem");
  });

  it("entende prazo relativo em semanas por extenso", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-16");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário daqui duas semanas à tarde?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("daqui a 2 semanas à tarde");
  });

  it("entende próxima quinzena", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-07-16");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Quais horários vocês têm na próxima quinzena de manhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("na próxima quinzena de manhã");
  });

  it("entende intervalo entre dias da semana", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário entre terça e quinta à noite?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("entre terça e quinta à noite");
    expect(requestedDates).toEqual(["2026-07-07", "2026-07-08", "2026-07-09"]);
    expect(response.reply).toContain("ter.");
    expect(response.reply).toContain("qua.");
    expect(response.reply).toContain("qui.");
  });

  it("entende próximo mês", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-08-01");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Vocês têm horário disponível no próximo mês de manhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("no próximo mês de manhã");
  });

  it("entende mês por nome", async () => {
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        expect(params?.[1]).toBe("2026-08-12");
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário dia 12 de agosto à tarde?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("12 de agosto à tarde");
  });

  it("entende janela depois das 18h", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário amanhã depois das 18h?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("amanhã depois das 18h");
    expect(response.reply).toContain("18:00");
    expect(response.reply).not.toContain("17:30");
  });

  it("entende janela antes das 10h", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Quais horários vocês têm hoje antes das 10h?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("hoje antes das 10h");
    expect(response.reply).toContain("07:00");
    expect(response.reply).not.toContain("10:00");
  });

  it("entende faixa entre horas", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário amanhã entre 14h e 17h?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("amanhã entre 14h e 17h");
    expect(response.reply).toContain("14:00");
    expect(response.reply).toContain("17:00");
    expect(response.reply).not.toContain("13:30");
    expect(response.reply).not.toContain("18:00");
  });

  it("entende fim do mês", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário no fim do mês à tarde?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(requestedDates).toEqual(["2026-07-25", "2026-07-26", "2026-07-27", "2026-07-28"]);
    expect(response.reply).toContain("no fim do mês à tarde");
  });

  it("entende 'mais pro fim do mês' como fim do mês", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem algo mais pro fim do mês?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(requestedDates).toEqual(["2026-07-25", "2026-07-26", "2026-07-27", "2026-07-28"]);
  });

  it("entende terça ou quarta como escolha de dias", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário terça ou quarta à tarde?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(requestedDates).toEqual(["2026-07-07", "2026-07-08"]);
    expect(response.reply).toContain("terça ou quarta à tarde");
  });

  it("entende logo depois do almoço", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário amanhã logo depois do almoço?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("amanhã logo depois do almoço");
    expect(response.reply).toContain("13:00");
    expect(response.reply).not.toContain("15:00");
  });

  it("interpreta 'depois das 5' como 17h por padrão", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem qualquer horário depois das 5 amanhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("amanhã depois das 17h");
    expect(response.reply).toContain("17:00");
    expect(response.reply).not.toContain("07:00");
  });

  it("entende 'cedo' como janela da manhã cedo", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário cedo amanhã?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(response.reply).toContain("amanhã cedo");
    expect(response.reply).toContain("07:00");
    expect(response.reply).not.toContain("10:00");
  });

  it("entende início de setembro", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário no começo de setembro?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(requestedDates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(response.reply).toContain("no começo de setembro");
  });

  it("entende terça ou quarta que vem", async () => {
    const requestedDates: string[] = [];
    mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM organizations")) {
        return Promise.resolve({
          rows: [{ concierge: { availabilityAutoReply: true, availabilityScope: "organization" } }],
        });
      }
      if (sql.includes("FROM profiles")) {
        return Promise.resolve({ rows: [{ id: "ther-1" }] });
      }
      if (sql.includes("FROM appointments")) {
        requestedDates.push(String(params?.[1] ?? ""));
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { AIConciergeService } = await import("../ai-concierge");
    const response = await AIConciergeService.processMessage(
      {} as any,
      "org-1",
      "Tem horário terça ou quarta que vem?",
      [],
    );

    expect(response.answerable).toBe(true);
    expect(requestedDates).toEqual(["2026-07-14", "2026-07-15"]);
    expect(response.reply).toContain("terça ou quarta que vem");
  });
});
