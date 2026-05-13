import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import Collaboration from "@tiptap/extension-collaboration";
import { Commands } from "../suggestion/commands";
import { Backlinks } from "../suggestion/backlinks";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { Cloud, CheckCircle2, Loader2, FileText, Sparkles, Search, Bold, Italic, Strikethrough, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { BilingualSuggestionsModal } from "../suggestion/BilingualSuggestionsModal";
import { AIScribeModal } from "../clinical-scribe/AIScribeModal";

const LazyFilerobotImageEditor = React.lazy(() => import("react-filerobot-image-editor"));

interface UnifiedEvolutionEditorProps {
  evolutionId?: string;
  patientId?: string;
  initialContent?: string;
  onSave?: (content: string) => void;
  isSaving?: boolean;
}

export const UnifiedEvolutionEditor: React.FC<UnifiedEvolutionEditorProps> = ({
  evolutionId = "new-evolution",
  patientId,
  initialContent = "",
  onSave,
  isSaving = false,
}) => {
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [ydoc] = useState(() => new Y.Doc());
  const [_provider, setProvider] = useState<IndexeddbPersistence | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<File | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showScribe, setShowScribe] = useState(false);

  useEffect(() => {
    const idbProvider = new IndexeddbPersistence(`evolution_${evolutionId}`, ydoc);
    
    idbProvider.on("synced", () => {
      setSyncStatus("saved");
    });

    setProvider(idbProvider);

    return () => {
      idbProvider.destroy();
    };
  }, [evolutionId, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        link: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg border border-gray-200 shadow-md max-w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline font-medium hover:text-blue-800",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded-md font-bold text-xs",
        },
      }),
      Commands,
      Backlinks,
      Placeholder.configure({
        placeholder: "Digite '/' para comandos clínicos, '[[ ' para vincular sessões ou arraste um exame para cá...",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px]",
      },
    },
    onUpdate: () => {
      setSyncStatus("saving");
      setTimeout(() => setSyncStatus("saved"), 1000);
    },
  });

  const uploadToCloudflareR2 = useCallback(
    async (file: File) => {
      setIsUploading(true);
      const toastId = toast.loading(`Subindo anexo: ${file.name}...`);

      try {
        const folder = patientId ? `patient-evolutions/${patientId}` : "patient-evolutions";
        const data = await uploadToR2(file, folder);

        if (data.url) {
          if (file.type.startsWith("image/")) {
            editor?.chain().focus().setImage({ src: data.url, alt: file.name }).run();
          } else {
            editor
              ?.chain()
              .focus()
              .insertContent(
                `<p><a href="${data.url}" target="_blank" class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"><span class="text-xl">📎</span> <div><div class="font-bold text-sm text-slate-700 dark:text-slate-200">${file.name}</div><div class="text-[10px] text-slate-400">Clique para baixar o arquivo</div></div></a></p>`,
              )
              .run();
          }
          toast.success(`Anexo ${file.name} enviado com sucesso!`, {
            id: toastId,
          });
        }
      } catch (error) {
        console.error("R2 Upload Error:", error);
        toast.error("Erro ao subir arquivo. Verifique sua conexão.", {
          id: toastId,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [editor, patientId],
  );

  useEffect(() => {
    const handleUploadEvent = (e: any) => {
      if (e.detail?.file) {
        const file = e.detail.file;
        if (file.type.startsWith("image/")) {
          setEditingImage(file);
        } else {
          uploadToCloudflareR2(file);
        }
      }
    };
    window.addEventListener("tiptap-upload", handleUploadEvent);

    const handleSuggestionsOpen = () => setShowSuggestions(true);
    window.addEventListener("tiptap-sugestoes-open", handleSuggestionsOpen);

    const handleScribeOpen = () => setShowScribe(true);
    window.addEventListener("tiptap-scribe-open", handleScribeOpen);

    return () => {
      window.removeEventListener("tiptap-upload", handleUploadEvent);
      window.removeEventListener("tiptap-sugestoes-open", handleSuggestionsOpen);
      window.removeEventListener("tiptap-scribe-open", handleScribeOpen);
    };
  }, [uploadToCloudflareR2]);

  const handleSave = () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (onSave) onSave(html);
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto bg-white dark:bg-slate-950 rounded-2xl shadow-premium-lg border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase italic flex items-center gap-2">
              FisioFlow Ultimate Editor
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-[8px] text-white rounded-md shadow-lg shadow-blue-500/20 not-italic">
                BLOCK-BASED
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                <Cloud className="w-3 h-3" /> OFFLINE SYNC
              </span>
              {syncStatus === "saving" && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> SINCRONIZANDO...
                </span>
              )}
              {syncStatus === "saved" && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5" /> YJS SEGURO
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowScribe(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-[10px] font-black text-blue-600 transition-colors border border-blue-100 dark:border-blue-800"
          >
            <Sparkles className="w-3 h-3" /> AI SCRIBE
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent("keydown", { key: "k", ctrlKey: true }))}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-500 transition-colors"
          >
            <Search className="w-3 h-3" /> BUSCAR (CMD+K)
          </button>
          <button 
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50" 
            onClick={handleSave} 
            disabled={isSaving || isUploading}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isSaving ? "SALVANDO..." : "FINALIZAR"}
          </button>
        </div>
      </div>

      <div className="relative px-6 sm:px-12 py-12 bg-white dark:bg-slate-950/80">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {isUploading && (
          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <Cloud className="w-5 h-5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                  Fazendo Upload para a Edge
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  Cloudflare R2 • Processamento em Borda
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="relative z-10">
          {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 shadow-xl border border-slate-800 dark:border-slate-700 rounded-lg p-1 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors", editor.isActive('bold') && "bg-slate-800 dark:bg-slate-700 text-white")}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors", editor.isActive('italic') && "bg-slate-800 dark:bg-slate-700 text-white")}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn("p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors", editor.isActive('strike') && "bg-slate-800 dark:bg-slate-700 text-white")}
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors", editor.isActive('bulletList') && "bg-slate-800 dark:bg-slate-700 text-white")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors", editor.isActive('orderedList') && "bg-slate-800 dark:bg-slate-700 text-white")}
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="px-8 py-4 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-blue-400 transition-colors"> / </kbd>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Comandos</span>
          </div>
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-purple-400 transition-colors"> [[ </kbd>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Backlinks</span>
          </div>
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-emerald-400 transition-colors">
              {" "}
              CMD+K{" "}
            </kbd>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              Busca Global
            </span>
          </div>
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-blue-400 transition-colors">
              {" "}
              ALT+S{" "}
            </kbd>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              AI Scribe
            </span>
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 opacity-60">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          SISTEMA OPERACIONAL • FISIOFLOW ULTIMATE
        </p>
      </div>

      <BilingualSuggestionsModal
        open={showSuggestions}
        onOpenChange={setShowSuggestions}
        onSelect={(term) => {
          editor?.chain().focus().insertContent(term).run();
        }}
      />

      <AIScribeModal
        open={showScribe}
        onOpenChange={setShowScribe}
        patientId={patientId}
        onApply={(soap) => {
          const content = `
            <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Subjetivo (AI Scribe)</h2><p>${soap.subjective}</p>
            <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Objetivo (AI Scribe)</h2><p>${soap.objective}</p>
            <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Avaliação (AI Scribe)</h2><p>${soap.assessment}</p>
            <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Plano (AI Scribe)</h2><p>${soap.plan}</p>
          `;
          editor?.chain().focus().insertContent(content).run();
        }}
      />

      {editingImage && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          }
        >
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-6">
            <div className="w-full h-full max-w-[1200px] max-h-[95vh] bg-slate-900 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-slate-800 relative flex flex-col">
              <LazyFilerobotImageEditor
                source={URL.createObjectURL(editingImage)}
                onSave={async (editedImageObject: any, _designState: any) => {
                  try {
                    setIsUploading(true);
                    setEditingImage(null);
                    if (editedImageObject.imageBase64) {
                      const res = await fetch(editedImageObject.imageBase64);
                      const blob = await res.blob();
                      const originalName = editingImage.name.replace(/\.[^/.]+$/, "");
                      const extension = editedImageObject.extension || "png";
                      const newFile = new File([blob], `${originalName}-editada.${extension}`, {
                        type: editedImageObject.mimeType || "image/png",
                      });
                      await uploadToCloudflareR2(newFile);
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error("Erro ao salvar imagem editada.");
                    setIsUploading(false);
                  }
                }}
                onClose={() => setEditingImage(null)}
                annotationsCommon={{
                  fill: "#ef4444",
                  stroke: "#ef4444",
                }}
                Text={{ text: "Anotação..." }}
                tabsIds={["Annotate", "Adjust", "Filters", "Finetune", "Watermark"]}
                defaultTabId="Annotate"
                defaultToolId="Pen"
                savingPixelRatio={2.5}
                previewPixelRatio={window.devicePixelRatio}
                translations={{
                  name: "Nome do Arquivo",
                  save: "Salvar na Evolução",
                  saveAs: "Salvar como",
                  extension: "Extensão",
                  format: "Formato",
                  quality: "Qualidade",
                  resize: "Redimensionar",
                  crop: "Cortar",
                  adjust: "Ajustar / Cortar",
                  filters: "Filtros",
                  finetune: "Refinar Cores",
                  annotate: "Anotar / Desenhar",
                  watermark: "Marca d'água",
                  pen: "Caneta",
                  arrow: "Seta",
                  line: "Linha",
                  rect: "Retângulo",
                  ellipse: "Elipse",
                  polygon: "Polígono",
                  text: "Texto",
                  image: "Imagem",
                  color: "Cor",
                  fill: "Preenchimento",
                  stroke: "Contorno",
                  brightness: "Brilho",
                  contrast: "Contraste",
                  saturation: "Saturação",
                  exposure: "Exposição",
                  temperature: "Temperatura",
                  undo: "Desfazer",
                  redo: "Refazer",
                  reset: "Zerar Edições",
                  cancel: "Cancelar",
                  original: "Original",
                  custom: "Personalizado",
                  square: "Quadrado",
                  landscape: "Paisagem",
                  portrait: "Retrato",
                }}
              />
            </div>
          </div>
        </Suspense>
      )}
    </div>
  );
};
