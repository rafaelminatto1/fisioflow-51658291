import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { yDocToHtml } from "../yDocToHtml";
import { seedYDocFromHtml, htmlToYDoc } from "../htmlToYDoc";

describe("htmlToYDoc (spike gate — HTML -> Yjs no runtime de Workers)", () => {
  it("faz round-trip HTML -> Y.Doc -> HTML preservando texto e marca <strong>", () => {
    const doc = new Y.Doc();
    seedYDocFromHtml(doc, "<p>Olá <strong>mundo</strong></p>");
    const html = yDocToHtml(doc);
    expect(html).toContain("Olá");
    expect(html).toContain("<strong>");
    expect(html).toContain("mundo");
  });

  it("htmlToYDoc retorna update binário aplicável a um Y.Doc", () => {
    const update = htmlToYDoc("<p>Olá <strong>mundo</strong></p>");
    expect(update.byteLength).toBeGreaterThan(0);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, update);
    const html = yDocToHtml(doc);
    expect(html).toContain("Olá");
    expect(html).toContain("<strong>");
  });

  it("preserva estrutura de heading, itálico, lista e link", () => {
    const doc = new Y.Doc();
    seedYDocFromHtml(
      doc,
      '<h2>Título</h2><p><em>itálico</em></p><ul><li>item</li></ul><p><a href="https://exemplo.com">link</a></p>',
    );
    const html = yDocToHtml(doc);
    expect(html).toContain("Título");
    expect(html).toContain("<em>");
    expect(html).toContain("<li");
    expect(html).toContain("https://exemplo.com");
  });

  it("HTML vazio produz documento vazio (sem lançar)", () => {
    const doc = new Y.Doc();
    seedYDocFromHtml(doc, "");
    const html = yDocToHtml(doc);
    expect(typeof html).toBe("string");
  });

  it("faz round-trip de tabela (thead + tbody) sem lançar (Gate 1 — bug do zeed-dom sem Element.prototype.closest)", () => {
    const doc = new Y.Doc();
    const tableHtml =
      "<table><tbody><tr><th>Cabeçalho</th></tr><tr><td>Célula</td></tr></tbody></table>";
    expect(() => seedYDocFromHtml(doc, tableHtml)).not.toThrow();
    const html = yDocToHtml(doc);
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("Cabeçalho");
    expect(html).toContain("Célula");
  });

  it("preserva lista de tarefas (taskList/taskItem)", () => {
    const doc = new Y.Doc();
    const taskListHtml =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Feito</li><li data-type="taskItem" data-checked="false">Pendente</li></ul>';
    seedYDocFromHtml(doc, taskListHtml);
    const html = yDocToHtml(doc);
    expect(html).toContain("Feito");
    expect(html).toContain("Pendente");
    expect(html).toMatch(/data-type="taskItem"/);
  });

  it("preserva bloco de código", () => {
    const doc = new Y.Doc();
    const codeHtml = "<pre><code>const x = 1;</code></pre>";
    seedYDocFromHtml(doc, codeHtml);
    const html = yDocToHtml(doc);
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).toContain("const x = 1;");
  });
});
