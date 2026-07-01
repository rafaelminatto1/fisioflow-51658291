import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn(async (..._a: any[]) => ({ messages: [{ id: "wamid.1" }] }));
vi.mock("../whatsapp", () => ({
  WhatsAppService: class {
    sendSmartTemplate = mockSend;
  },
}));

import { processCampaignSend } from "../campaignSender";

const env = { ANALYTICS: { writeDataPoint: vi.fn() } } as any;

function poolWith(rows: Record<string, any[]>) {
  const calls: any[] = [];
  const query = vi.fn(async (sql: string, params?: any[]) => {
    calls.push({ sql, params });
    if (/FROM crm_campanhas WHERE id/.test(sql)) return { rows: rows.campaign };
    if (/FROM crm_campanha_envios e/.test(sql)) return { rows: rows.envios };
    return { rows: [] };
  });
  return { query, calls } as any;
}

describe("processCampaignSend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pula quando não é whatsapp ou não tem template_key", async () => {
    const pool = poolWith({ campaign: [{ id: "c1", tipo: "email", template_key: null }], envios: [] });
    const out = await processCampaignSend(pool, env, "c1");
    expect(out.skipped).toBe("not_whatsapp_template");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("envia o template aprovado a cada destinatário e grava meta_message_id", async () => {
    const pool = poolWith({
      campaign: [{ id: "c1", organization_id: "o1", tipo: "whatsapp", template_key: "avaliacao_google" }],
      envios: [
        { id: "e1", patient_id: "p1", phone: "5511999990001", full_name: "Maria Silva" },
        { id: "e2", patient_id: "p2", phone: "5511999990002", full_name: "João Souza" },
      ],
    });
    const out = await processCampaignSend(pool, env, "c1");
    expect(out.sent).toBe(2);
    expect(out.failed).toBe(0);
    // avaliacao_google tem {{1}} → envia o primeiro nome
    expect(mockSend).toHaveBeenCalledWith("5511999990001", "avaliacao_google", ["Maria"]);
    // gravou meta_message_id + status enviado
    const upd = pool.calls.find((c: any) =>
      /UPDATE crm_campanha_envios/.test(c.sql) && c.params?.includes("wamid.1"),
    );
    expect(upd).toBeTruthy();
    // fechou a campanha
    expect(
      pool.calls.some((c: any) => /UPDATE crm_campanhas SET status = 'concluida'/.test(c.sql)),
    ).toBe(true);
  });

  it("marca falha e sem telefone não chama a Meta", async () => {
    const pool = poolWith({
      campaign: [{ id: "c1", organization_id: "o1", tipo: "whatsapp", template_key: "avaliacao_google" }],
      envios: [{ id: "e1", patient_id: "p1", phone: null, full_name: "Sem Telefone" }],
    });
    const out = await processCampaignSend(pool, env, "c1");
    expect(out.sent).toBe(0);
    expect(out.failed).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
