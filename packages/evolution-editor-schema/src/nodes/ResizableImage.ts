/**
 * Cópia do nó de schema "clinicalMedia" (packages/evolution-editor-schema).
 * Fonte original: src/components/ui/rich-text/ResizableImageExtension.tsx
 * Precisa existir aqui pois define um tipo de nó ProseMirror próprio (não é o
 * @tiptap/extension-image padrão) e o schema tem que ser idêntico entre
 * cliente, Durable Object (Yjs->HTML) e este pacote compartilhado.
 *
 * Versão schema-only: sem NodeView React/DOM — este pacote é importado por um
 * Cloudflare Worker (Durable Object) que nunca renderiza UI. O NodeView
 * interativo (drag/resize/toolbar) vive apenas no cliente, que estende este
 * Node com `.extend({ addNodeView })`.
 */
import { mergeAttributes, Node } from "@tiptap/core";
import {
  buildClinicalMediaNode,
  DEFAULT_CLINICAL_MEDIA_ALIGN,
  DEFAULT_CLINICAL_MEDIA_WIDTH,
  getClinicalMediaAttrsFromElement,
  getClinicalMediaFigureAttrs,
  getClinicalMediaImageAttrs,
  normalizeClinicalMediaAlign,
  normalizeClinicalMediaWidth,
  normalizeClinicalMediaWrap,
  normalizeClinicalMediaCoord,
  type ClinicalMediaAttrs,
} from "./clinicalMedia";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    clinicalMedia: {
      setClinicalMedia: (attrs: ClinicalMediaAttrs & { caption?: string }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create({
  name: "clinicalMedia",
  group: "block",
  content: "inline*",
  draggable: true,
  selectable: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      src: {
        default: "",
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: DEFAULT_CLINICAL_MEDIA_WIDTH,
        parseHTML: (element) =>
          normalizeClinicalMediaWidth(
            element.getAttribute("data-width") ||
              element.style.width ||
              element.getAttribute("width") ||
              DEFAULT_CLINICAL_MEDIA_WIDTH,
          ),
      },
      align: {
        default: DEFAULT_CLINICAL_MEDIA_ALIGN,
        parseHTML: (element) =>
          normalizeClinicalMediaAlign(
            element.getAttribute("data-align") || DEFAULT_CLINICAL_MEDIA_ALIGN,
          ),
      },
      wrap: {
        default: "none",
        parseHTML: (element) =>
          normalizeClinicalMediaWrap(
            element.getAttribute("data-wrap") || "none",
          ),
      },
      top: {
        default: null,
        parseHTML: (element) =>
          normalizeClinicalMediaCoord(
            element.getAttribute("data-top") || null,
          ),
      },
      left: {
        default: null,
        parseHTML: (element) =>
          normalizeClinicalMediaCoord(
            element.getAttribute("data-left") || null,
          ),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="clinical-media"]',
        contentElement: "figcaption",
        getAttrs: (element) => getClinicalMediaAttrsFromElement(element as HTMLElement),
      },
      {
        tag: 'img[data-rich-text-image="true"]',
        getAttrs: (element) => getClinicalMediaAttrsFromElement(element as HTMLElement),
      },
      {
        tag: "img",
        getAttrs: (element) => getClinicalMediaAttrsFromElement(element as HTMLElement),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as ClinicalMediaAttrs;

    return [
      "figure",
      mergeAttributes(getClinicalMediaFigureAttrs(attrs)),
      ["img", mergeAttributes(this.options.HTMLAttributes, getClinicalMediaImageAttrs(attrs))],
      ["figcaption", 0],
    ];
  },

  addCommands() {
    return {
      setClinicalMedia:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent(buildClinicalMediaNode(attrs, attrs.caption || "")),
    };
  },
});
