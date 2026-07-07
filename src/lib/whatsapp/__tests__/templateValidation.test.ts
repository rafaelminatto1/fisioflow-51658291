import { describe, expect, it } from "vitest";
import {
  slugifyTemplateName,
  extractPositionalVariables,
  validateTemplateDraft,
  renderTemplatePreview,
  type TemplateDraft,
} from "../templateValidation";

const baseDraft = (over: Partial<TemplateDraft> = {}): TemplateDraft => ({
  name: "retorno_medico",
  category: "UTILITY",
  language: "pt_BR",
  body: "Olá {{1}}, seu retorno está agendado para {{2}}.",
  examples: { 1: "Maria", 2: "10/07 às 09h" },
  buttons: [],
  ...over,
});

describe("slugifyTemplateName", () => {
  it("normaliza acentos, espaços e maiúsculas", () => {
    expect(slugifyTemplateName("Retorno Médico 2")).toBe("retorno_medico_2");
  });
  it("remove caracteres inválidos e underscores repetidos", () => {
    expect(slugifyTemplateName("  Olá!! mundo--x ")).toBe("ola_mundo_x");
  });
});

describe("extractPositionalVariables", () => {
  it("retorna números únicos e ordenados", () => {
    expect(extractPositionalVariables("{{2}} oi {{1}} {{2}}")).toEqual([1, 2]);
  });
  it("retorna vazio sem variáveis", () => {
    expect(extractPositionalVariables("sem variaveis")).toEqual([]);
  });
});

describe("validateTemplateDraft", () => {
  it("aceita um rascunho válido", () => {
    expect(validateTemplateDraft(baseDraft())).toEqual([]);
  });
  it("rejeita nome fora de [a-z0-9_]", () => {
    expect(validateTemplateDraft(baseDraft({ name: "Retorno Médico" }))).toContain(
      "O nome deve conter apenas letras minúsculas, números e _ (use o botão de gerar).",
    );
  });
  it("rejeita corpo vazio", () => {
    expect(validateTemplateDraft(baseDraft({ body: "   ", examples: {} }))).toContain(
      "O corpo da mensagem é obrigatório.",
    );
  });
  it("rejeita variável no início do corpo", () => {
    const errs = validateTemplateDraft(
      baseDraft({ body: "{{1}} bem-vindo", examples: { 1: "Maria" } }),
    );
    expect(errs).toContain("A mensagem não pode começar nem terminar com uma variável — a Meta rejeita.");
  });
  it("rejeita variável no fim do corpo", () => {
    const errs = validateTemplateDraft(
      baseDraft({ body: "Olá, tudo bem {{1}}", examples: { 1: "Maria" } }),
    );
    expect(errs).toContain("A mensagem não pode começar nem terminar com uma variável — a Meta rejeita.");
  });
  it("exige exemplo para cada variável", () => {
    const errs = validateTemplateDraft(baseDraft({ examples: { 1: "Maria" } }));
    expect(errs).toContain("Preencha um exemplo para a variável {{2}}.");
  });
  it("rejeita botão URL sem url", () => {
    const errs = validateTemplateDraft(
      baseDraft({ buttons: [{ type: "URL", text: "Site", url: "" }] }),
    );
    expect(errs).toContain('O botão "Site" precisa de uma URL válida.');
  });
  it("rejeita botão de telefone sem número", () => {
    const errs = validateTemplateDraft(
      baseDraft({ buttons: [{ type: "PHONE_NUMBER", text: "Ligar", phone: "" }] }),
    );
    expect(errs).toContain('O botão "Ligar" precisa de um telefone.');
  });
});

describe("renderTemplatePreview", () => {
  it("substitui variáveis pelos exemplos", () => {
    expect(
      renderTemplatePreview("Olá {{1}}, dia {{2}}", { 1: "Maria", 2: "10/07" }),
    ).toBe("Olá Maria, dia 10/07");
  });
  it("mantém {{n}} quando não há exemplo", () => {
    expect(renderTemplatePreview("Olá {{1}}", {})).toBe("Olá {{1}}");
  });
});
