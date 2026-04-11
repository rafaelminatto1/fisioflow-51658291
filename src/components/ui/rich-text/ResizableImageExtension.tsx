import React, { useRef } from "react";
import { mergeAttributes } from "@tiptap/core";
import { Image as TiptapImage } from "@tiptap/extension-image";
import {
	NodeViewWrapper,
	ReactNodeViewRenderer,
	type NodeViewProps,
} from "@tiptap/react";

type ImageAlign = "left" | "center" | "right";

type ImageNodeAttrs = {
	src: string;
	alt?: string;
	title?: string;
	width?: string | null;
	align?: ImageAlign;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

function ResizableImageNodeView({
	node,
	selected,
	updateAttributes,
	deleteNode,
}: NodeViewProps) {
	const attrs = node.attrs as ImageNodeAttrs;
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const align = attrs.align || "center";
	const width = attrs.width || "100%";

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
			const nextWidth = clamp(
				startWidth + moveEvent.clientX - startX,
				120,
				Math.max(120, maxWidth),
			);
			updateAttributes({ width: `${Math.round(nextWidth)}px` });
		};

		const onPointerUp = () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	const setWidthPercent = (percent: number) => {
		updateAttributes({ width: `${percent}%` });
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
				"rich-text-image-node",
				selected ? "is-selected" : "",
				`is-aligned-${align}`,
			].join(" ")}
			data-align={align}
			style={{ width }}
			draggable
			data-drag-handle
		>
			<img
				src={attrs.src}
				alt={attrs.alt || ""}
				title={attrs.title || ""}
				draggable={false}
			/>
			<div className="rich-text-image-menu" contentEditable={false}>
				<button type="button" onClick={() => updateAttributes({ align: "left" })}>
					Esq
				</button>
				<button
					type="button"
					onClick={() => updateAttributes({ align: "center" })}
				>
					Centro
				</button>
				<button
					type="button"
					onClick={() => updateAttributes({ align: "right" })}
				>
					Dir
				</button>
				<button type="button" onClick={() => setWidthPercent(50)}>
					50%
				</button>
				<button type="button" onClick={() => setWidthPercent(75)}>
					75%
				</button>
				<button type="button" onClick={() => setWidthPercent(100)}>
					100%
				</button>
				<button type="button" onClick={openImageEditor}>
					Editar
				</button>
				<button type="button" onClick={deleteNode} className="is-danger">
					Remover
				</button>
			</div>
			<button
				type="button"
				className="rich-text-image-resize-handle"
				aria-label="Redimensionar imagem"
				contentEditable={false}
				onPointerDown={startResize}
			/>
		</NodeViewWrapper>
	);
}

export const ResizableImage = TiptapImage.extend({
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (element) =>
					element.getAttribute("data-width") ||
					element.style.width ||
					element.getAttribute("width"),
				renderHTML: (attributes) => {
					if (!attributes.width) return {};
					return {
						"data-width": attributes.width,
						style: `width: ${attributes.width}; max-width: 100%;`,
					};
				},
			},
			align: {
				default: "center",
				parseHTML: (element) =>
					(element.getAttribute("data-align") as ImageAlign | null) || "center",
				renderHTML: (attributes) => ({
					"data-align": attributes.align || "center",
				}),
			},
		};
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"img",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				"data-rich-text-image": "true",
			}),
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(ResizableImageNodeView);
	},
});
