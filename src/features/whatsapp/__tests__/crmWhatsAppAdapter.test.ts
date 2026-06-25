import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/services/whatsapp-api";
import { toCrmConversationViewModel } from "../crmWhatsAppAdapter";

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
});
