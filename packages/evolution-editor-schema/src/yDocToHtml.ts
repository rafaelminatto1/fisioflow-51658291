import * as Y from "yjs";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { getSchema } from "@tiptap/core";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { evolutionEditorExtensions } from "./extensions";

const schema = getSchema(evolutionEditorExtensions);

/**
 * Converte um Y.Doc (fragmento XML "default", mesmo usado pela extensão
 * @tiptap/extension-collaboration no cliente) para HTML — sem DOM, roda no
 * runtime de Cloudflare Workers. Usado pelo Durable Object de colaboração
 * (Task 5) para persistir/exibir a evolução renderizada.
 */
export function yDocToHtml(doc: Y.Doc): string {
  const fragment = doc.getXmlFragment("default");
  const node = yXmlFragmentToProseMirrorRootNode(fragment, schema);
  return renderToHTMLString({ extensions: evolutionEditorExtensions, content: node });
}
