import { describe, expect, it } from "vitest";
import { needsHumanApproval } from "../whatsappApproval";

describe("needsHumanApproval", () => {
  it("urgência sempre exige aprovação", () => {
    expect(needsHumanApproval("urgent", "qualquer coisa")).toBe(true);
  });

  it("informação com conteúdo clínico exige aprovação", () => {
    expect(needsHumanApproval("information", "estou com dor no joelho depois da cirurgia")).toBe(
      true,
    );
    expect(needsHumanApproval("information", "posso tomar remédio antes da sessão?")).toBe(true);
    expect(needsHumanApproval("information", "o joelho piorou e está inchado")).toBe(true);
    expect(needsHumanApproval("information", "minha mãe caiu ontem e está com dores")).toBe(true);
    expect(needsHumanApproval("information", "estou dormente e com sangramento no curativo")).toBe(
      true,
    );
  });

  it("informação genérica e agendamento seguem automáticos", () => {
    expect(needsHumanApproval("information", "qual o horário de funcionamento?")).toBe(false);
    expect(needsHumanApproval("scheduling", "quero marcar uma avaliação")).toBe(false);
    expect(needsHumanApproval("other", "obrigado!")).toBe(false);
  });
});
