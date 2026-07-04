import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMessage = vi.fn();
const mockSendTextMessage = vi.fn();
const mockAddMessage = vi.fn();

vi.mock("../lib/db", () => ({
  createPool: vi.fn(() => ({ query: vi.fn(async () => ({ rows: [] })) })),
}));

vi.mock("../lib/whatsapp-identity", () => ({
  resolveOrCreateContact: vi.fn(),
  linkContactToPatient: vi.fn(),
}));

vi.mock("../lib/whatsapp-conversations", () => ({
  findOrCreateConversation: vi.fn(),
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("../lib/realtime", () => ({
  broadcastToOrg: vi.fn(),
}));

vi.mock("../lib/analytics", () => ({
  writeEvent: vi.fn(),
}));

vi.mock("../lib/media-mirror", () => ({
  mirrorWhatsAppMedia: vi.fn(),
}));

vi.mock("../lib/whatsapp", () => ({
  WhatsAppService: class {
    sendTextMessage(...args: unknown[]) {
      return mockSendTextMessage(...args);
    }
  },
}));

vi.mock("../services/ai-concierge", async (importOriginal) => {
  const original = await importOriginal<typeof import("../services/ai-concierge")>();
  return {
    ...original,
    AIConciergeService: {
      processMessage: (...args: unknown[]) => mockProcessMessage(...args),
    },
  };
});

function makePool() {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("FROM organizations"))
        return { rows: [{ concierge: { enabled: true, autoReplyNewLeads: true } }] };
      // sem resposta humana recente, sem histórico
      return { rows: [] };
    }),
  };
}

const ENV = {} as any;

beforeEach(() => {
  mockProcessMessage.mockReset();
  mockSendTextMessage.mockReset().mockResolvedValue({ messages: [{ id: "wamid.1" }] });
  mockAddMessage.mockReset().mockResolvedValue({ id: "m1" });
});

describe("processConciergeAsync — aprovação humana p/ conteúdo sensível", () => {
  it("não envia auto-resposta quando a mensagem tem conteúdo clínico sensível", async () => {
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: "Sim, tratamos lesões no joelho.",
      intent: "information",
    });
    const { processConciergeAsync } = await import("../queues/whatsapp-inbound");
    await processConciergeAsync(
      ENV,
      makePool(),
      "org-1",
      "conv-1",
      "contact-1",
      "5511999998888",
      "Sinto muita dor no joelho desde a cirurgia, vocês tratam?",
    );
    expect(mockSendTextMessage).not.toHaveBeenCalled();
    expect(mockAddMessage).not.toHaveBeenCalled();
  });

  it("envia normalmente quando a pergunta não é sensível", async () => {
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: "A sessão avulsa custa R$ 180,00.",
      intent: "information",
    });
    const { processConciergeAsync } = await import("../queues/whatsapp-inbound");
    await processConciergeAsync(
      ENV,
      makePool(),
      "org-1",
      "conv-1",
      "contact-1",
      "5511999998888",
      "Quanto custa a sessão?",
    );
    expect(mockSendTextMessage).toHaveBeenCalledTimes(1);
  });

  it("bloqueia intent urgent mesmo sem termos do padrão sensível", async () => {
    mockProcessMessage.mockResolvedValue({
      answerable: true,
      reply: "Procure atendimento.",
      intent: "urgent",
    });
    const { processConciergeAsync } = await import("../queues/whatsapp-inbound");
    await processConciergeAsync(
      ENV,
      makePool(),
      "org-1",
      "conv-1",
      "contact-1",
      "5511999998888",
      "preciso de ajuda agora, é grave",
    );
    expect(mockSendTextMessage).not.toHaveBeenCalled();
  });
});
