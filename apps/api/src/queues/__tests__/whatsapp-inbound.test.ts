import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockResolveOrCreateContact = vi.fn();
const mockLinkContactToPatient = vi.fn();
const mockFindOrCreateConversation = vi.fn();
const mockAddMessage = vi.fn();
const mockBroadcastToOrg = vi.fn();
const mockWriteEvent = vi.fn();
const mockProcessMessage = vi.fn();
const mockSendTextMessage = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
  resolveOrCreateContact: (...args: unknown[]) => mockResolveOrCreateContact(...args),
  linkContactToPatient: (...args: unknown[]) => mockLinkContactToPatient(...args),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
  findOrCreateConversation: (...args: unknown[]) => mockFindOrCreateConversation(...args),
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("../../lib/realtime", () => ({
  broadcastToOrg: (...args: unknown[]) => mockBroadcastToOrg(...args),
}));

vi.mock("../../lib/analytics", () => ({
  writeEvent: (...args: unknown[]) => mockWriteEvent(...args),
}));

vi.mock("../../services/ai-concierge", async (importActual) => {
  const actual = await importActual<typeof import("../../services/ai-concierge")>();
  return {
    ...actual, // mantém os helpers puros (buildConciergeHistory, shouldSkipGreeting)
    AIConciergeService: {
      processMessage: (...args: unknown[]) => mockProcessMessage(...args),
    },
  };
});

vi.mock("../../lib/whatsapp", () => ({
  WhatsAppService: class {
    sendTextMessage(...args: unknown[]) {
      return mockSendTextMessage(...args);
    }
  },
}));

import { handleWhatsAppInboundQueue } from "../whatsapp-inbound";

const ENV = {
  WHATSAPP_PHONE_NUMBER_ID: "phone-1",
  WHATSAPP_ACCESS_TOKEN: "token-1",
  // No DB → skip idempotency branch for simplicity.
} as any;

function makeBatch(text = "Quais os horários?") {
  const ack = vi.fn();
  const retry = vi.fn();
  return {
    ack,
    retry,
    batch: {
      messages: [
        {
          ack,
          retry,
          body: {
            type: "inbound_message",
            metaMessageId: "wamid.in1",
            waId: "5511993524642",
            from: "5511993524642",
            text,
            messageType: "text",
            rawPayload: {},
            organizationId: null,
            phoneNumberId: "phone-1",
            timestamp: new Date().toISOString(),
          },
        },
      ],
    } as any,
  };
}

