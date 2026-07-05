/**
 * evolutionEditorExtensions — schema de documento compartilhado da evolução
 * clínica (TipTap). Extraído de src/components/ui/RichTextEditor.tsx.
 *
 * EXCLUÍDAS deliberadamente (UI-only, não fazem parte do schema do
 * documento):
 * - Placeholder, Collaboration, CollaborationCursor (client-only)
 * - ForceListContinue (atalho de teclado; não define nó/mark)
 * - SlashCommand, ExerciseAutocomplete (menus de sugestão dependentes de
 *   dados da aplicação — exercises/imageUploadFolder; não definem nó/mark)
 * - CustomTaskItem: só adiciona um NodeView React (checkbox + botão
 *   "Biblioteca") sobre @tiptap/extension-task-item; o schema (name,
 *   content, attrs) é idêntico ao TaskItem oficial, então aqui usamos o
 *   TaskItem oficial com a MESMA configuração (nested/HTMLAttributes). O
 *   cliente (Task 6) pode fazer `.extend({ addNodeView })` sobre este
 *   TaskItem para manter a UI sem duplicar o schema.
 *
 * INCLUÍDA (não é UI-only apesar do nome): ResizableImage ("clinicalMedia")
 * — é um Node customizado com attrs/parseHTML/renderHTML próprios, portanto
 * faz parte do schema real do documento e precisa estar aqui para o
 * Durable Object (Task 5) conseguir interpretar o Y.Doc corretamente.
 */
import type { Extensions } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Youtube } from "@tiptap/extension-youtube";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { ResizableImage } from "./nodes/ResizableImage";
import { FontSize } from "./nodes/fontSize";

const lowlight = createLowlight(common);

export const evolutionEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    underline: false,
    codeBlock: false,
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight.configure({ multicolor: true }),
  TextStyle,
  FontSize,
  Color,
  Subscript,
  Superscript,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: "text-primary underline cursor-pointer" },
  }),
  ResizableImage.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: "rounded-lg max-w-full h-auto my-4 mx-auto block",
    },
  }),
  Youtube.configure({
    HTMLAttributes: {
      class: "rounded-lg max-w-full my-4 mx-auto block aspect-video",
    },
  }),
  TaskList.configure({
    HTMLAttributes: { class: "notion-task-list" },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: { class: "notion-task-item" },
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: { class: "notion-table" },
  }),
  TableRow,
  TableHeader,
  TableCell,
  CodeBlockLowlight.configure({
    lowlight,
    HTMLAttributes: { class: "notion-code-block" },
  }),
];
