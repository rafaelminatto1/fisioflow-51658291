import { describe, expect, it } from "vitest";
import { normalizeIncomingEditorHtml } from "./richTextSync";

describe("normalizeIncomingEditorHtml", () => {
  it("preserva quebras de linha de observações legadas em texto puro", () => {
    expect(normalizeIncomingEditorHtml("15/06/2025\nPaciente relatou dor\nExercício 3x10")).toBe(
      "<p>15/06/2025</p><p>Paciente relatou dor</p><p>Exercício 3x10</p>",
    );
  });

  it("não altera conteúdo que já é HTML", () => {
    expect(normalizeIncomingEditorHtml("<p>Paciente</p>")).toBe("<p>Paciente</p>");
  });

  it("escapa texto puro antes de inserir no editor", () => {
    expect(normalizeIncomingEditorHtml("Paciente <alerta>\nA & B")).toBe(
      "<p>Paciente &lt;alerta&gt;</p><p>A &amp; B</p>",
    );
  });
});
