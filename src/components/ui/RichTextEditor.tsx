/**
 * RichTextEditor - Reusable Tiptap-based rich text editor
 */
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { CustomTaskItem } from "./CustomTaskItem";
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
import {
  Dumbbell,
  Search,
  ClipboardCheck,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  List as ListIcon,
  ListOrdered,
  ListChecks,
  Highlighter,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Table as TableIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useRichTextContext } from "@/contexts/RichTextContext";
import {
  SlashCommand,
  suggestionConfig,
  ExerciseAutocomplete,
  exerciseSuggestionConfig,
} from "./slash-command/suggestion";
import { useExercises } from "@/hooks/useExercises";
import { usePatientGoals, usePatientPathologies } from "@/hooks/usePatientEvolution";
import { useSoapRecords } from "@/hooks/useSoapRecords";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList as UICommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { withImageParams } from "@/lib/storageProxy";
import { uploadFile, STORAGE_FOLDERS } from "@/lib/storage/upload";
import { toast } from "sonner";
import { ImageEditDialog } from "@/components/ui/rich-text/ImageEditDialog";
import { ResizableImage } from "@/components/ui/rich-text/ResizableImageExtension";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { getWorkersApiUrl } from "@/lib/api/config";
import { shouldApplyExternalValue, normalizeEditorHtml, normalizeIncomingEditorHtml } from "./richTextSync";
import "./rich-text-editor.css";

const lowlight = createLowlight(common);

const ForceListContinue = Extension.create({
  name: "forceListContinue",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, commands } = this.editor;
        const { selection } = state;
        if (!selection.empty) return false;
        const { $from } = selection;
        const parent = $from.parent;
        const parentType = parent.type.name;
        const isListItem = parentType === "listItem";
        const isTaskItem = parentType === "taskItem";
        if (!isListItem && !isTaskItem) return false;
        const text = parent.textContent.replace(/\u200b/g, "").trim();
        if (text.length > 0) return false;
        if (isTaskItem) return commands.splitListItem("taskItem");
        return commands.splitListItem("listItem");
      },
    };
  },
});

