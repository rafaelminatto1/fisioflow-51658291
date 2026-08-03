import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../dispatch";
import type { Env } from "../../../types/env";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));

const message = { to: "paciente@example.com", subject: "Assunto", html: "<p>Oi</p>" };

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "re_1" }, error: null });
});

describe("sendEmail", () => {
  it("retorna false quando nenhum transporte está configurado", async () => {
    const env = {} as Env;
    expect(await sendEmail(env, message)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("envia pelo Resend no modo padrão", async () => {
    const env = { RESEND_API_KEY: "re_test" } as Env;
    expect(await sendEmail(env, message)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "paciente@example.com",
      subject: "Assunto",
    });
  });

  it("usa RESEND_FROM_EMAIL quando definido", async () => {
    const env = { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "Clinica <x@y.com>" } as Env;
    await sendEmail(env, message);
    expect(send.mock.calls[0][0].from).toBe("Clinica <x@y.com>");
  });

  it("cai no remetente padrão quando RESEND_FROM_EMAIL não está definido", async () => {
    const env = { RESEND_API_KEY: "re_test" } as Env;
    await sendEmail(env, message);
    expect(send.mock.calls[0][0].from).toBe("FisioFlow <noreply@moocafisio.com.br>");
  });

  it("lança erro quando o Resend rejeita o envio, em vez de retornar false", async () => {
    send.mockResolvedValue({ data: null, error: { message: "Domínio não verificado" } });
    const env = { RESEND_API_KEY: "re_test" } as Env;
    await expect(sendEmail(env, message)).rejects.toThrow("Domínio não verificado");
  });
});

describe("sendEmail — modo sombra", () => {
  it("não envia a cópia sombra quando nenhum transporte real está configurado", async () => {
    const cfSend = vi.fn().mockResolvedValue({ messageId: "cf_0" });
    const env = {
      EMAIL_TRANSPORT: "shadow",
      EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(cfSend).not.toHaveBeenCalled();
  });

  it("envia pelo Resend ao destinatário real e a cópia para a caixa sombra", async () => {
    const cfSend = vi.fn().mockResolvedValue({ messageId: "cf_1" });
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "shadow",
      EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);

    expect(send.mock.calls[0][0].to).toBe("paciente@example.com");
    expect(cfSend).toHaveBeenCalledTimes(1);
    expect(cfSend.mock.calls[0][0].to).toBe("rafaelstarton@gmail.com");
  });

  it("não derruba o envio principal quando a sombra falha", async () => {
    const cfSend = vi.fn().mockRejectedValue(new Error("beta instável"));
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "shadow",
      EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(cfSend).toHaveBeenCalledTimes(1);
    expect(cfSend.mock.calls[0][0].to).toBe("rafaelstarton@gmail.com");
  });

  it("resolve dentro do timeout mesmo quando a sombra nunca assenta", async () => {
    vi.useFakeTimers();
    try {
      const cfSend = vi.fn().mockReturnValue(new Promise(() => {}));
      const env = {
        RESEND_API_KEY: "re_test",
        EMAIL_TRANSPORT: "shadow",
        EMAIL_SHADOW_TO: "rafaelstarton@gmail.com",
        EMAIL: { send: cfSend },
      } as unknown as Env;

      const pending = sendEmail(env, message);
      await vi.advanceTimersByTimeAsync(3000);

      expect(await pending).toBe(true);
      expect(send).toHaveBeenCalledTimes(1);
      expect(cfSend).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("no modo cloudflare envia ao destinatário real e não usa o Resend", async () => {
    const cfSend = vi.fn().mockResolvedValue({ messageId: "cf_2" });
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_TRANSPORT: "cloudflare",
      EMAIL: { send: cfSend },
    } as unknown as Env;

    expect(await sendEmail(env, message)).toBe(true);
    expect(cfSend.mock.calls[0][0].to).toBe("paciente@example.com");
    expect(send).not.toHaveBeenCalled();
  });
});
