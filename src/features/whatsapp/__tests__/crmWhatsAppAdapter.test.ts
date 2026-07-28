import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/services/whatsapp-api";
import { toCrmConversationViewModel, toCrmQuickReplies } from "../crmWhatsAppAdapter";

describe("crmWhatsAppAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deriva o contexto CRM principal a partir do conversation metadata", () => {
    const conversation: Conversation = {
      id: "conv-1",
      contactId: "contact-1",
      contactName: "Marina Alves",
      contactPhone: "+55 11 98432-1170",
      avatarUrl: "https://example.com/avatar.jpg",
      patientId: "patient-1",
      patientName: "Marina Alves",
      status: "open",
      assignedToName: "Dr. Rafael M.",
      unreadCount: 2,
      tags: [{ id: "tag-1", name: "joelho", color: "#10b981" }],
      metadata: {
        stage: "evaluation",
        source: "Instagram Ads",
        campaign: "Dor no joelho",
        insurance: "Unimed",
        interest: "Joelho • avaliação",
        nextAction: "Confirmar avaliação e preparar primeiro atendimento",
      },
      createdAt: "2026-06-20T09:41:00.000Z",
      updatedAt: "2026-06-20T11:55:00.000Z",
      lastMessage: "Pode me passar um horário?",
      lastMessageAt: "2026-06-20T11:55:00.000Z",
    };

    const vm = toCrmConversationViewModel(conversation);

    expect(vm.initials).toBe("MA");
    expect(vm.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(vm.stage.key).toBe("evaluation");
    expect(vm.sourceLabel).toBe("Instagram Ads");
    expect(vm.campaignLabel).toBe("Dor no joelho");
    expect(vm.insuranceLabel).toBe("Unimed");
    expect(vm.interestLabel).toBe("Joelho • avaliação");
    expect(vm.firstContactLabel).toContain("20");
    expect(vm.ownerLabel).toBe("Dr. Rafael M.");
    expect(vm.presenceLabel).toBe("Ativo agora");
    expect(vm.nextActionTitle).toBe("Próxima ação");
    expect(vm.nextActionBody).toBe("Confirmar avaliação e preparar primeiro atendimento");
  });

  it("usa fallbacks consistentes quando o metadata não traz CRM explícito", () => {
    const conversation: Conversation = {
      id: "conv-2",
      contactId: "contact-2",
      contactName: "Lucas Martins",
      contactPhone: "+55 11 99999-0000",
      status: "closed",
      unreadCount: 0,
      tags: [],
      metadata: {},
      createdAt: "2026-06-18T09:00:00.000Z",
      updatedAt: "2026-06-18T10:00:00.000Z",
      lastMessage: "Obrigado",
      lastMessageAt: "2026-06-18T10:00:00.000Z",
    };

    const vm = toCrmConversationViewModel(conversation);

    expect(vm.stage.key).toBe("lead");
    expect(vm.sourceLabel).toBe("Não informado");
    expect(vm.campaignLabel).toBe("Não informado");
    expect(vm.insuranceLabel).toBe("Não informado");
    expect(vm.interestLabel).toBe("Não informado");
    expect(vm.ownerLabel).toBe("Não atribuído");
    expect(vm.presenceLabel).toContain("Atualizado em");
    expect(vm.nextActionTitle).toBe("Pendente");
    expect(vm.nextActionBody).toBe("Qualificar lead e responder a primeira mensagem.");
  });

  it("usa o title vindo da API como rótulo da resposta rápida", () => {
    const items = toCrmQuickReplies([
      { id: "q1", title: "Valores", content: "A avaliação custa..." },
      { id: "q2", name: "Endereço", content: "Ficamos na..." },
    ] as never);

    expect(items[0].label).toBe("Valores");
    expect(items[1].label).toBe("Endereço");
  });

  it("descarta respostas rápidas sem rótulo (evita pílulas vazias)", () => {
    const items = toCrmQuickReplies([
      { id: "q1", content: "sem titulo" },
      { id: "q2", title: "  ", content: "espacos" },
      { id: "q3", title: "Horários", content: "Atendemos..." },
    ] as never);

    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Horários");
  });
});

describe("crmWhatsAppAdapter · card da lista", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const base: Conversation = {
    id: "conv-1",
    contactId: "contact-1",
    contactName: "Maria",
    contactPhone: "5511999999999",
    status: "open",
    unreadCount: 0,
    tags: [],
    metadata: {},
    createdAt: "2026-06-18T09:00:00.000Z",
    updatedAt: "2026-06-20T11:30:00.000Z",
  };

  it("expõe prévia, direção e horário da última mensagem", () => {
    const vm = toCrmConversationViewModel({
      ...base,
      lastMessage: "  Bom dia, gostaria de saber os valores  ",
      lastMessageAt: "2026-06-20T11:30:00.000Z",
      lastMessageDirection: "outbound",
    });

    expect(vm.preview).toBe("Bom dia, gostaria de saber os valores");
    expect(vm.previewDirection).toBe("outbound");
    expect(vm.displayTime).toMatch(/\d{2}:\d{2}/);
  });

  it("mostra 'Ontem' e a data para mensagens mais antigas", () => {
    const ontem = toCrmConversationViewModel({ ...base, lastMessageAt: "2026-06-19T22:00:00.000Z" });
    const antigo = toCrmConversationViewModel({ ...base, lastMessageAt: "2026-06-10T10:00:00.000Z" });

    expect(ontem.displayTime).toBe("Ontem");
    expect(antigo.displayTime).toBe("10/06");
  });

  it("marca conversas aguardando resposta da equipe", () => {
    const aguardando = toCrmConversationViewModel({
      ...base,
      lastMessageDirection: "inbound",
      lastMessageAt: "2026-06-20T06:00:00.000Z",
    });
    const respondida = toCrmConversationViewModel({
      ...base,
      lastMessageDirection: "outbound",
      lastMessageAt: "2026-06-20T06:00:00.000Z",
    });

    expect(aguardando.awaitingReply).toBe(true);
    expect(aguardando.hoursSinceLastMessage).toBe(6);
    expect(respondida.awaitingReply).toBe(false);
  });

  it("expõe responsável e lembrete (snooze) do metadata", () => {
    const vencido = toCrmConversationViewModel({
      ...base,
      assignedTo: "user-1",
      assignedToName: "Rafael",
      metadata: { snoozedUntil: "2026-06-20T11:00:00.000Z" },
    });
    const futuro = toCrmConversationViewModel({
      ...base,
      metadata: { snoozedUntil: "2026-06-20T18:00:00.000Z" },
    });

    expect(vencido.assignedTo).toBe("user-1");
    expect(vencido.ownerLabel).toBe("Rafael");
    expect(vencido.snoozedUntil).toBe("2026-06-20T11:00:00.000Z");
    expect(vencido.isSnoozeDue).toBe(true);
    expect(futuro.isSnoozeDue).toBe(false);
  });
});
