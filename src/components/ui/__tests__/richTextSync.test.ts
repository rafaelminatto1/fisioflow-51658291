import { describe, it, expect } from "vitest";
import { shouldApplyExternalValue, normalizeEditorHtml } from "../richTextSync";

const base = {
  incoming: "",
  current: "",
  lastSent: "",
  isFocused: false,
  hasExplicitRevision: false,
};

describe("shouldApplyExternalValue", () => {
  it("não sincroniza quando o conteúdo já é o desejado", () => {
    expect(shouldApplyExternalValue({ ...base, incoming: "<p>x</p>", current: "<p>x</p>" })).toBe(
      false,
    );
  });

  it("NÃO sobrescreve o texto enquanto o usuário digita (campo focado)", () => {
    // Regressão: eco do autosave / re-render do pai não pode arrancar o texto.
    expect(
      shouldApplyExternalValue({
        ...base,
        incoming: "<p>stale parent value</p>",
        current: "<p>typed by user</p>",
        isFocused: true,
      }),
    ).toBe(false);
  });

  it("aplica substituição explícita (revisão) mesmo focado", () => {
    expect(
      shouldApplyExternalValue({
        ...base,
        incoming: "<p>replicado</p>",
        current: "<p>typed</p>",
        isFocused: true,
        hasExplicitRevision: true,
      }),
    ).toBe(true);
  });

  it("ignora eco do próprio editor quando ocioso", () => {
    expect(
      shouldApplyExternalValue({
        ...base,
        incoming: "<p>typed</p>",
        current: "<p>old</p>",
        lastSent: "<p>typed</p>",
        isFocused: false,
      }),
    ).toBe(false);
  });

  it("aplica mudança externa genuína quando o campo está ocioso", () => {
    // Hidratação do servidor / restauração de rascunho com o campo sem foco.
    expect(
      shouldApplyExternalValue({
        ...base,
        incoming: "<p>server text</p>",
        current: "",
        lastSent: "",
        isFocused: false,
      }),
    ).toBe(true);
  });
});

describe("normalizeEditorHtml", () => {
  it("trata documento vazio do TipTap como string vazia", () => {
    expect(normalizeEditorHtml("<p></p>")).toBe("");
    expect(normalizeEditorHtml("<p>oi</p>")).toBe("<p>oi</p>");
  });
});