interface RichTextEditorProps {
  value: string;
  onValueChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  imageUploadFolder?: string;
  patientId?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  accentColor?: "sky" | "emerald" | "amber" | "rose";
  showToolbar?: boolean;
  /** ID para colaboração real-time (ex: soap_record_id) */
  collaborationId?: string;
  /** Nome do usuário para o cursor de colaboração */
  userName?: string;
  /** Cor do cursor de colaboração */
  userColor?: string;
  /**
   * Increment this value to intentionally replace the editor content from the
   * parent, including collaborative sessions where normal prop sync is disabled.
   */
  externalValueRevision?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onValueChange,
  placeholder = "",
  disabled = false,
  imageUploadFolder,
  patientId,
  className,
  onFocus,
  onBlur,
  accentColor = "emerald",
  showToolbar = false,
  collaborationId,
  userName = "Profissional",
  userColor = "#10b981",
  externalValueRevision,
}) => {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValue = useRef<string | null>(null);
  const lastSentValue = useRef(normalizeIncomingEditorHtml(value));
  const lastExternalValueRevision = useRef(externalValueRevision);
  const isUpdatingFromProp = useRef(false);
  const onValueChangeRef = useRef(onValueChange);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const context = useRichTextContext();
  const setActiveEditor = context?.setActiveEditor;

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const flushPendingValue = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    const nextValue = pendingValue.current;
    if (nextValue === null) return;

    pendingValue.current = null;
    if (nextValue === lastSentValue.current) return;

    lastSentValue.current = nextValue;
    onValueChangeRef.current(nextValue);
  }, []);

  // ── Colaboração Real-time (Yjs) ─────────────────────
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!collaborationId) {
      setYdoc(null);
      setProvider(null);
      return;
    }

    const doc = new Y.Doc();
    setYdoc(doc);

    const baseUrl = getWorkersApiUrl();
    const wsUrl =
      (baseUrl.startsWith("https")
        ? baseUrl.replace("https", "wss")
        : baseUrl.replace("http", "ws")) + `/api/sessions/${collaborationId}/collaboration`;

    const p = new WebsocketProvider(wsUrl, collaborationId, doc);
    setProvider(p);

    return () => {
      p.destroy();
      doc.destroy();
    };
  }, [collaborationId]);

  // Limpeza dos timers no unmount para evitar leaks
  useEffect(() => {
    return () => {
      flushPendingValue();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [flushPendingValue]);

  // Data Hooks
  const { exercises } = useExercises();
  const { data: goals = [] } = usePatientGoals(patientId || "");
  const { data: pathologies = [] } = usePatientPathologies(patientId || "");
  const { data: evolutions = [] } = useSoapRecords(patientId || "", 5);

  // UI Modals State
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [testsOpen, setTestsOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [editingExistingImage, setEditingExistingImage] = useState<{
    src: string;
    alt?: string;
    title?: string;
    updateAttributes: (attrs: Record<string, unknown>) => void;
  } | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // Reset input
    e.target.value = "";

    const loadingToast = toast.loading("Enviando imagem...");

    try {
      const url = await uploadFile(file, imageUploadFolder || STORAGE_FOLDERS.PATIENTS);
      editor
        .chain()
        .focus()
        .setImage({ src: url, align: "center", width: "100%" } as any)
        .run();
      toast.dismiss(loadingToast);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.dismiss(loadingToast);
      toast.error("Erro ao fazer upload da imagem");
    }
  };

  const handleInput = useCallback(() => {
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
  }, []);

  const getAccentGlow = () => {
    const colors = {
      sky: "hsl(199, 89%, 48%)",
      emerald: "hsl(263, 70%, 50%)",
      amber: "hsl(38, 92%, 50%)",
      rose: "hsl(346, 77%, 49%)",
    };
    return colors[accentColor];
  };

  const extensions = useMemo(() => {
    const base = [
      ForceListContinue,
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
        codeBlock: false,
        // Se estiver em colaboração, desativamos o history do StarterKit
        // para usar o history compartilhado do Yjs.
        history: !collaborationId,
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
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
      CustomTaskItem.configure({
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
      SlashCommand.configure({
        suggestion: suggestionConfig(exercises, { imageUploadFolder }),
      }),
      ExerciseAutocomplete.configure({
        suggestion: exerciseSuggestionConfig(exercises),
      }),
    ];

    if (ydoc && collaborationId) {
      base.push(
        Collaboration.configure({
          document: ydoc,
        }),
      );
      if (provider) {
        base.push(
          CollaborationCursor.configure({
            provider,
            user: {
              name: userName,
              color: userColor,
            },
          }),
        );
      }
    }

    return base;
  }, [
    exercises,
    placeholder,
    imageUploadFolder,
    collaborationId,
    ydoc,
    provider,
    userName,
    userColor,
  ]);

  const editor = useEditor({
    extensions,
    content: normalizeIncomingEditorHtml(value || ""),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      if (isUpdatingFromProp.current) return;
      const html = ed.getHTML();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      pendingValue.current = normalizeEditorHtml(html);
      // Debounce curto — autosave precisa parecer imediato (Notion/Google Docs).
      debounceTimer.current = setTimeout(flushPendingValue, 300);
    },
    onFocus: () => {
      onFocus?.();
      if (editor) setActiveEditor?.(editor);
    },
    onBlur: () => {
      flushPendingValue();
      onBlur?.();
    },
    editorProps: {
      attributes: { class: "outline-none" },
    },
  });

  // ── Signal Listeners ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!editor?.isFocused) return;

      // 1. Biblioteca
      if ((window as any).__OPEN_EXERCISE_LIBRARY) {
        (window as any).__OPEN_EXERCISE_LIBRARY = false;
        setLibraryOpen(true);
      }

      // 2. Metas
      if ((window as any).__INSERT_PATIENT_METAS) {
        (window as any).__INSERT_PATIENT_METAS = false;
        if (goals.length > 0) {
          const html = `<h3>🎯 Metas de Tratamento</h3><ul data-type="taskList">${goals
            .map(
              (g) =>
                `<li data-type="taskItem" data-checked="${g.status === "concluido"}"><p>${g.description}</p></li>`,
            )
            .join("")}</ul>`;
          editor.chain().focus().insertContent(html).run();
          toast.success("Metas inseridas");
        } else {
          toast.error("Nenhuma meta cadastrada para este paciente");
        }
      }

      // 3. Diagnóstico
      if ((window as any).__INSERT_PATIENT_DIAGNOSTICO) {
        (window as any).__INSERT_PATIENT_DIAGNOSTICO = false;
        if (pathologies.length > 0) {
          const html = `<h3>📋 Diagnóstico Clínico</h3>${pathologies
            .map(
              (p) =>
                `<div class="notion-callout notion-callout--info"><span class="notion-callout-icon">🩺</span><div class="notion-callout-content"><p><strong>${p.name}:</strong> ${p.description || "Sem descrição"}</p></div></div>`,
            )
            .join("")}`;
          editor.chain().focus().insertContent(html).run();
          toast.success("Diagnóstico inserido");
        } else {
          toast.error("Nenhuma patologia cadastrada para este paciente");
        }
      }

      // 4. Última Sessão
      if ((window as any).__REPLICATE_PREVIOUS_SESSION) {
        (window as any).__REPLICATE_PREVIOUS_SESSION = false;
        const lastSession = evolutions[0];
        if (lastSession) {
          editor
            .chain()
            .focus()
            .insertContent("<h3>🔄 Replicado da Última Sessão</h3>")
            .insertContent(lastSession.plan || "Sem conduta registrada na última sessão")
            .run();
          toast.success("Conduta anterior replicada");
        } else {
          toast.error("Nenhuma sessão anterior encontrada");
        }
      }

      // 5. Testes
      if ((window as any).__OPEN_TESTS_SELECTOR) {
        (window as any).__OPEN_TESTS_SELECTOR = false;
        setTestsOpen(true);
      }

      // 6. IA Assistente
      if ((window as any).__TRIGGER_AI_CONDUCT) {
        (window as any).__TRIGGER_AI_CONDUCT = false;
        toast.info("Solicitando sugestão à IA...");
        // Simulação de chamada de IA - Em produção chamaria patient-summary ou similar
        setTimeout(() => {
          const aiHtml = `<div class="notion-callout notion-callout--info" style="border-left-color: #10b981"><span class="notion-callout-icon">✨</span><div class="notion-callout-content"><p><strong>Sugestão da IA:</strong> Baseado na evolução estável, recomendo progressão de carga nos exercícios de agachamento e início de treino de equilíbrio dinâmico.</p></div></div>`;
          editor.chain().focus().insertContent(aiHtml).run();
        }, 1500);
      }

      // 7. Assinatura
      if ((window as any).__INSERT_SIGNATURE) {
        (window as any).__INSERT_SIGNATURE = false;
        const now = new Date().toLocaleString("pt-BR");
        const user = (window as any).__USER_PROFILE || {
          full_name: "Profissional",
          crefito: "—",
        };
        const html = `<hr /><p style="text-align: right text-slate-400 font-medium italic">Assinado eletronicamente por <strong>${user.full_name}</strong> (CREFITO: ${user.crefito}) em ${now}</p>`;
        editor.chain().focus().insertContent(html).run();
      }
    }, 150);
    return () => clearInterval(interval);
  }, [editor, goals, pathologies, evolutions]);

  // Sync external value changes — editor "semi-controlado".
  // O editor é dono do seu documento enquanto o usuário digita. O `value`
  // externo só sobrescreve em: (1) substituição explícita via
  // `externalValueRevision` (ex.: "Replicar sessão") ou (2) mudança externa
  // genuína com o campo ocioso. Nunca arrancamos texto debaixo do cursor nem
  // re-aplicamos ecos do autosave — causa raiz de "o autosave para quando edito
  // o texto" (ref: tiptap#4828 e o anti-padrão de controlled component).
  // Colaboração (Yjs) é dona do documento, então prop changes são ignoradas.
  useEffect(() => {
    if (!editor) return;

    const hasExplicitExternalUpdate =
      externalValueRevision !== undefined &&
      externalValueRevision !== lastExternalValueRevision.current;

    const isCollaborationLoaded = editor.extensionManager.extensions.some(
      (e) => e.name === "collaboration",
    );
    if (collaborationId && isCollaborationLoaded && !hasExplicitExternalUpdate) {
      if (hasExplicitExternalUpdate) lastExternalValueRevision.current = externalValueRevision;
      return;
    }

    const incoming = normalizeIncomingEditorHtml(value || "");
    if (
      shouldApplyExternalValue({
        incoming,
        current: normalizeEditorHtml(editor.getHTML()),
        lastSent: lastSentValue.current,
        // Há um flush de digitação pendente → tratar como "ainda digitando".
        isFocused: editor.isFocused || debounceTimer.current !== null,
        hasExplicitRevision: hasExplicitExternalUpdate,
      })
    ) {
      isUpdatingFromProp.current = true;
      // emitUpdate:false — substituição programática NÃO deve disparar onUpdate
      // (senão volta como "edição do usuário" e gera eco/loop).
      editor.commands.setContent(incoming, { emitUpdate: false });
      lastSentValue.current = incoming;
      isUpdatingFromProp.current = false;
    }

    if (hasExplicitExternalUpdate) {
      lastExternalValueRevision.current = externalValueRevision;
    }
  }, [value, editor, collaborationId, externalValueRevision]);

  useEffect(() => {
    // emitUpdate:false — alternar editável não pode emitir um update espúrio
    // (com o doc vazio durante a montagem), que apagaria o conteúdo (tiptap#4828).
    if (editor) editor.setEditable(!disabled, false);
  }, [disabled, editor]);

  useEffect(() => {
    const handleEditExistingImage = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.src || typeof detail.updateAttributes !== "function") return;
      setEditingExistingImage({
        src: detail.src,
        alt: detail.alt,
        title: detail.title,
        updateAttributes: detail.updateAttributes,
      });
    };

    window.addEventListener("rich-text-edit-existing-image", handleEditExistingImage);

    return () => {
      window.removeEventListener("rich-text-edit-existing-image", handleEditExistingImage);
    };
  }, []);

  const handleSaveEditedExistingImage = async (file: File) => {
    if (!editingExistingImage) return;
    const toastId = toast.loading("Atualizando imagem...");

    try {
      const result = await uploadFile(file, {
        folder: imageUploadFolder || STORAGE_FOLDERS.IMAGES,
      });

      editingExistingImage.updateAttributes({
        src: result.url,
        alt: file.name,
        title: editingExistingImage.title,
      });
      toast.success("Imagem atualizada.", { id: toastId });
      setEditingExistingImage(null);
    } catch (error) {
      console.error("Image update error:", error);
      toast.error("Erro ao atualizar imagem.", { id: toastId });
    }
  };

  const filteredExercises = useMemo(() => {
    if (!librarySearch) return exercises.slice(0, 10);
    const q = librarySearch.toLowerCase();
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q)).slice(0, 10);
  }, [exercises, librarySearch]);

  const handleLibrarySelect = (exercise: any) => {
    if (!editor) return;
    const insertText = `${exercise.name} — 3x10 rep`;
    const { $from } = editor.state.selection;
    const isTaskItem = editor.isActive("taskItem");

    if (isTaskItem) {
      const start = $from.start();
      const end = $from.end();
      editor
        .chain()
        .focus()
        .insertContentAt({ from: start, to: end }, insertText)
        .setTextSelection({
          from: start + exercise.name.length + 3,
          to: start + insertText.length,
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent(
          `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>${insertText}</p></li></ul>`,
        )
        .run();
    }
    setLibraryOpen(false);
    setLibrarySearch("");
  };

  const handleTestSelect = (testName: string) => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p><strong>Teste: ${testName}</strong> — [ ] Positivo [ ] Negativo</p></li></ul>`,
      )
      .run();
    setTestsOpen(false);
  };

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rich-text-editor rounded-lg border border-transparent",
        isTyping && "typing-active",
        className,
      )}
      style={isTyping ? ({ "--typing-glow": getAccentGlow() } as React.CSSProperties) : undefined}
    >
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />
      {showToolbar && editor && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border border-slate-200 bg-slate-50/80 rounded-t-lg sticky top-0 z-10">
          {[
            {
              icon: BoldIcon,
              action: () => editor.chain().focus().toggleBold().run(),
              active: editor.isActive("bold"),
              label: "Negrito",
            },
            {
              icon: ItalicIcon,
              action: () => editor.chain().focus().toggleItalic().run(),
              active: editor.isActive("italic"),
              label: "Itálico",
            },
            {
              icon: UnderlineIcon,
              action: () => editor.chain().focus().toggleUnderline().run(),
              active: editor.isActive("underline"),
              label: "Sublinhado",
            },
            {
              icon: Strikethrough,
              action: () => editor.chain().focus().toggleStrike().run(),
              active: editor.isActive("strike"),
              label: "Tachado",
            },
            {
              icon: SubscriptIcon,
              action: () => editor.chain().focus().toggleSubscript().run(),
              active: editor.isActive("subscript"),
              label: "Subscrito",
            },
            {
              icon: SuperscriptIcon,
              action: () => editor.chain().focus().toggleSuperscript().run(),
              active: editor.isActive("superscript"),
              label: "Sobrescrito",
            },
            { sep: true },
            {
              icon: LinkIcon,
              action: () => {
                const previousUrl = editor.getAttributes("link").href;
                const url = window.prompt("URL do link:", previousUrl);
                if (url === null) return;
                if (url === "") {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  return;
                }
                editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
              },
              active: editor.isActive("link"),
              label: "Inserir Link",
            },
            { sep: true },
            {
              icon: Heading2,
              action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              active: editor.isActive("heading", { level: 2 }),
              label: "Título grande",
            },
            {
              icon: Heading3,
              action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
              active: editor.isActive("heading", { level: 3 }),
              label: "Subtítulo",
            },
            { sep: true },
            {
              icon: ListIcon,
              action: () => editor.chain().focus().toggleBulletList().run(),
              active: editor.isActive("bulletList"),
              label: "Lista",
            },
            {
              icon: ListOrdered,
              action: () => editor.chain().focus().toggleOrderedList().run(),
              active: editor.isActive("orderedList"),
              label: "Lista numerada",
            },
            {
              icon: ListChecks,
              action: () => editor.chain().focus().toggleTaskList().run(),
              active: editor.isActive("taskList"),
              label: "Checklist",
            },
            { sep: true },
            {
              icon: Quote,
              action: () => editor.chain().focus().toggleBlockquote().run(),
              active: editor.isActive("blockquote"),
              label: "Citação",
            },
            {
              icon: Highlighter,
              action: () => editor.chain().focus().toggleHighlight().run(),
              active: editor.isActive("highlight"),
              label: "Destacar",
            },
            { sep: true },
            {
              icon: Undo2,
              action: () => editor.chain().focus().undo().run(),
              active: false,
              label: "Desfazer",
            },
            {
              icon: Redo2,
              action: () => editor.chain().focus().redo().run(),
              active: false,
              label: "Refazer",
            },
            {
              icon: Eraser,
              action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
              active: false,
              label: "Limpar formatação",
            },
            { sep: true },
            {
              icon: AlignLeft,
              action: () => editor.chain().focus().setTextAlign("left").run(),
              active: editor.isActive({ textAlign: "left" }),
              label: "Alinhar à esquerda",
            },
            {
              icon: AlignCenter,
              action: () => editor.chain().focus().setTextAlign("center").run(),
              active: editor.isActive({ textAlign: "center" }),
              label: "Centralizar",
            },
            {
              icon: AlignRight,
              action: () => editor.chain().focus().setTextAlign("right").run(),
              active: editor.isActive({ textAlign: "right" }),
              label: "Alinhar à direita",
            },
            { sep: true },
            {
              icon: ImageIcon,
              action: () => imageInputRef.current?.click(),
              active: false,
              label: "Inserir Imagem",
            },
            {
              icon: TableIcon,
              action: () =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              active: editor.isActive("table"),
              label: "Tabela",
            },
          ].map((tool, idx) => {
            if ("sep" in tool && tool.sep) {
              return <span key={`sep-${idx}`} className="mx-1 h-5 w-px bg-slate-300" aria-hidden />;
            }
            const t = tool as {
              icon: typeof BoldIcon;
              action: () => void;
              active: boolean;
              label: string;
            };
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  t.action();
                }}
                title={t.label}
                aria-label={t.label}
                aria-pressed={t.active}
                disabled={disabled}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  t.active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                  disabled && "opacity-40 cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      )}
      <div
        className="flex-1 cursor-text"
        onClick={() => {
          if (editor && !editor.isFocused) {
            editor.chain().focus().run();
          }
        }}
      >
        <EditorContent editor={editor} onInput={handleInput} />
      </div>
      <ImageEditDialog
        open={!!editingExistingImage}
        sourceUrl={editingExistingImage?.src}
        fileName={editingExistingImage?.alt || "imagem"}
        title="Editar imagem da evolução"
        onClose={() => setEditingExistingImage(null)}
        onSaveImage={handleSaveEditedExistingImage}
      />

      {/* ── Exercise Library Dialog ── */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="p-4 border-b bg-slate-50/50">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Dumbbell className="w-5 h-5" /> Biblioteca de Exercícios
            </DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className="rounded-none border-none">
            <div className="flex items-center border-b px-4 bg-white sticky top-0 z-10">
              <Search className="mr-2 h-5 w-5 shrink-0 opacity-50 text-slate-400" />
              <CommandInput
                placeholder="Pesquisar exercício por nome ou categoria..."
                value={librarySearch}
                onValueChange={setLibrarySearch}
                className="flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-none border-none focus:ring-0"
                autoFocus
              />
            </div>
            <UICommandList className="max-h-[450px] overflow-y-auto p-2 scrollbar-thin">
              <CommandEmpty className="py-12 text-center text-slate-500">
                Nenhum exercício encontrado
              </CommandEmpty>
              <CommandGroup>
                {filteredExercises.map((exercise: any) => (
                  <CommandItem
                    key={exercise.id}
                    onSelect={() => handleLibrarySelect(exercise)}
                    className="flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-slate-50 aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-all group"
                  >
                    <div className="h-16 w-16 flex-shrink-0 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
                      {exercise.image_url ? (
                        <img
                          src={withImageParams(exercise.image_url, {
                            width: 128,
                            height: 128,
                            fit: "cover",
                          })}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Dumbbell className="h-8 w-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-base truncate">{exercise.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                        {exercise.category || "Geral"}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </UICommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* ── Tests Selector Dialog ── */}
      <Dialog open={testsOpen} onOpenChange={setTestsOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" /> Selecionar Teste Clínico
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto p-1">
            {[
              "Lachman",
              "Gaveta Anterior",
              "McMurray",
              "Thompson",
              "Phalen",
              "Lasègue",
              "Neer",
              "Jobe",
              "Apprehension",
            ].map((test) => (
              <Button
                key={test}
                variant="outline"
                className="justify-start h-12 text-left hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                onClick={() => handleTestSelect(test)}
              >
                {test}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestsOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
