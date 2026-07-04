import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { ResizableImage } from "../ResizableImageExtension";

describe("clinical media extension integration", () => {
  it("migra img legado para figure semântica ao serializar", () => {
    const editor = new Editor({
      extensions: [StarterKit, ResizableImage],
      content: '<img src="/legacy.png" data-rich-text-image="true" data-align="right" data-width="75%" />',
    });

    expect(editor.getJSON()).toMatchObject({
      type: "doc",
      content: [
        {
          type: "clinicalMedia",
          attrs: {
            src: "/legacy.png",
            align: "right",
            width: "75%",
          },
        },
      ],
    });

    expect(editor.getHTML()).toContain('<figure data-type="clinical-media" data-align="right" data-width="75%" data-wrap="none" data-top="" data-left="">');
    expect(editor.getHTML()).toContain('<img src="/legacy.png" alt="" title="" data-rich-text-image="true">');
  });

  it("preserva figcaption como caption editável do node", () => {
    const editor = new Editor({
      extensions: [StarterKit, ResizableImage],
      content:
        '<figure data-type="clinical-media" data-align="center" data-width="100%"><img src="/caption.png" alt="ombro" /><figcaption>Legenda clínica</figcaption></figure>',
    });

    expect(editor.getJSON()).toMatchObject({
      type: "doc",
      content: [
        {
          type: "clinicalMedia",
          attrs: {
            src: "/caption.png",
            alt: "ombro",
            align: "center",
            width: "100%",
          },
          content: [{ type: "text", text: "Legenda clínica" }],
        },
      ],
    });
  });
});
