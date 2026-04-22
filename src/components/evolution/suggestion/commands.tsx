import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import tippy from "tippy.js";
import { Sparkles, ClipboardList, CheckSquare, ImageIcon, BookOpen } from "lucide-react";
import { Activity, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function getEvolutionSettings() {
  const STORAGE_KEY = 'fisioflow_evolution_settings';
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    return item ? { defaultView: 'notion', enableSuggestions: true, disabledCommands: [], commandOrder: [], ...JSON.parse(item) } : { defaultView: 'notion', enableSuggestions: true, disabledCommands: [], commandOrder: [] };
  } catch (error) {
    return { defaultView: 'notion', enableSuggestions: true, disabledCommands: [], commandOrder: [] };
  }
}

const COMMANDS_REGISTRY: Record<string, any> = {
	ai: {
		id: "ai",
		title: "Assistente IA",
		icon: Sparkles,
		description: "Gerar evolução usando IA",
		command: ({ editor, range }: any) => {
			editor.chain().focus().deleteRange(range).run();
			window.dispatchEvent(new CustomEvent("tiptap-ai-assist"));
		},
	},
	soap: {
		id: "soap",
		title: "Template SOAP",
		icon: ClipboardList,
		description: "Subjetivo, Objetivo, Avaliação, Plano",
		command: ({ editor, range }: any) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent(
					"<h3>Subjetivo</h3><p></p><h3>Objetivo</h3><p></p><h3>Avaliação</h3><p></p><h3>Plano</h3><p></p>",
				)
				.run();
		},
	},
	exercises: {
		id: "exercises",
		title: "Lista de Exercícios",
		icon: CheckSquare,
		description: "Checklist de exercícios realizados",
		command: ({ editor, range }: any) => {
			editor.chain().focus().deleteRange(range).toggleTaskList().run();
		},
	},
	image: {
		id: "image",
		title: "Imagem/Exame",
		icon: ImageIcon,
		description: "Upload para Cloudflare R2",
		command: ({ editor, range }: any) => {
			editor.chain().focus().deleteRange(range).run();
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/*,.pdf";
			input.onchange = (e: any) => {
				const file = e.target.files?.[0];
				if (file) {
					window.dispatchEvent(
						new CustomEvent("tiptap-upload", { detail: { file } }),
					);
				}
			};
			input.click();
		},
	},
	sugestoes: {
		id: "sugestoes",
		title: "Dicionário Clínico",
		icon: BookOpen,
		description: "Pesquisa bilíngue de diagnósticos, procedimentos, equipamentos",
		command: ({ editor, range }: any) => {
			editor.chain().focus().deleteRange(range).run();
			window.dispatchEvent(new CustomEvent("tiptap-sugestoes-open"));
		},
	},
	scribe: {
		id: "scribe",
		title: "AI Scribe (Ambiente)",
		icon: Sparkles,
		description: "Capturar áudio da sessão e gerar nota SOAP automaticamente",
		command: ({ editor, range }: any) => {
			editor.chain().focus().deleteRange(range).run();
			window.dispatchEvent(new CustomEvent("tiptap-scribe-open"));
		},
	},
	ortopedia: {
		id: "ortopedia",
		title: "Template Ortopedia",
		icon: Activity,
		description: "Anamnese, Red Flags, HDA e Exame Físico",
		command: ({ editor, range }: any) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent(`
					<h2 class="text-blue-600">Avaliação Ortopédica</h2>
					<h3>Queixa Principal & Red Flags</h3>
					<ul><li>[ ] Perda de peso?</li><li>[ ] Dor noturna?</li></ul>
					<h3>HDA</h3><p></p>
					<h3>Exame Físico</h3><p></p>
				`)
				.run();
		},
	},
	pilates: {
		id: "pilates",
		title: "Template Pilates",
		icon: Star,
		description: "Power House, Alinhamento e Progressão",
		command: ({ editor, range }: any) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertContent(`
					<h2 class="text-emerald-600">Evolução Pilates</h2>
					<h3>Power House</h3><p></p>
					<h3>Exercícios Realizados</h3><ul data-type="taskList"><li data-checked="false"></li></ul>
					<h3>Observações</h3><p></p>
				`)
				.run();
		},
	},
};

export const Commands = Extension.create({
	name: "clinicalCommands",

	addOptions() {
		return {
			suggestion: {
				char: "/",
				command: ({ editor, range, props }: any) => {
					props.command({ editor, range });
				},
			},
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				pluginKey: new PluginKey("clinicalCommands"),
				editor: this.editor,
				...this.options.suggestion,
				items: ({ query }: { query: string }) => {
					const settings = getEvolutionSettings();

					const availableCommands = Object.values(COMMANDS_REGISTRY).filter(
						(cmd: any) => !settings.disabledCommands?.includes(cmd.id)
					);

					// Sort by the defined order, or keep default
					if (settings.commandOrder && settings.commandOrder.length > 0) {
						availableCommands.sort((a: any, b: any) => {
							const idxA = settings.commandOrder.indexOf(a.id);
							const idxB = settings.commandOrder.indexOf(b.id);
							if (idxA !== -1 && idxB !== -1) return idxA - idxB;
							if (idxA !== -1) return -1;
							if (idxB !== -1) return 1;
							return 0;
						});
					}

					return availableCommands
						.filter((item: any) =>
							item.title.toLowerCase().includes(query.toLowerCase()) || 
							item.description.toLowerCase().includes(query.toLowerCase())
						);
				},
				render: () => {
					let component: any;
					let popup: any;

					return {
						onStart: (props: any) => {
							component = new ReactRenderer(CommandList, {
								props,
								editor: props.editor,
							});

							popup = tippy("body", {
								getReferenceClientRect: props.clientRect,
								appendTo: () => document.body,
								content: component.element,
								showOnCreate: true,
								interactive: true,
								trigger: "manual",
								placement: "bottom-start",
							});
						},
						onUpdate(props: any) {
							component.updateProps(props);

							if (popup) {
								popup[0].setProps({
									getReferenceClientRect: props.clientRect,
								});
							}
						},
						onKeyDown(props: any) {
							if (props.event.key === "Escape") {
								popup[0].hide();
								return true;
							}
							return component.ref?.onKeyDown(props);
						},
						onExit() {
							if (popup) {
								popup[0].destroy();
							}
							if (component) {
								component.destroy();
							}
						},
					};
				},
			}),
		];
	},
});

import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
} from "react";

const CommandList = forwardRef((props: any, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = (index: number) => {
		const item = props.items[index];
		if (item) {
			props.command(item);
		}
	};

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }: any) => {
			if (event.key === "ArrowUp") {
				setSelectedIndex(
					(selectedIndex + props.items.length - 1) % props.items.length,
				);
				return true;
			}
			if (event.key === "ArrowDown") {
				setSelectedIndex((selectedIndex + 1) % props.items.length);
				return true;
			}
			if (event.key === "Enter") {
				selectItem(selectedIndex);
				return true;
			}
			return false;
		},
	}));

	useEffect(() => setSelectedIndex(0), [props.items]);

	return (
		<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden min-w-[220px] py-1 animate-in fade-in zoom-in-95 duration-100">
			<div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 mb-1">
				Comandos Rápidos
			</div>
			{props.items.length ? (
				props.items.map((item: any, index: number) => {
					const Icon = item.icon;
					return (
						<button
							key={index}
							className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
								index === selectedIndex
									? "bg-blue-600 text-white"
									: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
							}`}
							onClick={() => selectItem(index)}
						>
							<div
								className={cn(
									"p-1.5 rounded-md",
									index === selectedIndex
										? "bg-white/20"
										: "bg-gray-100 dark:bg-gray-700",
								)}
							>
								<Icon
									className={cn(
										"w-4 h-4",
										index === selectedIndex ? "text-white" : "text-gray-500",
									)}
								/>
							</div>
							<div className="flex flex-col">
								<span className="text-sm font-medium">{item.title}</span>
								<span
									className={cn(
										"text-[10px]",
										index === selectedIndex ? "text-blue-100" : "text-gray-400",
									)}
								>
									{item.description}
								</span>
							</div>
						</button>
					);
				})
			) : (
				<div className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</div>
			)}
		</div>
	);
});


CommandList.displayName = "CommandList";
