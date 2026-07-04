import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMessage = vi.fn();
const mockSendInstagramText = vi.fn();
const mockAddMessage = vi.fn();
const mockNeedsHumanApproval = vi.fn();

vi.mock("../services/ai-concierge", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/ai-concierge")>();
  return {
    ...original,
    AIConciergeService: {
      processMessage: (...args: unknown[]) => mockProcessMessage(...args),
    },
  };
});

vi.mock("../routes/instagram-webhook", () => ({
  sendInstagramText: (...args: unknown[]) => mockSendInstagramText(...args),
}));

vi.mock("../lib/whatsapp-conversations", () => ({
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("../lib/whatsappApproval", () => ({
  needsHumanApproval: (...args: unknown[]) => mockNeedsHumanApproval(...args),
}));

const GREETING =
  "Boa tarde, tudo bem?\nSou o Rafael da Activity Fisioterapia.\nComo posso ajudar?";

const CONV_ROW = {
  id: "conv-ig-1",
  organization_id: "org-1",
  contact_id: "contact-1",
  igsid: "ig-user-1",
  last_at: new Date(Date.now() - 10 * 60000).toISOString(),
  last_content: '"quanto custa a sessão?"',
  last_message_type: "text",
  last_media_url: null,
  concierge: { instagramAutoReply: true },
  ig_account_id: "178414000000",
  ig_token: "tok",
  recent_out: 0,
};

function makePool(historyRows: Array<{ direction: string; content: string }>) {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("c.channel = 'instagram'")) return { rows: [CONV_ROW] };
      if (sql.includes("ORDER BY created_at DESC")) return { rows: historyRows };
      return { rows: [] };
    }),
  };
}

const ENV = { IG_ACCESS_TOKEN: "env-token" } as any;

beforeEach(() => {
  mockProcessMessage.mockReset().mockResolvedValue({
    answerable: true,
    reply: "A sessão avulsa custa R$ 180,00.",
    intent: "information",
  });
  mockSendInstagramText.mockReset().mockResolvedValue({ message_id: "mid-1" });
  mockAddMessage.mockReset().mockResolvedValue({ id: "m1" });
  mockNeedsHumanApproval.mockReset().mockReturnValue(false);
});

describe("dispatchInstagramConcierge", () => {
  it("passa o histórico da conversa ao concierge (não mais [])", async () => {
    const { dispatchInstagramConcierge } = await import("../cron");
    // A query é ORDER BY created_at DESC — mais novo primeiro.
    const pool = makePool([
      { direction: "inbound", content: '"quanto custa a sessão?"' },
      { direction: "outbound", content: JSON.stringify(GREETING) },
    ]);
    await dispatchInstagramConcierge(pool, ENV);

    expect(mockProcessMessage).toHaveBeenCalledTimes(1);
    const history = mockProcessMessage.mock.calls[0][3];
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toEqual({ role: "assistant", content: GREETING });
  });

  it("não se reapresenta quando já saudou nesta conversa", async () => {
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: `${GREETING}`,
      intent: "other",
    });
    const { dispatchInstagramConcierge } = await import("../cron");
    const pool = makePool([
      { direction: "inbound", content: '"oi de novo"' },
      { direction: "outbound", content: JSON.stringify(GREETING) },
    ]);
    await dispatchInstagramConcierge(pool, ENV);

    expect(mockSendInstagramText).toHaveBeenCalledTimes(1);
    const sent = String(mockSendInstagramText.mock.calls[0][3]);
    expect(sent).not.toContain("Sou o Rafael da Activity Fisioterapia");
    expect(sent.length).toBeGreaterThan(1);
  });

  it("segue enviando normalmente quando não há saudação prévia", async () => {
    const { dispatchInstagramConcierge } = await import("../cron");
    const pool = makePool([{ direction: "inbound", content: '"quanto custa?"' }]);
    await dispatchInstagramConcierge(pool, ENV);
    expect(mockSendInstagramText).toHaveBeenCalledTimes(1);
    expect(String(mockSendInstagramText.mock.calls[0][3])).toContain("180");
  });

  it("janela 'humano atendendo' unificada: a query filtra sender_type='agent' em 15 min", async () => {
    const { dispatchInstagramConcierge } = await import("../cron");
    const pool = makePool([]);
    await dispatchInstagramConcierge(pool, ENV);
    const mainSql = String(
      pool.query.mock.calls.find(([sql]: [string]) =>
        String(sql).includes("c.channel = 'instagram'"),
      )?.[0] ?? "",
    );
    expect(mainSql).toContain("sender_type = 'agent'");
    expect(mainSql).toContain("'15 minutes'");
    expect(mainSql).not.toContain("'5 minutes'");
  });

  it("cria tarefa 'Efetivar reserva' quando a resposta traz bookingRequest", async () => {
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: "Perfeito! Anotei 10h aqui.",
      intent: "scheduling",
      bookingRequest: { slotLabel: "10h" },
    });
    const { dispatchInstagramConcierge } = await import("../cron");
    const pool = makePool([]);
    await dispatchInstagramConcierge(pool, ENV);
    const insert = pool.query.mock.calls.find((call: unknown[]) =>
      String(call[0]).includes("INSERT INTO tarefas"),
    ) as unknown[] | undefined;
    expect(insert).toBeTruthy();
    expect(String((insert?.[1] as unknown[])?.[1])).toContain("Efetivar reserva");
  });
});
