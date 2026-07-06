import * as Y from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { parseHTML } from "zeed-dom";
import { evolutionEditorExtensions } from "./extensions";

const schema = getSchema(evolutionEditorExtensions);

/**
 * Semeia o fragmento XML "default" de `doc` (mesmo usado pela extensão
 * @tiptap/extension-collaboration no cliente) a partir de HTML — sem DOM de
 * navegador, roda no runtime de Cloudflare Workers via `zeed-dom` como shim de
 * DOM alimentando o `DOMParser` do ProseMirror. É o inverso de `yDocToHtml`.
 *
 * Usado pelo Durable Object de colaboração para semear o Y.Doc canônico a
 * partir da `observacao` HTML existente na primeira abertura colaborativa de uma
 * sessão que ainda não tem snapshot Yjs.
 */
export function seedYDocFromHtml(doc: Y.Doc, html: string): void {
  const dom = parseHTML(html) as unknown as HTMLElement;
  const pmNode = PMDOMParser.fromSchema(schema).parse(dom);
  prosemirrorToYXmlFragment(pmNode, doc.getXmlFragment("default"));
}

/**
 * Converte HTML para um update Yjs codificado (Uint8Array) contendo o documento
 * no fragmento "default". Conveniência para quem precisa do binário direto.
 */
export function htmlToYDoc(html: string): Uint8Array {
  const doc = new Y.Doc();
  seedYDocFromHtml(doc, html);
  return Y.encodeStateAsUpdate(doc);
}
