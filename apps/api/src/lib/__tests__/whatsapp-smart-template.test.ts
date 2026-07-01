import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsAppService } from "../whatsapp";

/**
 * sendSmartTemplate deve montar os `components` conforme o número de variáveis.
 * Para templates SEM variável (ex.: boas_vindas_paciente aprovado na Meta com 0
 * vars), enviar um componente `body` com `parameters: []` faz a Meta rejeitar a
 * mensagem. Nesse caso não deve haver componente algum.
 */
describe("WhatsAppService.sendSmartTemplate", () => {
  const env = {
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_ACCESS_TOKEN: "tok",
  } as any;

  let sent: any;

  beforeEach(() => {
    sent = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: any) => {
        sent = JSON.parse(init.body);
        return { ok: true, json: async () => ({ messages: [{ id: "wamid" }] }) } as any;
      }),
    );
  });

  it("omite o componente body quando não há variáveis", async () => {
    const wa = new WhatsAppService(env);
    await wa.sendSmartTemplate("5511999999999", "boas_vindas_paciente", []);
    expect(sent.template.name).toBe("boas_vindas_paciente");
    expect(sent.template.components).toEqual([]);
  });

  it("inclui o componente body com os parâmetros quando há variáveis", async () => {
    const wa = new WhatsAppService(env);
    await wa.sendSmartTemplate("5511999999999", "avaliacao_google", ["Maria"]);
    expect(sent.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Maria" }] },
    ]);
  });
});
