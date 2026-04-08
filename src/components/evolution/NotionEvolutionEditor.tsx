import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
// import { BubbleMenu } from '@tiptap/react';
// import { FloatingMenu } from '@tiptap/react/menus';
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import { PdfEmbed } from "./extensions/PdfEmbed"; // Nova extensão de visualização de PDF
import { set, get, del } from "idb-keyval";
import {
	Cloud,
	CheckCircle2,
	Loader2,
	FileText,
	Search,
} from "lucide-react";
import { toast } from "sonner";
import { Commands } from "./suggestion/commands";
import { Backlinks } from "./suggestion/backlinks";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
// Lazy load — react-filerobot-image-editor puxa styled-components + @scaleflex/ui (~350 KB).
// Carrega apenas quando o usuário abre a edição de imagem.
const LazyFilerobotImageEditor = React.lazy(() => import("react-filerobot-image-editor"));
import { BilingualSuggestionsModal } from "./suggestion/BilingualSuggestionsModal";

interface NotionEvolutionEditorProps {
	initialContent?: string;
	evolutionId?: string;
	patientId?: string;
	onSave?: (content: string) => void;
	isSaving?: boolean;
	soapData?: {
		subjective: string;
		objective: string;
		assessment: string;
		plan: string;
	};
	onAiAssist?: () => void;
}

