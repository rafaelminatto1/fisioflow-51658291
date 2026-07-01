import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../db", () => ({
  createPool: () => ({ query: mockQuery }),
}));

const mockSendSmartTemplate = vi.fn(async () => ({ messages: [{ id: "wamid.1" }] }));
vi.mock("../whatsapp", () => ({
  WhatsAppService: class {
    sendSmartTemplate = mockSendSmartTemplate;
  },
}));

import { areAutomationsEnabled, sendAutomationTemplate } from "../whatsappAutomations";

const env = {} as any;

describe("whatsappAutomations — gate + envio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("areAutomationsEnabled lê settings.crm_whatsapp.automations_enabled", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });
    expect(await areAutomationsEnabled({ query: mockQuery } as any, "org-1")).toBe(true);

    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: null }] });
    expect(await areAutomationsEnabled({ query: mockQuery } as any, "org-1")).toBe(false);
  });

  it("NÃO envia quando o gate está desligado", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: false }] });
    const out = await sendAutomationTemplate(env, "org-1", "5511999999999", "feedback_atendimento", [
      "Maria",
    ]);
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe("automations_disabled");
    expect(mockSendSmartTemplate).not.toHaveBeenCalled();
  });

  it("NÃO envia quando não há telefone (sem nem consultar o gate)", async () => {
    const out = await sendAutomationTemplate(env, "org-1", "", "feedback_atendimento", ["Maria"]);
    expect(out.sent).toBe(false);
    expect(out.skipped).toBe("no_phone");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("envia o template (pelo nome canônico) quando o gate está ligado", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });
    const out = await sendAutomationTemplate(env, "org-1", "5511999999999", "feedback_atendimento", [
      "Maria",
    ]);
    expect(out.sent).toBe(true);
    expect(mockSendSmartTemplate).toHaveBeenCalledWith(
      "5511999999999",
      "feedback_atendimento",
      ["Maria"],
    );
  });

  it("registra evento de analytics no envio (observabilidade dos disparos)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ enabled: true }] });
    const writeDataPoint = vi.fn();
    const out = await sendAutomationTemplate(
      { ANALYTICS: { writeDataPoint } } as any,
      "org-1",
      "5511999999999",
      "feedback_atendimento",
      ["Maria"],
    );
    expect(out.sent).toBe(true);
    expect(out.accepted).toBe(true);
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
    const arg = writeDataPoint.mock.calls[0][0];
    expect(arg.blobs).toContain("feedback_atendimento");
    expect(arg.blobs).toContain("whatsapp_automation_sent");
  });
});
