/**
 * RichTextEditor - Reusable Tiptap-based rich text editor
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CustomTaskItem } from "./CustomTaskItem";
import { evolutionEditorExtensions } from "@fisioflow/evolution-editor-schema";
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
import YProvider from "y-partyserver/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { shouldApplyExternalValue, normalizeEditorHtml, normalizeIncomingEditorHtml } from "./richTextSync";
import "./rich-text-editor.css";

const FONT_SIZE_OPTIONS = [
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
] as const;

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
  /** Notifica o pai sobre o status da conexão de colaboração (Yjs/DO). */
  onCollabStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
  /** Notifica o pai sobre a instância do provider (para presença via awareness). */
  onCollabProviderChange?: (provider: YProvider | null) => void;
}

/** Handle imperativo: permite ao pai forçar o flush do debounce pendente
 * antes de uma remontagem controlada (ex.: transição classic → colaborativo),
 * evitando perder o que o usuário digitou nos últimos ~300ms. */
export interface RichTextEditorHandle {
  flushPendingValue: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
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
  onCollabStatusChange,
  onCollabProviderChange,
}, ref) => {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValue = useRef<string | null>(null);
  const lastSentValue = useRef(normalizeIncomingEditorHtml(value));
  const lastExternalValueRevision = useRef(externalValueRevision);
  const isUpdatingFromProp = useRef(false);
  const onValueChangeRef = useRef(onValueChange);
  const onCollabStatusChangeRef = useRef(onCollabStatusChange);
  const onCollabProviderChangeRef = useRef(onCollabProviderChange);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const context = useRichTextContext();
  const setActiveEditor = context?.setActiveEditor;

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    onCollabStatusChangeRef.current = onCollabStatusChange;
  }, [onCollabStatusChange]);

  useEffect(() => {
    onCollabProviderChangeRef.current = onCollabProviderChange;
  }, [onCollabProviderChange]);

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

  useImperativeHandle(ref, () => ({ flushPendingValue }), [flushPendingValue]);

  // ── Colaboração Real-time (Yjs) ─────────────────────
  // O Y.Doc precisa existir de forma SÍNCRONA na primeira renderização: o
  // `useEditor` abaixo monta o editor já na primeira chamada e só inclui a
  // extensão `Collaboration` (que registra o `ySyncPlugin`, o que de fato
  // vincula o ProseMirror ao Yjs) se `ydoc` já estiver disponível nesse
  // instante. Criar o doc dentro de um `useEffect` (como antes) deixa `ydoc`
  // `null` no primeiro render — o editor nasce sem `ySyncPlugin` e o TipTap
  // não o adiciona depois, pois `useEditor` não recria a instância quando só
  // a lista de `extensions` muda (apenas quando os `deps` explícitos mudam).
  // `Y.Doc` é uma classe simples e seu construtor não faz I/O, então criá-la
  // em `useMemo` é seguro e síncrono.
  const ydoc = useMemo(() => (collaborationId ? new Y.Doc() : null), [collaborationId]);
  const [provider, setProvider] = useState<YProvider | null>(null);

  // Destrói o Y.Doc anterior quando `collaborationId` muda ou no unmount.
  // Precisa ser um efeito separado (não o de conexão abaixo) porque o `ydoc`
  // memoizado já existe antes de qualquer efeito rodar.
  useEffect(() => {
    return () => {
      ydoc?.destroy();
    };
  }, [ydoc]);

  useEffect(() => {
    if (!collaborationId || !ydoc) {
      setProvider(null);
      onCollabProviderChangeRef.current?.(null);
      return;
    }

    // Persistência offline: mantém as edições localmente (IndexedDB) mesmo
    // sem conexão com o Durable Object, sincronizando ao reconectar.
    const idb = new IndexeddbPersistence(collaborationId, ydoc);

    const host = new URL(getWorkersApiUrl()).host;
    // O worker (apps/api) roteia manualmente `/api/sessions/:id/collaboration`
    // para o Durable Object (getServerByName), sem usar o prefixo padrão
    // "/parties/:party" do y-partyserver — por isso o `prefix` aponta
    // diretamente para a rota real, e o room não é reapendado à URL.
    const p = new YProvider(host, collaborationId, ydoc, {
      prefix: `/api/sessions/${collaborationId}/collaboration`,
      params: async () => ({ token: (await getNeonAccessToken()) ?? "" }),
    });
    setProvider(p);
    onCollabProviderChangeRef.current?.(p);
    onCollabStatusChangeRef.current?.("connecting");

    const handleStatus = ({ status }: { status: "connecting" | "connected" | "disconnected" }) => {
      onCollabStatusChangeRef.current?.(status);
    };
    const handleSynced = (isSynced: boolean) => {
      if (isSynced) onCollabStatusChangeRef.current?.("connected");
    };
    p.on("status", handleStatus);
    p.on("synced", handleSynced);

    return () => {
      p.off("status", handleStatus);
      p.off("synced", handleSynced);
      p.destroy();
      idb.destroy();
      onCollabProviderChangeRef.current?.(null);
    };
  }, [collaborationId, ydoc]);

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

  const uploadAndInsertImage = async (file: File) => {
    if (!editor) return;
    const loadingToast = toast.loading("Enviando imagem...");
    try {
      setUploadError(null);
      const result = await uploadFile(file, {
        folder: imageUploadFolder || STORAGE_FOLDERS.PATIENTS,
      });
      const imageUrl = result.publicUrl || result.url;
      editor
        .chain()
        .focus()
        .setClinicalMedia({
          src: imageUrl,
          alt: file.name,
          width: "350px",
          align: "center",
          wrap: "none",
        })
        .run();
      toast.dismiss(loadingToast);
      // toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.dismiss(loadingToast);
      setUploadError(error.message || "Erro ao fazer upload da imagem");
      
      // Auto-dismiss the inline error after 5s
      setTimeout(() => setUploadError(null), 5000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // Reset input
    e.target.value = "";
    await uploadAndInsertImage(file);
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
    // Schema do documento compartilhado com o Durable Object de colaboração
    // (packages/evolution-editor-schema). As versões "schema-only" de nós que
    // no cliente precisam de NodeView React (ResizableImage/clinicalMedia,
    // TaskItem) e o StarterKit (cujo history precisa ser desativado em modo
    // colaborativo, já que o Yjs assume o undo/redo) são SUBSTITUÍDAS in-place
    // — nunca duplicadas — para não registrar plugins ProseMirror colidentes
    // (ex.: dois plugins de history com a mesma key).
    const documentExtensions = evolutionEditorExtensions.map((extension) => {
      if (extension.name === "clinicalMedia") {
        return ResizableImage.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: "rounded-lg max-w-full h-auto my-4 mx-auto block",
          },
        });
      }
      if (extension.name === "taskItem") {
        return CustomTaskItem.configure({
          nested: true,
          HTMLAttributes: { class: "notion-task-item" },
        });
      }
      if (extension.name === "starterKit" && collaborationId) {
        return StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          underline: false,
          codeBlock: false,
          history: false,
        });
      }
      return extension;
    });

    const base = [
      ForceListContinue,
      ...documentExtensions,
      Placeholder.configure({ placeholder }),
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
          CollaborationCaret.configure({
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
    // Em modo colaborativo o conteúdo vem exclusivamente do Y.Doc sincronizado
    // (semeado pelo servidor autoritativo a partir do `observacao` — Gate 1).
    // Inicializar o TipTap com `value` aqui semearia um fragmento compartilhado
    // vazio em paralelo, arriscando duplicar ou sobrescrever a nota clínica.
    content: collaborationId ? undefined : normalizeIncomingEditorHtml(value || ""),
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
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
      attributes: {
        class: "outline-none",
        role: "textbox",
        "aria-label": "Campo de observações clínicas",
        "aria-multiline": "true",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            uploadAndInsertImage(file);
          } else {
            toast.error("Apenas imagens podem ser arrastadas diretamente para o editor.");
          }
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          event.preventDefault();
          const file = event.clipboardData.files[0];
          if (file.type.startsWith("image/")) {
            uploadAndInsertImage(file);
          }
          return true;
        }
        return false;
      },
    },
    // `@tiptap/extension-collaboration-cursor` (v2.26.2) foi trocado por
    // `@tiptap/extension-collaboration-caret` (v3.23+), compatível com o
    // resto do TipTap (v3.23.x) — o mismatch que impedia montar o plugin de
    // cursor remoto (`ySyncPluginKey.getState` undefined dentro do
    // `yCursorPlugin`) não existe mais. Por isso o editor agora PODE recriar
    // quando o provider fica disponível: `hasProvider` entra nos deps e muda
    // exatamente uma vez por sessão de colaboração (de `false` para `true`),
    // então `CollaborationCaret` passa a fazer parte da lista de extensões e
    // o cursor remoto passa a aparecer. Recriar o editor aqui não duplica nem
    // reseta o documento: `ydoc` (acima) já existe desde o primeiro render e
    // é reaproveitado — só a instância do ProseMirror view é recriada, lendo
    // o estado atual do Y.Doc via `ySyncPlugin` de novo.
  }, [collaborationId, Boolean(provider)]);

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
    if (!editor || editor.isDestroyed || !editor.schema) return;

    const hasExplicitExternalUpdate =
      externalValueRevision !== undefined &&
      externalValueRevision !== lastExternalValueRevision.current;

    const isCollaborationLoaded = editor.extensionManager?.extensions?.some(
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
        src: result.publicUrl || result.url,
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

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return {};
      return {
        fontSize: String(e.getAttributes("textStyle").fontSize ?? ""),
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isStrike: e.isActive("strike"),
        isSubscript: e.isActive("subscript"),
        isSuperscript: e.isActive("superscript"),
        isLink: e.isActive("link"),
        isHeading2: e.isActive("heading", { level: 2 }),
        isHeading3: e.isActive("heading", { level: 3 }),
        isBulletList: e.isActive("bulletList"),
        isOrderedList: e.isActive("orderedList"),
        isTaskList: e.isActive("taskList"),
        isBlockquote: e.isActive("blockquote"),
        isHighlight: e.isActive("highlight"),
        isAlignLeft: e.isActive({ textAlign: "left" }),
        isAlignCenter: e.isActive({ textAlign: "center" }),
        isAlignRight: e.isActive({ textAlign: "right" }),
        isTable: e.isActive("table"),
      };
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "relative rich-text-editor rounded-lg border border-transparent",
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
      {uploadError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-300 text-red-700 px-3 py-1.5 rounded shadow-md text-sm flex items-center gap-2 max-w-[90%]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span className="truncate">{uploadError}</span>
        </div>
      )}
      {showToolbar && editor && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border border-slate-200 bg-slate-50/80 rounded-t-lg sticky top-0 z-10">
          <select
            title="Tamanho da fonte"
            aria-label="Tamanho da fonte"
            disabled={disabled}
            value={editorState.fontSize || ""}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const fontSize = e.target.value;
              const chain = editor.chain().focus();
              if (fontSize) {
                chain.setMark("textStyle", { fontSize }).run();
              } else {
                chain.unsetMark("textStyle").run();
              }
            }}
            className="mr-1 h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <option value="">Fonte</option>
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {[
            {
              icon: BoldIcon,
              action: () => editor.chain().focus().toggleBold().run(),
              active: editorState.isBold,
              label: "Negrito",
            },
            {
              icon: ItalicIcon,
              action: () => editor.chain().focus().toggleItalic().run(),
              active: editorState.isItalic,
              label: "Itálico",
            },
            {
              icon: UnderlineIcon,
              action: () => editor.chain().focus().toggleUnderline().run(),
              active: editorState.isUnderline,
              label: "Sublinhado",
            },
            {
              icon: Strikethrough,
              action: () => editor.chain().focus().toggleStrike().run(),
              active: editorState.isStrike,
              label: "Tachado",
            },
            {
              icon: SubscriptIcon,
              action: () => editor.chain().focus().toggleSubscript().run(),
              active: editorState.isSubscript,
              label: "Subscrito",
            },
            {
              icon: SuperscriptIcon,
              action: () => editor.chain().focus().toggleSuperscript().run(),
              active: editorState.isSuperscript,
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
              active: editorState.isLink,
              label: "Inserir Link",
            },
            { sep: true },
            {
              icon: Heading2,
              action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              active: editorState.isHeading2,
              label: "Título grande",
            },
            {
              icon: Heading3,
              action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
              active: editorState.isHeading3,
              label: "Subtítulo",
            },
            { sep: true },
            {
              icon: ListIcon,
              action: () => editor.chain().focus().toggleBulletList().run(),
              active: editorState.isBulletList,
              label: "Lista",
            },
            {
              icon: ListOrdered,
              action: () => editor.chain().focus().toggleOrderedList().run(),
              active: editorState.isOrderedList,
              label: "Lista numerada",
            },
            {
              icon: ListChecks,
              action: () => editor.chain().focus().toggleTaskList().run(),
              active: editorState.isTaskList,
              label: "Checklist",
            },
            { sep: true },
            {
              icon: Quote,
              action: () => editor.chain().focus().toggleBlockquote().run(),
              active: editorState.isBlockquote,
              label: "Citação",
            },
            {
              icon: Highlighter,
              action: () => editor.chain().focus().toggleHighlight().run(),
              active: editorState.isHighlight,
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
              active: editorState.isAlignLeft,
              label: "Alinhar à esquerda",
            },
            {
              icon: AlignCenter,
              action: () => editor.chain().focus().setTextAlign("center").run(),
              active: editorState.isAlignCenter,
              label: "Centralizar",
            },
            {
              icon: AlignRight,
              action: () => editor.chain().focus().setTextAlign("right").run(),
              active: editorState.isAlignRight,
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
              active: editorState.isTable,
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
});

RichTextEditor.displayName = "RichTextEditor";
