import { describe, it, expect } from "vitest";
import { extractText, buildAiHistory, SUMMARY_SYSTEM_PROMPT, SUGGEST_SYSTEM_PROMPT } from "../inboxAi";

describe("inboxAi", () => {
  it("extractText lida com string, JSON e objetos {text,body}", () => {
    expect(extractText("Olá")).toBe("Olá");
    expect(extractText('{"text":"oi"}')).toBe("oi");
    expect(extractText({ body: "corpo" })).toBe("corpo");
    expect(extractText({ foo: 1 })).toBe("");
    expect(extractText(null)).toBe("");
  });

  it("buildAiHistory mapeia direção→role, ignora vazias e respeita o limite", () => {
    const rows = [
      { direction: "inbound", content: "Oi, tenho interesse" },
      { direction: "outbound", content: '{"text":"Olá! Como posso ajudar?"}' },
      { direction: "internal", content: "nota interna" }, // ignorada (note)
      { direction: "inbound", content: "" }, // ignorada (vazia)
      { direction: "inbound", content: "Qual o valor?" },
    ];
    const hist = buildAiHistory(rows, 10);
    expect(hist).toEqual([
      { role: "user", content: "Oi, tenho interesse" },
      { role: "assistant", content: "Olá! Como posso ajudar?" },
      { role: "user", content: "Qual o valor?" },
    ]);
  });

  it("buildAiHistory corta para as últimas N mensagens", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      direction: "inbound",
      content: `msg ${i}`,
    }));
    const hist = buildAiHistory(rows, 5);
    expect(hist).toHaveLength(5);
    expect(hist[0].content).toBe("msg 25");
  });

  it("prompts estão em PT-BR", () => {
    expect(SUMMARY_SYSTEM_PROMPT.toLowerCase()).toContain("resum");
    expect(SUGGEST_SYSTEM_PROMPT.toLowerCase()).toContain("respost");
  });
});
