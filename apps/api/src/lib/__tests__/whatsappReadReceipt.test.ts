import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendWhatsAppReadReceipt } from "../whatsapp";

const env = {
  WHATSAPP_PHONE_NUMBER_ID: "779431901927431",
  WHATSAPP_ACCESS_TOKEN: "token-123",
} as never;

describe("sendWhatsAppReadReceipt", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marca a mensagem como lida na Meta", async () => {
    const result = await sendWhatsAppReadReceipt(env, "wamid.ABC");

    expect(result.ok).toBe(true);
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/779431901927431/messages");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.ABC",
    });
  });

  it("inclui o indicador de digitação quando pedido", async () => {
    await sendWhatsAppReadReceipt(env, "wamid.ABC", { typing: true });

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      typing_indicator: { type: "text" },
    });
  });

  it("não chama a Meta sem credenciais ou sem message id", async () => {
    expect((await sendWhatsAppReadReceipt(env, "")).ok).toBe(false);
    expect((await sendWhatsAppReadReceipt({} as never, "wamid.ABC")).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("não lança quando a Meta responde erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "invalid" } }), { status: 400 })),
    );

    await expect(sendWhatsAppReadReceipt(env, "wamid.ABC")).resolves.toMatchObject({ ok: false });
  });
});
