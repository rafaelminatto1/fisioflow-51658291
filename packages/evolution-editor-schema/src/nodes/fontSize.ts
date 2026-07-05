/**
 * Cópia da extensão "fontSize" (packages/evolution-editor-schema).
 * Fonte original: src/components/ui/RichTextEditor.tsx.
 * Adiciona um atributo global ao mark textStyle — parte do schema do
 * documento (afeta HTML gerado), não é UI-only.
 */
import { Extension } from "@tiptap/core";

export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/["']/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});