export const NotionEvolutionEditor: React.FC<NotionEvolutionEditorProps> = ({
	initialContent = "",
	evolutionId = "new-evolution",
	patientId,
	onSave,
	isSaving = false,
	soapData,
	onAiAssist,
}) => {
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [isUploading, setIsUploading] = useState(false);
	const [editingImage, setEditingImage] = useState<File | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(false);

	const DRAFT_KEY = `evolution_draft_${evolutionId}`;

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				history: true,
				// Desativar extensões que carregamos manualmente para evitar aviso de duplicidade
				link: false,
			}),
			Image.configure({
				HTMLAttributes: {
					class:
						"rounded-lg border border-gray-200 shadow-md max-w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity",
				},
			}),
			PdfEmbed, // Habilitar visualização de PDFs nativa no editor
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
			Placeholder.configure({
				placeholder:
					"Digite '/' para comandos clínicos, '[[ ' para vincular sessões ou arraste um exame para cá...",
			}),
			Commands,
			Backlinks,
		],
		content: initialContent,
		editorProps: {
			attributes: {
				class:
					"prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px]",
			},
		},
		onUpdate: ({ editor }) => {
			const html = editor.getHTML();
			set(DRAFT_KEY, html).catch(console.error);
			setSyncStatus("saving");
			const timer = setTimeout(() => setSyncStatus("saved"), 1000);
			return () => clearTimeout(timer);
		},
	});

	// Listener para Assistente de IA via Slash Command
	useEffect(() => {
		const handleAiEvent = () => {
			if (onAiAssist) onAiAssist();
			else
				toast.info(
					"Assistente de IA ativado. Como posso ajudar com esta evolução?",
				);
		};
		window.addEventListener("tiptap-ai-assist", handleAiEvent);
		return () => window.removeEventListener("tiptap-ai-assist", handleAiEvent);
	}, [onAiAssist]);

	// Migração de SOAP para Tiptap Blocks
	useEffect(() => {
		if (editor && (!editor.getHTML() || editor?.getHTML() === "<p></p>")) {
			if (
				soapData &&
				(soapData.subjective ||
					soapData.objective ||
					soapData.assessment ||
					soapData.plan)
			) {
				const migratedContent = `
          <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Subjetivo</h2><p>${soapData.subjective || "<em>Sem registro</em>"}</p>
          <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Objetivo</h2><p>${soapData.objective || "<em>Sem registro</em>"}</p>
          <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Avaliação</h2><p>${soapData.assessment || "<em>Sem registro</em>"}</p>
          <h2 class="text-blue-600 dark:text-blue-400 border-b pb-1">Plano</h2><p>${soapData.plan || "<em>Sem registro</em>"}</p>
        `;
				editor.commands.setContent(migratedContent);
			}
		}
	}, [editor, soapData]);

	// Carregar draft do IndexedDB ao iniciar
	useEffect(() => {
		if (editor && !initialContent && !soapData) {
			get(DRAFT_KEY).then((draft) => {
				if (draft) {
					editor.commands.setContent(draft);
					toast.success("Draft recuperado automaticamente.");
				}
			});
		}
	}, [editor, initialContent, DRAFT_KEY, soapData]);

	const uploadToCloudflareR2 = useCallback(
		async (file: File) => {
			setIsUploading(true);
			const toastId = toast.loading(`Subindo exame: ${file.name}...`);

			try {
				const folder = patientId ? `patient-evolutions/${patientId}` : "patient-evolutions";
				const data = await uploadToR2(file, folder);

				if (data.url) {
					if (file.type.startsWith("image/")) {
						editor
							?.chain()
							.focus()
							.setImage({ src: data.url, alt: file.name })
							.run();
					} else if (file.type === "application/pdf") {
						// Usar a nova extensão PdfEmbed para renderização visual
						editor
							?.chain()
							.focus()
							.setPdf({ src: data.url, title: file.name })
							.run();
					} else {
						editor
							?.chain()
							.focus()
							.insertContent(
								`<p><a href="${data.url}" target="_blank" class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"><span class="text-xl">📎</span> <div><div class="font-bold text-sm text-slate-700 dark:text-slate-200">${file.name}</div><div class="text-[10px] text-slate-400">Clique para baixar o arquivo</div></div></a></p>`,
							)
							.run();
					}
					toast.success(`Exame ${file.name} anexado com sucesso!`, {
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
		[editor, evolutionId, patientId],
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
		
		return () => {
			window.removeEventListener("tiptap-upload", handleUploadEvent);
			window.removeEventListener("tiptap-sugestoes-open", handleSuggestionsOpen);
		};
	}, [uploadToCloudflareR2]);

	

	const handleSave = async () => {
		if (!editor) return;
		const html = editor.getHTML();

		// Indexação no D1 para busca ultrarrápida
		try {
			const workersApiUrl = getWorkersApiUrl();
			const authToken = await getNeonAccessToken();

			const tags = Array.from(html.matchAll(/#\w+/g)).map((m) => m[0]);
			const previewText = editor.getText().substring(0, 300);

			await fetch(`${workersApiUrl}/api/search/index`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: evolutionId,
					patient_id: patientId,
					appointment_id: evolutionId,
					tags: tags,
					preview_text: previewText,
				}),
			});
		} catch (e) {
			console.warn("D1 Indexing delay...", e);
		}

		if (onSave) onSave(html);
		await del(DRAFT_KEY);
		setSyncStatus("idle");
	};

	

	return (
		<div className="flex flex-col w-full max-w-5xl mx-auto bg-white dark:bg-slate-950 rounded-2xl shadow-premium-lg border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
			{/* Premium Header */}
			<div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 gap-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
						<FileText className="w-5 h-5 text-white" />
					</div>
					<div>
						<h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase italic">
							Evolução Clínica Profissional
						</h2>
						<div className="flex items-center gap-2">
							<span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
								<Cloud className="w-3 h-3" /> CLOUDFLARE EDGE
							</span>
							{syncStatus === "saving" && (
								<span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
									<Loader2 className="w-2.5 h-2.5 animate-spin" />{" "}
									SINCRONIZANDO...
								</span>
							)}
							{syncStatus === "saved" && (
								<span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
									<CheckCircle2 className="w-2.5 h-2.5" /> DRAFT SEGURO
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={() =>
							window.dispatchEvent(
								new CustomEvent("keydown", { key: "k", ctrlKey: true }),
							)
						}
						className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-500 transition-colors"
					>
						<Search className="w-3 h-3" /> BUSCAR (CMD+K)
					</button>
					<button
						onClick={handleSave}
						disabled={isSaving || isUploading}
						className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
					>
						{isSaving ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<CheckCircle2 className="w-4 h-4" />
						)}
						{isSaving ? "SALVANDO..." : "FINALIZAR"}
					</button>
				</div>
			</div>

			<div className="relative p-8">
				{/* editor && (
          <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="flex flex-col bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 min-w-[220px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 mb-1">
                Ações Rápidas
              </div>
              <button
                onClick={() => insertTemplate('<h3>Subjetivo</h3><p></p><h3>Objetivo</h3><p></p><h3>Avaliação</h3><p></p><h3>Plano</h3><p></p>')}
                className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-sm text-slate-700 dark:text-slate-200 transition-colors group"
              >
                <ClipboardList className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" /> 
                <span className="font-bold uppercase text-[11px] tracking-tight">Template SOAP</span>
              </button>
              <label className="flex items-center gap-3 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-sm text-slate-700 dark:text-slate-200 cursor-pointer transition-colors group">
                <Paperclip className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" /> 
                <span className="font-bold uppercase text-[11px] tracking-tight">Anexar Exame (PDF)</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" />
              </label>
              <label className="flex items-center gap-3 px-3 py-2 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-lg text-sm text-slate-700 dark:text-slate-200 cursor-pointer transition-colors group">
                <ImageIcon className="w-4 h-4 text-pink-500 group-hover:scale-110 transition-transform" /> 
                <span className="font-bold uppercase text-[11px] tracking-tight">Inserir Foto</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
              <button
                onClick={() => onAiAssist ? onAiAssist() : toast.info("IA Ativada")}
                className="flex items-center gap-3 px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg text-sm text-purple-600 dark:text-purple-400 transition-colors group"
              >
                <Sparkles className="w-4 h-4 text-purple-500 group-hover:rotate-12 transition-transform" /> 
                <span className="font-bold uppercase text-[11px] tracking-tight">Assistente IA</span>
              </button>
            </div>
          </FloatingMenu>
        ) */}

				{/* editor && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="flex bg-slate-900 dark:bg-slate-100 shadow-2xl rounded-full p-1.5 gap-1 border border-slate-800 dark:border-white">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("px-3 py-1 rounded-full text-xs font-black transition-all", editor.isActive('bold') ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white' : 'text-slate-400 hover:text-white dark:text-slate-500')}
              >
                B
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("px-3 py-1 rounded-full text-xs italic font-serif font-black transition-all", editor.isActive('italic') ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white' : 'text-slate-400 hover:text-white dark:text-slate-500')}
              >
                I
              </button>
              <div className="w-[1px] h-4 bg-slate-700 dark:bg-slate-300 self-center mx-1" />
              <button
                onClick={() => {
                  const url = window.prompt('URL do link:');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                className={cn("px-3 py-1 rounded-full text-xs transition-all", editor.isActive('link') ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white' : 'text-slate-400 hover:text-white dark:text-slate-500')}
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </BubbleMenu>
        ) */}

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

				<EditorContent editor={editor} />
			</div>

			{/* Modern Footer Shortcuts */}
			<div className="px-8 py-4 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-1.5 group">
						<kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-blue-400 transition-colors">
							{" "}
							/{" "}
						</kbd>
						<span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
							Comandos
						</span>
					</div>
					<div className="flex items-center gap-1.5 group">
						<kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black text-slate-500 shadow-sm group-hover:border-purple-400 transition-colors">
							{" "}
							[[{" "}
						</kbd>
						<span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
							Backlinks
						</span>
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
				</div>

				<p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 opacity-60">
					<span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
					SISTEMA OPERACIONAL • MOOCA FISIO V4.0
				</p>
			</div>

			<BilingualSuggestionsModal 
				open={showSuggestions}
				onOpenChange={setShowSuggestions}
				onSelect={(term) => {
					editor?.chain().focus().insertContent(term).run();
				}}
			/>

			{editingImage && (
				<Suspense fallback={
					<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
						<Loader2 className="w-10 h-10 text-white animate-spin" />
					</div>
				}>
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
											const newFile = new File(
												[blob],
												`${originalName}-editada.${extension}`,
												{ type: editedImageObject.mimeType || "image/png" }
											);
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
									fill: '#ef4444',
									stroke: '#ef4444',
								}}
								Text={{ text: 'Anotação...' }}
								tabsIds={['Annotate', 'Adjust', 'Filters', 'Finetune', 'Watermark']}
								defaultTabId="Annotate"
								defaultToolId="Pen"
								savingPixelRatio={2.5}
								previewPixelRatio={window.devicePixelRatio}
								translations={{
									name: 'Nome do Arquivo',
									save: 'Salvar na Evolução',
									saveAs: 'Salvar como',
									extension: 'Extensão',
									format: 'Formato',
									quality: 'Qualidade',
									resize: 'Redimensionar',
									crop: 'Cortar',
									adjust: 'Ajustar / Cortar',
									filters: 'Filtros',
									finetune: 'Refinar Cores',
									annotate: 'Anotar / Desenhar',
									watermark: 'Marca d\'água',
									pen: 'Caneta',
									arrow: 'Seta',
									line: 'Linha',
									rect: 'Retângulo',
									ellipse: 'Elipse',
									polygon: 'Polígono',
									text: 'Texto',
									image: 'Imagem',
									color: 'Cor',
									fill: 'Preenchimento',
									stroke: 'Contorno',
									brightness: 'Brilho',
									contrast: 'Contraste',
									saturation: 'Saturação',
									exposure: 'Exposição',
									temperature: 'Temperatura',
									undo: 'Desfazer',
									redo: 'Refazer',
									reset: 'Zerar Edições',
									cancel: 'Cancelar',
									original: 'Original',
									custom: 'Personalizado',
									square: 'Quadrado',
									landscape: 'Paisagem',
									portrait: 'Retrato'
								}}
							/>
						</div>
					</div>
				</Suspense>
			)}
		</div>
	);
};