describe("handleWhatsAppInboundQueue — concierge auto-reply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      return Promise.resolve({ rows: [] });
    });
    mockResolveOrCreateContact.mockResolvedValue({ id: "contact-1", patient_id: "p1", display_name: "Rafael" });
    mockFindOrCreateConversation.mockResolvedValue({ id: "conversation-1" });
    mockAddMessage.mockResolvedValue({ id: "message-1", created_at: "2026-06-29T00:00:00Z" });
    mockProcessMessage.mockResolvedValue({ answerable: true, reply: "Atendemos das 8h às 18h." });
    mockSendTextMessage.mockResolvedValue({ messages: [{ id: "wamid.reply1" }] });
  });

  it("actually sends the concierge reply to the customer via Meta", async () => {
    const { batch, ack } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    expect(mockSendTextMessage).toHaveBeenCalledWith("5511993524642", "Atendemos das 8h às 18h.");
    expect(ack).toHaveBeenCalled();
  });

  it("persists the concierge reply as an outbound message", async () => {
    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    const outboundCall = mockAddMessage.mock.calls.find(
      (call) => call.includes("outbound") && call.includes("Atendemos das 8h às 18h."),
    );
    expect(outboundCall).toBeTruthy();
  });

  it("NÃO responde quando um humano assumiu a conversa (ainda aberta) — sem janela de tempo", async () => {
    // Um agente humano respondeu há 2h (fora dos 15min antigos), conversa ainda aberta.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      if (/sender_type = 'agent'/.test(sql))
        return Promise.resolve({ rows: [{ last_agent_at: twoHoursAgo, conv_status: "pending" }] });
      return Promise.resolve({ rows: [] });
    });

    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    // O humano é o dono da conversa: o concierge fica em silêncio (não processa nem envia).
    expect(mockProcessMessage).not.toHaveBeenCalled();
    expect(mockSendTextMessage).not.toHaveBeenCalled();
  });

  it("volta a responder quando a conversa foi resolvida/fechada", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      if (/sender_type = 'agent'/.test(sql))
        return Promise.resolve({ rows: [{ last_agent_at: twoHoursAgo, conv_status: "resolved" }] });
      return Promise.resolve({ rows: [] });
    });

    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    expect(mockSendTextMessage).toHaveBeenCalledWith("5511993524642", "Atendemos das 8h às 18h.");
  });

  it("com janela finita (humanReplyPauseHours), volta a responder após a janela expirar", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      if (/->'concierge'/.test(sql) || /concierge\b/.test(sql))
        return Promise.resolve({ rows: [{ concierge: { humanReplyPauseHours: 1 } }] });
      if (/sender_type = 'agent'/.test(sql))
        return Promise.resolve({ rows: [{ last_agent_at: twoHoursAgo, conv_status: "pending" }] });
      return Promise.resolve({ rows: [] });
    });

    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    // Janela de 1h já expirou (última fala humana há 2h) → concierge pode responder.
    expect(mockSendTextMessage).toHaveBeenCalledWith("5511993524642", "Atendemos das 8h às 18h.");
  });

  it("com janela finita, permanece em silêncio dentro da janela", async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      if (/->'concierge'/.test(sql) || /concierge\b/.test(sql))
        return Promise.resolve({ rows: [{ concierge: { humanReplyPauseHours: 1 } }] });
      if (/sender_type = 'agent'/.test(sql))
        return Promise.resolve({ rows: [{ last_agent_at: fiveMinAgo, conv_status: "pending" }] });
      return Promise.resolve({ rows: [] });
    });

    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    expect(mockSendTextMessage).not.toHaveBeenCalled();
  });

  it("pedido explícito de humano: envia ponte, NÃO chama o LLM e cria tarefa", async () => {
    const inserts: string[] = [];
    mockQuery.mockImplementation((sql: string) => {
      inserts.push(sql);
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      return Promise.resolve({ rows: [] });
    });

    const { batch } = makeBatch("quero falar com um atendente");
    await handleWhatsAppInboundQueue(batch, ENV);

    // Não consulta o LLM (handoff é determinístico, antes do modelo).
    expect(mockProcessMessage).not.toHaveBeenCalled();
    // Envia a mensagem-ponte acolhedora.
    expect(mockSendTextMessage).toHaveBeenCalledTimes(1);
    const bridge = String(mockSendTextMessage.mock.calls[0][1]);
    expect(/equipe|pessoa|algu[eé]m/i.test(bridge)).toBe(true);
    // Marca a pausa do concierge e cria a tarefa p/ a equipe.
    expect(inserts.some((s) => /concierge_handoff_at/.test(s))).toBe(true);
    expect(inserts.some((s) => /INSERT INTO tarefas/.test(s))).toBe(true);
  });

  it("responde curto (sem apresentação) quando o assistente já saudou nesta conversa", async () => {
    const apresentacao =
      "Bom dia, tudo bem?\nSou o assistente virtual da Activity Fisioterapia.\nComo posso ajudar?";
    // Histórico já contém uma saudação anterior do assistente.
    mockQuery.mockImplementation((sql: string) => {
      if (/whatsapp_phone_number_id/.test(sql)) return Promise.resolve({ rows: [{ id: "org-1" }] });
      // Check "atendente humano respondeu recentemente?" → não respondeu.
      if (/sender_type = 'agent'/.test(sql)) return Promise.resolve({ rows: [] });
      if (/FROM wa_messages/.test(sql)) {
        return Promise.resolve({
          rows: [
            { direction: "inbound", content: "oi" },
            { direction: "outbound", content: apresentacao },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    // O concierge responderia com a apresentação de novo.
    mockProcessMessage.mockResolvedValue({ answerable: true, reply: apresentacao });

    const { batch } = makeBatch();
    await handleWhatsAppInboundQueue(batch, ENV);

    // Não repete a saudação nem se reapresenta; não fica mudo (fallback).
    expect(mockSendTextMessage).toHaveBeenCalledWith(
      "5511993524642",
      "Como posso ajudar?",
    );
  });
});
