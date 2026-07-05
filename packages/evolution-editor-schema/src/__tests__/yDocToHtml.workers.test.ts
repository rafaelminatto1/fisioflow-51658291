import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { Node as PMNode } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { evolutionEditorExtensions } from "../extensions";
import { yDocToHtml } from "../yDocToHtml";

describe("yDocToHtml (spike gate — Yjs -> HTML no runtime de Workers)", () => {
  it("renderiza um Y.Doc simples para HTML no runtime de Workers", () => {
    const schema = getSchema(evolutionEditorExtensions);
    const pmDoc = PMNode.fromJSON(schema, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Olá mundo" }] }],
    });
    const doc = new Y.Doc();
    prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
    const html = yDocToHtml(doc);
    expect(html).toContain("Olá mundo");
    expect(html).toContain("<p");
  });

  it("ida-e-volta é estável (idempotência de render)", () => {
    const schema = getSchema(evolutionEditorExtensions);
    const pmDoc = PMNode.fromJSON(schema, {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título" }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "negrito" }] },
      ],
    });
    const doc = new Y.Doc();
    prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
    expect(yDocToHtml(doc)).toBe(yDocToHtml(doc));
  });

  it("renderiza o nó clinicalMedia (schema-only) como figure/img", () => {
    const schema = getSchema(evolutionEditorExtensions);
    const pmDoc = PMNode.fromJSON(schema, {
      type: "doc",
      content: [
        {
          type: "clinicalMedia",
          attrs: { src: "https://media.moocafisio.com.br/foto.jpg", alt: "Postura" },
        },
      ],
    });
    const doc = new Y.Doc();
    prosemirrorToYXmlFragment(pmDoc, doc.getXmlFragment("default"));
    const html = yDocToHtml(doc);
    expect(html).toContain('data-type="clinical-media"');
    expect(html).toContain("<img");
    expect(html).toContain("https://media.moocafisio.com.br/foto.jpg");
  });
});
