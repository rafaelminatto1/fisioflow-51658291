import React, { useEffect, useRef, useState } from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { GripVertical, Trash2 } from "lucide-react";
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

  const isAbsolute = attrs.wrap === "behind" || attrs.wrap === "front";
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

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

  const startAbsoluteDrag = (event: React.PointerEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (attrs.wrap !== "behind" && attrs.wrap !== "front") return;
    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const container = wrapper.closest(".ProseMirror");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    const offsetX = event.clientX - wrapperRect.left;
    const offsetY = event.clientY - wrapperRect.top;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - containerRect.left - offsetX + container.scrollLeft;
      const y = moveEvent.clientY - containerRect.top - offsetY + container.scrollTop;

      wrapper.style.left = `${x}px`;
      wrapper.style.top = `${y}px`;
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      const x = upEvent.clientX - containerRect.left - offsetX + container.scrollLeft;
      const y = upEvent.clientY - containerRect.top - offsetY + container.scrollTop;

      updateAttributes({
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
      });
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

  const style: React.CSSProperties = {
    width: draftWidth,
  };
  if (isAbsolute) {
    style.position = "absolute";
    style.top = attrs.top || "20px";
    style.left = attrs.left || "20px";
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={[
        "clinical-media-node",
        selected ? "is-selected" : "",
        `is-aligned-${align}`,
        `is-wrapped-${attrs.wrap || "none"}`,
        showMenu ? "is-menu-open" : "",
      ].join(" ")}
      data-align={align}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(true);
      }}
    >
      <div className="clinical-media-shell">
        <div className="clinical-media-frame" contentEditable={false}>
          <button
            type="button"
            className="clinical-media-drag-handle"
            aria-label="Mover imagem"
            title={isAbsolute ? "Mover imagem (Arrastar Livre)" : "Mover imagem"}
            onPointerDown={isAbsolute ? startAbsoluteDrag : undefined}
            data-drag-handle={!isAbsolute ? "true" : undefined}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <img
            src={attrs.src}
            alt={attrs.alt || ""}
            title={attrs.title || ""}
            draggable={false}
            className="clinical-media-image"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(true);
            }}
            onPointerDown={isAbsolute ? startAbsoluteDrag : undefined}
          />
          {showMenu && (
            <div className="clinical-media-toolbar" onClick={(e) => e.stopPropagation()}>
              {/* Alinhamento */}
            <div className="flex gap-1 border-r border-slate-700/20 dark:border-slate-200/20 pr-1">
              <button
                type="button"
                className={align === "left" ? "is-active" : ""}
                onClick={() => updateAttributes({ align: "left" })}
                title="Esquerda"
              >
                Esq
              </button>
              <button
                type="button"
                className={align === "center" ? "is-active" : ""}
                onClick={() => updateAttributes({ align: "center" })}
                title="Centro"
              >
                Centro
              </button>
              <button
                type="button"
                className={align === "right" ? "is-active" : ""}
                onClick={() => updateAttributes({ align: "right" })}
                title="Direita"
              >
                Dir
              </button>
            </div>

            {/* Word wrap options */}
            <div className="flex gap-1 border-r border-slate-700/20 dark:border-slate-200/20 pr-1">
              <button
                type="button"
                className={(attrs.wrap || "none") === "none" ? "is-active" : ""}
                onClick={() => updateAttributes({ wrap: "none", top: null, left: null })}
                title="Quebrar texto"
              >
                Quebrar
              </button>
              <button
                type="button"
                className={attrs.wrap === "inline" ? "is-active" : ""}
                onClick={() => updateAttributes({ wrap: "inline", top: null, left: null })}
                title="Em Linha"
              >
                Linha
              </button>
              <button
                type="button"
                className={attrs.wrap === "left" ? "is-active" : ""}
                onClick={() => updateAttributes({ wrap: "left", top: null, left: null })}
                title="Envolver Esquerda"
              >
                Esq (Flutuar)
              </button>
              <button
                type="button"
                className={attrs.wrap === "right" ? "is-active" : ""}
                onClick={() => updateAttributes({ wrap: "right", top: null, left: null })}
                title="Envolver Direita"
              >
                Dir (Flutuar)
              </button>
              <button
                type="button"
                className={attrs.wrap === "behind" ? "is-active font-bold" : ""}
                onClick={() => {
                  const wrapper = wrapperRef.current;
                  let t = "20px";
                  let l = "20px";
                  if (wrapper) {
                    const container = wrapper.closest(".ProseMirror");
                    if (container) {
                      const containerRect = container.getBoundingClientRect();
                      const wrapperRect = wrapper.getBoundingClientRect();
                      t = `${Math.round(wrapperRect.top - containerRect.top + container.scrollTop)}px`;
                      l = `${Math.round(wrapperRect.left - containerRect.left + container.scrollLeft)}px`;
                    }
                  }
                  updateAttributes({ wrap: "behind", top: t, left: l });
                }}
                title="Atrás do texto (Livre)"
              >
                Atrás
              </button>
              <button
                type="button"
                className={attrs.wrap === "front" ? "is-active font-bold" : ""}
                onClick={() => {
                  const wrapper = wrapperRef.current;
                  let t = "20px";
                  let l = "20px";
                  if (wrapper) {
                    const container = wrapper.closest(".ProseMirror");
                    if (container) {
                      const containerRect = container.getBoundingClientRect();
                      const wrapperRect = wrapper.getBoundingClientRect();
                      t = `${Math.round(wrapperRect.top - containerRect.top + container.scrollTop)}px`;
                      l = `${Math.round(wrapperRect.left - containerRect.left + container.scrollLeft)}px`;
                    }
                  }
                  updateAttributes({ wrap: "front", top: t, left: l });
                }}
                title="Na frente do texto (Livre)"
              >
                Frente
              </button>
            </div>

            {/* Larguras predefinidas */}
            <div className="flex gap-1 border-r border-slate-700/20 dark:border-slate-200/20 pr-1">
              <button type="button" className={attrs.width === "50%" ? "is-active" : ""} onClick={() => commitWidth("50%")}>
                50%
              </button>
              <button type="button" className={attrs.width === "75%" ? "is-active" : ""} onClick={() => commitWidth("75%")}>
                75%
              </button>
              <button type="button" className={attrs.width === "100%" ? "is-active" : ""} onClick={() => commitWidth("100%")}>
                100%
              </button>
            </div>

            <button type="button" onClick={openImageEditor}>
              Editar
            </button>
            <button
              type="button"
              className="is-danger"
              onClick={() => {
                deleteNode();
              }}
              title="Remover"
            >
              <Trash2 className="h-3 w-3" />
              Remover
            </button>
          </div>
          )}
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

  addNodeView() {
    return ReactNodeViewRenderer(ClinicalMediaNodeView, {
      contentDOMElementTag: "figcaption",
      selectedOnTextSelection: true,
    });
  },
});
