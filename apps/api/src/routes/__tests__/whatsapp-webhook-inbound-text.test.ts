import { describe, it, expect } from "vitest";
import { inboundMessageText } from "../whatsapp-webhook";

describe("inboundMessageText", () => {
  it("usa o corpo de texto quando presente", () => {
    expect(inboundMessageText({ type: "text", text: { body: "Olá" } })).toBe("Olá");
  });

  it("usa a legenda da mídia", () => {
    expect(inboundMessageText({ type: "image", image: { id: "1", caption: "minha foto" } })).toBe(
      "minha foto",
    );
  });

  it("extrai o título da resposta interativa (button/list)", () => {
    expect(
      inboundMessageText({ type: "interactive", interactive: { button_reply: { title: "Sim" } } }),
    ).toBe("Sim");
    expect(
      inboundMessageText({ type: "interactive", interactive: { list_reply: { title: "Manhã" } } }),
    ).toBe("Manhã");
  });

  it("rotula reaction/location/contacts/sticker sem gravar placeholder cru", () => {
    expect(inboundMessageText({ type: "reaction", reaction: { emoji: "👍" } })).toContain("👍");
    expect(inboundMessageText({ type: "location" })).toMatch(/localiza/i);
    expect(inboundMessageText({ type: "contacts" })).toMatch(/contato/i);
    expect(inboundMessageText({ type: "sticker" })).toMatch(/figurinha/i);
    // Nunca deve retornar algo como "[location]"
    for (const t of ["location", "contacts", "sticker", "reaction", "interactive"]) {
      expect(inboundMessageText({ type: t })).not.toMatch(/^\[[a-z_]+\]$/);
    }
  });

  it("retorna undefined para tipos sem rótulo (deixa o consumidor decidir)", () => {
    expect(inboundMessageText({ type: "text" })).toBeUndefined();
  });
});
