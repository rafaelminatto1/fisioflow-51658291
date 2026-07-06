import * as Y from "yjs";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import { parseHTML, VElement } from "zeed-dom";
import { evolutionEditorExtensions } from "./extensions";

const schema = getSchema(evolutionEditorExtensions);

/**
 * zeed-dom (o shim de DOM usado no runtime de Workers, sem `document` real)
 * não implementa alguns métodos de `Element` que as regras `parseHTML` de
 * certas extensões TipTap chamam:
 *
 * - `Element.prototype.closest` — usado por `@tiptap/extension-table`
 *   (`table-cell.ts`) para achar o `<table>` ancestral e distinguir
 *   header/body. Sem isso, `element.closest is not a function` interrompe o
 *   parse assim que o HTML contém uma tabela.
 * - `Element.prototype.classList` iterável — `@tiptap/extension-code-block`
 *   faz `[...element.firstElementChild.classList]`; o `classList` do
 *   zeed-dom é um objeto plano `{ contains, add, remove }` sem
 *   `Symbol.iterator`, então o spread lança `is not iterable`.
 *
 * Ambos são polyfills mínimos aplicados uma única vez no protótipo de
 * `VElement`, sem depender de happy-dom/jsdom (que não rodam em workerd).
 */
function polyfillZeedDomForProseMirror(): void {
  const proto = VElement.prototype as unknown as {
    closest?: (selector: string) => unknown;
    parent?: (selector: string) => unknown;
    classList?: unknown;
    className?: string;
  };

  if (typeof proto.closest !== "function") {
    // `parent(selector)` já implementa exatamente a semântica de `closest`:
    // testa o próprio nó contra o seletor e, se não bater, sobe por
    // `parentNode` recursivamente até achar um match ou chegar ao topo.
    proto.closest = function closest(this: { parent: (s: string) => unknown }, selector: string) {
      return this.parent(selector) ?? null;
    };
  }

  const classListDescriptor = Object.getOwnPropertyDescriptor(proto, "classList");
  const classListGetter = classListDescriptor?.get;
  if (classListGetter && !classListDescriptor?.get?.toString().includes("Symbol.iterator")) {
    Object.defineProperty(proto, "classList", {
      configurable: true,
      enumerable: classListDescriptor?.enumerable ?? false,
      get(this: { className?: string }) {
        const base = classListGetter.call(this) as {
          contains: (s: string) => boolean;
          add: (s: string) => void;
          remove: (s: string) => void;
        };
        const classNames = String(this.className ?? "")
          .trim()
          .split(/\s+/g)
          .filter(Boolean);
        return Object.assign(base, {
          [Symbol.iterator]: () => classNames[Symbol.iterator](),
          get length() {
            return classNames.length;
          },
        });
      },
    });
  }
}

polyfillZeedDomForProseMirror();

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
