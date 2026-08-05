import { describe, it, expect, vi, beforeEach } from "vitest";

const notifyUserMock = vi.fn();
const notifyOrganizationMock = vi.fn();

vi.mock("../../push", () => ({
  notifyUser: (...args: unknown[]) => notifyUserMock(...args),
  notifyOrganization: (...args: unknown[]) => notifyOrganizationMock(...args),
}));

const { buildPreview, dentroDoSilencio, notifyInboxMessage } = await import("../inboxPush");

const ENV = {} as never;

function poolCom(rows: Record<string, any[]>) {
  return {
    query: vi.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes("wa_conversations")) return { rows: rows.conversa ?? [] };
      if (sql.includes("notification_preferences")) return { rows: rows.prefs ?? [] };
      return { rows: [] };
    }),
  };
}

const BASE = {
  organizationId: "org-1",
  conversationId: "conv-1",
  contactName: "Marina Alves",
  preview: "Bom dia! Gostaria de saber o valor da avaliação",
  messageType: "text",
};

beforeEach(() => {
  notifyUserMock.mockReset();
  notifyOrganizationMock.mockReset();
});

describe("buildPreview", () => {
  it("descreve mídia em vez de mostrar JSON cru", () => {
    expect(buildPreview("image", "[image]")).toBe("Enviou uma imagem");
    expect(buildPreview("audio", "x")).toBe("Enviou um áudio");
    expect(buildPreview("document", "")).toBe("Enviou um documento");
  });

  it("trunca texto longo com reticências", () => {
    const preview = buildPreview("text", "a".repeat(300));
    expect(preview.length).toBeLessThanOrEqual(120);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("normaliza quebras de linha para não virar parede de texto", () => {
    expect(buildPreview("text", "oi\n\n  tudo   bem")).toBe("oi tudo bem");
  });

  it("texto vazio não vira notificação em branco", () => {
    expect(buildPreview("text", "   ")).toBe("Nova mensagem");
  });
});

describe("notifyInboxMessage — quem recebe", () => {
  it("conversa ATRIBUÍDA notifica só o responsável, não a clínica inteira", async () => {
    const pool = poolCom({ conversa: [{ assigned_to: "fisio-7" }] });

    const resultado = await notifyInboxMessage(ENV, pool as never, BASE);

    expect(resultado).toEqual({ notified: "user", userId: "fisio-7" });
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
    expect(notifyOrganizationMock).not.toHaveBeenCalled();
  });

  it("conversa SEM dono cai para a organização", async () => {
    const pool = poolCom({ conversa: [{ assigned_to: null }] });

    const resultado = await notifyInboxMessage(ENV, pool as never, BASE);

    expect(resultado.notified).toBe("organization");
    expect(notifyOrganizationMock).toHaveBeenCalledTimes(1);
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it("respeita silêncio configurado pelo profissional", async () => {
    const pool = poolCom({
      conversa: [{ assigned_to: "fisio-7" }],
      prefs: [{ therapist_messages: false }],
    });

    const resultado = await notifyInboxMessage(ENV, pool as never, BASE);

    expect(resultado.notified).toBe("none");
    expect(notifyUserMock).not.toHaveBeenCalled();
    expect(notifyOrganizationMock).not.toHaveBeenCalled();
  });

  it("conversa ADIADA pelo profissional não notifica antes da hora", async () => {
    const daquiUmaHora = new Date(Date.now() + 3600_000).toISOString();
    const pool = poolCom({
      conversa: [{ assigned_to: "fisio-7", snoozed_until: daquiUmaHora }],
    });

    const resultado = await notifyInboxMessage(ENV, pool as never, BASE);
    expect(resultado).toEqual({ notified: "none", reason: "snoozed" });
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it("snooze VENCIDO volta a notificar", async () => {
    const ontem = new Date(Date.now() - 86_400_000).toISOString();
    const pool = poolCom({ conversa: [{ assigned_to: "fisio-7", snoozed_until: ontem }] });
    expect((await notifyInboxMessage(ENV, pool as never, BASE)).notified).toBe("user");
  });

  it("horário de silêncio segura a notificação", async () => {
    const pool = poolCom({
      conversa: [{ assigned_to: "fisio-7" }],
      prefs: [{ therapist_messages: true, quiet_hours_start: "22:00", quiet_hours_end: "08:00" }],
    });

    const madrugada = new Date(2026, 7, 5, 2, 30);
    const resultado = await notifyInboxMessage(ENV, pool as never, { ...BASE, now: madrugada });
    expect(resultado.notified).toBe("none");
  });

  it("sem preferência gravada, notifica — o padrão é não perder paciente", async () => {
    const pool = poolCom({ conversa: [{ assigned_to: "fisio-7" }], prefs: [] });
    expect((await notifyInboxMessage(ENV, pool as never, BASE)).notified).toBe("user");
  });

  it("erro ao ler a conversa não derruba o envio — cai para a organização", async () => {
    const pool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("wa_conversations")) throw new Error("banco fora");
        return { rows: [] };
      }),
    };

    const resultado = await notifyInboxMessage(ENV, pool as never, BASE);
    expect(resultado.notified).toBe("organization");
  });

  it("o payload leva a rota da conversa, para abrir direto no chat", async () => {
    const pool = poolCom({ conversa: [{ assigned_to: "fisio-7" }] });
    await notifyInboxMessage(ENV, pool as never, BASE);

    const payload = notifyUserMock.mock.calls[0][3];
    expect(payload.title).toBe("Marina Alves");
    expect(payload.data.conversationId).toBe("conv-1");
    expect(payload.data.route).toBe("/whatsapp-chat/conv-1");
    expect(payload.channelId).toBe("messages");
  });

  it("a consulta da conversa é escopada por organização", async () => {
    const pool = poolCom({ conversa: [{ assigned_to: null }] });
    await notifyInboxMessage(ENV, pool as never, BASE);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("wa_conversations");
    expect(sql).toContain("organization_id");
    expect(params).toEqual(["conv-1", "org-1"]);
  });
});

describe("dentroDoSilencio — a janela cruza a meia-noite", () => {
  const em = (h: number, m = 0) => new Date(2026, 7, 5, h, m);

  it("22:00–08:00 pega a madrugada", () => {
    expect(dentroDoSilencio(em(2, 30), "22:00", "08:00")).toBe(true);
    expect(dentroDoSilencio(em(23), "22:00", "08:00")).toBe(true);
    expect(dentroDoSilencio(em(7, 59), "22:00", "08:00")).toBe(true);
  });

  it("e libera o horário comercial", () => {
    expect(dentroDoSilencio(em(8), "22:00", "08:00")).toBe(false);
    expect(dentroDoSilencio(em(14), "22:00", "08:00")).toBe(false);
    expect(dentroDoSilencio(em(21, 59), "22:00", "08:00")).toBe(false);
  });

  it("janela que não cruza a meia-noite também funciona", () => {
    expect(dentroDoSilencio(em(13), "12:00", "14:00")).toBe(true);
    expect(dentroDoSilencio(em(15), "12:00", "14:00")).toBe(false);
  });

  it("valor ausente ou malformado não silencia por engano", () => {
    expect(dentroDoSilencio(em(2), null, "08:00")).toBe(false);
    expect(dentroDoSilencio(em(2), "lixo", "08:00")).toBe(false);
    expect(dentroDoSilencio(em(2), "25:00", "08:00")).toBe(false);
  });
});
