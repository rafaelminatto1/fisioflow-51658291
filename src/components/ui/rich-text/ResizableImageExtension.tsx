import React, { useEffect, useRef, useState } from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { GripVertical } from "lucide-react";
import {
  buildClinicalMediaNode,
  DEFAULT_CLINICAL_MEDIA_ALIGN,
  DEFAULT_CLINICAL_MEDIA_WIDTH,
  getClinicalMediaAttrsFromElement,
  getClinicalMediaFigureAttrs,
  getClinicalMediaImageAttrs,
  normalizeClinicalMediaAlign,
  normalizeClinicalMediaWidth,
  type ClinicalMediaAttrs,
} from "./clinicalMedia";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ClinicalMediaNodeView({
  node,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const attrs = node.attrs as ClinicalMediaAttrs;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const draftWidthRef = useRef(attrs.width || DEFAULT_CLINICAL_MEDIA_WIDTH);
  const [draftWidth, setDraftWidth] = useState(attrs.width || DEFAULT_CLINICAL_MEDIA_WIDTH);
  const align = normalizeClinicalMediaAlign(attrs.align);
  const captionIsEmpty = node.textContent.trim().length === 0;

  useEffect(() => {
    const nextWidth = attrs.width || DEFAULT_CLINICAL_MEDIA_WIDTH;
    draftWidthRef.current = nextWidth;
    setDraftWidth(nextWidth);
  }, [attrs.width]);

  const commitWidth = (width: string) => {
    const normalized = normalizeClinicalMediaWidth(width);
    draftWidthRef.current = normalized;
    setDraftWidth(normalized);
    updateAttributes({ width: normalized });
  };

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    const parent = wrapper?.parentElement;
    if (!wrapper || !parent) return;

    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    const maxWidth = parent.getBoundingClientRect().width;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clamp(startWidth + moveEvent.clientX - startX, 120, Math.max(120, maxWidth));
      const nextDraftWidth = `${Math.round(nextWidth)}px`;
      draftWidthRef.current = nextDraftWidth;
      setDraftWidth(nextDraftWidth);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      commitWidth(draftWidthRef.current);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const openImageEditor = () => {
    window.dispatchEvent(
      new CustomEvent("rich-text-edit-existing-image", {
        detail: {
          src: attrs.src,
          alt: attrs.alt,
          title: attrs.title,
          updateAttributes,
        },
      }),
    );
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={[
        "clinical-media-node",
        selected ? "is-selected" : "",
        `is-aligned-${align}`,
      ].join(" ")}
      data-align={align}
      style={{ width: draftWidth }}
    >
      <div className="clinical-media-shell">
        <div className="clinical-media-frame" contentEditable={false}>
          <button
            type="button"
            className="clinical-media-drag-handle"
            aria-label="Mover imagem"
            title="Mover imagem"
            data-drag-handle
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <img
            src={attrs.src}
            alt={attrs.alt || ""}
            title={attrs.title || ""}
            draggable={false}
            className="clinical-media-image"
          />
          <div className="clinical-media-toolbar">
            <button type="button" onClick={() => updateAttributes({ align: "left" })}>
              Esq
            </button>
            <button type="button" onClick={() => updateAttributes({ align: "center" })}>
              Centro
            </button>
            <button type="button" onClick={() => updateAttributes({ align: "right" })}>
              Dir
            </button>
            <button type="button" onClick={() => commitWidth("50%")}>
              50%
            </button>
            <button type="button" onClick={() => commitWidth("75%")}>
              75%
            </button>
            <button type="button" onClick={() => commitWidth("100%")}>
              100%
            </button>
            <button type="button" onClick={openImageEditor}>
              Editar
            </button>
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                deleteNode();
              }}
            >
              Remover
            </button>
          </div>
          <button
            type="button"
            className="clinical-media-resize-handle"
            aria-label="Redimensionar imagem"
            onPointerDown={startResize}
          />
        </div>
        <div
          className="clinical-media-caption-shell"
          data-empty={captionIsEmpty ? "true" : "false"}
          data-placeholder="Adicionar legenda clínica..."
        >
          <NodeViewContent className="clinical-media-caption" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

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

  addNodeView() {
    return ReactNodeViewRenderer(ClinicalMediaNodeView, {
      contentDOMElementTag: "figcaption",
      selectedOnTextSelection: true,
    });
  },
});
