/**
 * WikiEditor - Editor de páginas wiki
 * Editor por blocos estilo Notion com slash menu, drag-and-drop e preview.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Plus,
	Trash2,
	ImagePlus,
	Video,
	Play as YoutubeIcon,
	Globe,
	Heading1,
	Heading2,
	Heading3,
	ListChecks,
	Columns2,
	AlertCircle,
	ChevronDown,
	Database,
	Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/storage/upload";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { wikiService } from "@/lib/services/wikiService";
import type { WikiComment, WikiPage } from "@/types/wiki";
import { WikiEditorHeader } from "@/components/wiki/WikiEditorHeader";
import { WikiEditorMetaSidebar } from "@/components/wiki/WikiEditorMetaSidebar";
import { WikiEditorSlashBar } from "@/components/wiki/WikiEditorSlashBar";
import { WikiPageViewerContent } from "@/components/wiki/WikiPageViewerContent";
import { WikiEditorWorkspace } from "@/components/wiki/WikiEditorWorkspace";
import { WikiMediaBlockEditor } from "@/components/wiki/WikiMediaBlockEditor";
import { WikiDatabaseBlockEditor } from "@/components/wiki/WikiDatabaseBlockEditor";
import { WikiBlockRenderer } from "@/components/wiki/WikiBlockRenderer";
import { WikiHistoryDiff } from "@/components/wiki/WikiHistoryDiff";
import {
	buildSlug,
	createId,
	formatTimestamp,
	getSelectionWithinElement,
	sanitizeFileName,
	type BlockTextSelection,
} from "@/components/wiki/wikiEditorUtils";

const EVIDENCE_ROOT_SLUG = "trilhas-evidencia-fisioterapia";

const EVIDENCE_TRAIL_ORDER = [
	"trilha-lca-retorno-esporte",
	"trilha-artroplastia-joelho-quadril",
	"trilha-ombro-ortopedico-pos-operatorio",
	"trilha-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PROTOCOL_ORDER = [
	"protocolo-lca-retorno-esporte",
	"protocolo-artroplastia-joelho-quadril",
	"protocolo-ombro-ortopedico-pos-operatorio",
	"protocolo-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PAGE_ORDER = [
	EVIDENCE_ROOT_SLUG,
	...EVIDENCE_TRAIL_ORDER,
	...EVIDENCE_PROTOCOL_ORDER,
];

function isEvidencePage(page: Pick<WikiPage, "slug">): boolean {
	return EVIDENCE_PAGE_ORDER.includes(
		page.slug as (typeof EVIDENCE_PAGE_ORDER)[number],
	);
}

interface WikiEditorProps {
	page: WikiPage | null;
	draft?: WikiEditorDraft | null;
	onCancel: () => void;
	onSave: (
		data: Omit<WikiPage, "id" | "created_at" | "updated_at" | "version">,
	) => void;
}

interface WikiEditorDraft {
	title?: string;
	content?: string;
	html_content?: string;
	icon?: string;
	category?: string;
	tags?: string[];
	is_published?: boolean;
	template_id?: string;
	triage_order?: number;
}

type WikiBlockType =
	| "paragraph"
	| "heading1"
	| "heading2"
	| "heading3"
	| "callout"
	| "toggle"
	| "checklist"
	| "columns"
	| "image"
	| "video"
	| "youtube"
	| "embed"
	| "database";

type CalloutTone = "info" | "warning" | "success" | "error";
type DatabaseColumnType = "text" | "number" | "date";

interface WikiChecklistItem {
	id: string;
	text: string;
	checked: boolean;
}

interface WikiDatabaseColumn {
	id: string;
	name: string;
	type: DatabaseColumnType;
}

interface WikiDatabaseRow {
	id: string;
	values: Record<string, string>;
}

interface WikiDatabaseConfig {
	title: string;
	columns: WikiDatabaseColumn[];
	rows: WikiDatabaseRow[];
	filter: string;
	sortColumnId: string;
	sortDirection: "asc" | "desc";
}

interface WikiBlock {
	id: string;
	type: WikiBlockType;
	text?: string;
	tone?: CalloutTone;
	title?: string;
	body?: string;
	open?: boolean;
	items?: WikiChecklistItem[];
	left?: string;
	right?: string;
	url?: string;
	database?: WikiDatabaseConfig;
}

interface SlashCommand {
	id: WikiBlockType;
	label: string;
	description: string;
	keywords: string[];
	icon: React.ComponentType<{ className?: string }>;
}

interface SerializedWikiBlocksDocument {
	version: 1;
	blocks: WikiBlock[];
}

const WIKI_BLOCK_DOC_PREFIX = "wiki-blocks:v1:";
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 250 * 1024 * 1024;

const SLASH_COMMANDS: SlashCommand[] = [
	{
		id: "paragraph",
		label: "Parágrafo",
		description: "Texto livre em markdown",
		keywords: ["texto", "p", "paragraph", "body"],
		icon: Type,
	},
	{
		id: "heading1",
		label: "Título H1",
		description: "Título principal da seção",
		keywords: ["h1", "titulo", "heading"],
		icon: Heading1,
	},
	{
		id: "heading2",
		label: "Título H2",
		description: "Subtítulo de seção",
		keywords: ["h2", "subtitulo", "heading"],
		icon: Heading2,
	},
	{
		id: "heading3",
		label: "Título H3",
		description: "Subdivisão menor",
		keywords: ["h3", "subtitulo", "heading"],
		icon: Heading3,
	},
	{
		id: "callout",
		label: "Callout",
		description: "Bloco de destaque com cor/alerta",
		keywords: ["destaque", "alerta", "nota", "callout"],
		icon: AlertCircle,
	},
	{
		id: "toggle",
		label: "Toggle",
		description: "Bloco expansível/retrátil",
		keywords: ["detalhes", "collapse", "toggle"],
		icon: ChevronDown,
	},
	{
		id: "checklist",
		label: "Checklist",
		description: "Lista de tarefas com checkboxes",
		keywords: ["tarefas", "check", "todo", "lista"],
		icon: ListChecks,
	},
	{
		id: "columns",
		label: "Colunas",
		description: "Layout em duas colunas",
		keywords: ["duas colunas", "layout", "columns"],
		icon: Columns2,
	},
	{
		id: "image",
		label: "Imagem",
		description: "Imagem por URL ou upload",
		keywords: ["foto", "media", "imagem", "image"],
		icon: ImagePlus,
	},
	{
		id: "video",
		label: "Vídeo",
		description: "Vídeo por URL ou upload",
		keywords: ["video", "media", "mp4"],
		icon: Video,
	},
	{
		id: "youtube",
		label: "YouTube",
		description: "Embed de YouTube",
		keywords: ["yt", "youtube", "embed"],
		icon: YoutubeIcon,
	},
	{
		id: "embed",
		label: "Embed Externo",
		description: "Iframe de URL externa",
		keywords: ["iframe", "embed", "externo"],
		icon: Globe,
	},
	{
		id: "database",
		label: "Banco de Dados",
		description: "Tabela embutida com filtro/sort",
		keywords: ["table", "db", "database", "tabela"],
		icon: Database,
	},
];

function createDefaultDatabaseConfig(): WikiDatabaseConfig {
	const nameColumnId = createId();
	const statusColumnId = createId();

	return {
		title: "Tabela sem título",
		columns: [
			{ id: nameColumnId, name: "Nome", type: "text" },
			{ id: statusColumnId, name: "Status", type: "text" },
		],
		rows: [
			{
				id: createId(),
				values: {
					[nameColumnId]: "Exemplo",
					[statusColumnId]: "Ativo",
				},
			},
		],
		filter: "",
		sortColumnId: nameColumnId,
		sortDirection: "asc",
	};
}

function createBlock(type: WikiBlockType): WikiBlock {
	switch (type) {
		case "paragraph":
			return { id: createId(), type, text: "" };
		case "heading1":
		case "heading2":
		case "heading3":
			return { id: createId(), type, text: "" };
		case "callout":
			return { id: createId(), type, tone: "info", text: "" };
		case "toggle":
			return { id: createId(), type, title: "Detalhes", body: "", open: false };
		case "checklist":
			return {
				id: createId(),
				type,
				items: [{ id: createId(), text: "Nova tarefa", checked: false }],
			};
		case "columns":
			return { id: createId(), type, left: "", right: "" };
		case "image":
		case "video":
		case "youtube":
		case "embed":
			return { id: createId(), type, url: "" };
		case "database":
			return { id: createId(), type, database: createDefaultDatabaseConfig() };
		default:
			return { id: createId(), type: "paragraph", text: "" };
	}
}

function normalizeBlock(rawBlock: Partial<WikiBlock>): WikiBlock {
	const blockType = rawBlock.type ?? "paragraph";
	const block = createBlock(blockType);

	return {
		...block,
		...rawBlock,
		id: rawBlock.id ?? block.id,
		type: blockType,
	};
}

function serializeBlocksDocument(blocks: WikiBlock[]): string {
	const safeBlocks = blocks.map((block) => normalizeBlock(block));
	const doc: SerializedWikiBlocksDocument = {
		version: 1,
		blocks: safeBlocks,
	};
	return `${WIKI_BLOCK_DOC_PREFIX}${JSON.stringify(doc)}`;
}

function deserializeBlocksDocument(htmlContent?: string): WikiBlock[] | null {
	if (!htmlContent || !htmlContent.startsWith(WIKI_BLOCK_DOC_PREFIX))
		return null;

	try {
		const payload = htmlContent.slice(WIKI_BLOCK_DOC_PREFIX.length);
		const parsed = JSON.parse(payload) as SerializedWikiBlocksDocument;
		if (!parsed || !Array.isArray(parsed.blocks)) return null;

		return parsed.blocks.map((block) => normalizeBlock(block));
	} catch {
		return null;
	}
}

function parseLegacyMarkdownToBlocks(content: string): WikiBlock[] {
	const trimmed = content.trim();
	if (!trimmed) {
		return [createBlock("paragraph")];
	}

	const chunks = trimmed
		.split(/\n{2,}/)
		.map((chunk) => chunk.trim())
		.filter(Boolean);
	const blocks: WikiBlock[] = [];

	chunks.forEach((chunk) => {
		const mediaCommand = chunk.match(/^\/(image|video|youtube|embed)\s+(.+)$/i);
		if (mediaCommand) {
			const type = mediaCommand[1].toLowerCase() as WikiBlockType;
			blocks.push(
				normalizeBlock({ id: createId(), type, url: mediaCommand[2].trim() }),
			);
			return;
		}

		if (/^#\s+/.test(chunk)) {
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "heading1",
					text: chunk.replace(/^#\s+/, ""),
				}),
			);
			return;
		}

		if (/^##\s+/.test(chunk)) {
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "heading2",
					text: chunk.replace(/^##\s+/, ""),
				}),
			);
			return;
		}

		if (/^###\s+/.test(chunk)) {
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "heading3",
					text: chunk.replace(/^###\s+/, ""),
				}),
			);
			return;
		}

		const calloutMatch = chunk.match(
			/^>\s*\[!(INFO|WARNING|SUCCESS|ERROR)\]\s*([\s\S]*)$/i,
		);
		if (calloutMatch) {
			const tone = calloutMatch[1].toLowerCase() as CalloutTone;
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "callout",
					tone,
					text: calloutMatch[2].trim(),
				}),
			);
			return;
		}

		const toggleMatch = chunk.match(
			/^<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>$/i,
		);
		if (toggleMatch) {
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "toggle",
					title: toggleMatch[1].trim(),
					body: toggleMatch[2].trim(),
				}),
			);
			return;
		}

		const checklistLines = chunk
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		if (
			checklistLines.length > 0 &&
			checklistLines.every((line) => /^-\s\[(x| )\]\s+/i.test(line))
		) {
			blocks.push(
				normalizeBlock({
					id: createId(),
					type: "checklist",
					items: checklistLines.map((line) => ({
						id: createId(),
						checked: /^-\s\[x\]/i.test(line),
						text: line.replace(/^-\s\[(x| )\]\s+/i, "").trim(),
					})),
				}),
			);
			return;
		}

		const databaseMatch = chunk.match(/^```wiki-database\s*([\s\S]*?)```$/i);
		if (databaseMatch) {
			try {
				const parsed = JSON.parse(
					databaseMatch[1].trim(),
				) as WikiDatabaseConfig;
				blocks.push(
					normalizeBlock({
						id: createId(),
						type: "database",
						database: {
							...createDefaultDatabaseConfig(),
							...parsed,
						},
					}),
				);
				return;
			} catch {
				// fallback para parágrafo
			}
		}

		blocks.push(
			normalizeBlock({ id: createId(), type: "paragraph", text: chunk }),
		);
	});

	return blocks.length > 0 ? blocks : [createBlock("paragraph")];
}

function buildBlocksFromSource(
	source: { content?: string; html_content?: string } | null,
): WikiBlock[] {
	if (!source) {
		return [createBlock("paragraph")];
	}

	const parsedDocument = deserializeBlocksDocument(source.html_content);
	if (parsedDocument && parsedDocument.length > 0) {
		return parsedDocument;
	}

	return parseLegacyMarkdownToBlocks(source.content || "");
}

function buildBlocksFromPage(page: WikiPage | null): WikiBlock[] {
	return buildBlocksFromSource(page);
}

function databaseToMarkdown(database: WikiDatabaseConfig): string {
	const columns = database.columns;
	if (columns.length === 0) return "";

	const header = `| ${columns.map((column) => column.name).join(" | ")} |`;
	const separator = `| ${columns.map(() => "---").join(" | ")} |`;

	const rows = database.rows.map((row) => {
		const values = columns.map((column) => row.values[column.id] ?? "");
		return `| ${values.join(" | ")} |`;
	});

	return [header, separator, ...rows].join("\n");
}

function blocksToMarkdown(blocks: WikiBlock[]): string {
	const chunks = blocks.map((block) => {
		switch (block.type) {
			case "paragraph":
				return block.text?.trim() || "";
			case "heading1":
				return `# ${block.text?.trim() || ""}`;
			case "heading2":
				return `## ${block.text?.trim() || ""}`;
			case "heading3":
				return `### ${block.text?.trim() || ""}`;
			case "callout": {
				const tone = (block.tone || "info").toUpperCase();
				return `> [!${tone}] ${block.text?.trim() || ""}`;
			}
			case "toggle":
				return `<details>\n<summary>${block.title?.trim() || "Detalhes"}</summary>\n\n${block.body?.trim() || ""}\n\n</details>`;
			case "checklist":
				return (block.items || [])
					.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`)
					.join("\n");
			case "columns":
				return `/columns\n::left\n${block.left?.trim() || ""}\n::right\n${block.right?.trim() || ""}\n/endcolumns`;
			case "image":
				return block.url ? `/image ${block.url}` : "/image";
			case "video":
				return block.url ? `/video ${block.url}` : "/video";
			case "youtube":
				return block.url ? `/youtube ${block.url}` : "/youtube";
			case "embed":
				return block.url ? `/embed ${block.url}` : "/embed";
			case "database": {
				const database = block.database ?? createDefaultDatabaseConfig();
				const markdownTable = databaseToMarkdown(database);
				const serialized = JSON.stringify(database);
				return `### ${database.title || "Banco de dados"}\n\n${markdownTable}\n\n\`\`\`wiki-database\n${serialized}\n\`\`\``;
			}
			default:
				return "";
		}
	});

	return chunks.filter(Boolean).join("\n\n").trim();
}

function getBlockLabel(type: WikiBlockType): string {
	switch (type) {
		case "paragraph":
			return "Parágrafo";
		case "heading1":
			return "Título H1";
		case "heading2":
			return "Título H2";
		case "heading3":
			return "Título H3";
		case "callout":
			return "Callout";
		case "toggle":
			return "Toggle";
		case "checklist":
			return "Checklist";
		case "columns":
			return "Colunas";
		case "image":
			return "Imagem";
		case "video":
			return "Vídeo";
		case "youtube":
			return "YouTube";
		case "embed":
			return "Embed";
		case "database":
			return "Banco de Dados";
		default:
			return "Bloco";
	}
}

function getBlockExcerpt(block: WikiBlock): string {
	switch (block.type) {
		case "paragraph":
		case "heading1":
		case "heading2":
		case "heading3":
		case "callout":
			return (block.text || "").slice(0, 180).trim();
		case "toggle":
			return `${block.title || "Toggle"} ${(block.body || "").slice(0, 120)}`.trim();
		case "checklist":
			return (block.items || [])
				.map((item) => item.text)
				.join(" • ")
				.slice(0, 180)
				.trim();
		case "columns":
			return `${block.left || ""} ${block.right || ""}`.slice(0, 180).trim();
		case "image":
		case "video":
		case "youtube":
		case "embed":
			return block.url || `${getBlockLabel(block.type)} sem URL`;
		case "database":
			return block.database?.title || "Banco de dados";
		default:
			return "";
	}
}
function insertBlockAfter(
	blocks: WikiBlock[],
	newBlock: WikiBlock,
	afterBlockId: string | null,
): WikiBlock[] {
	if (!afterBlockId) {
		return [...blocks, newBlock];
	}

	const index = blocks.findIndex((block) => block.id === afterBlockId);
	if (index === -1) {
		return [...blocks, newBlock];
	}

	return [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
}

function reorderBlocks(
	blocks: WikiBlock[],
	fromBlockId: string,
	toBlockId: string,
): WikiBlock[] {
	if (fromBlockId === toBlockId) {
		return blocks;
	}

	const fromIndex = blocks.findIndex((block) => block.id === fromBlockId);
	const toIndex = blocks.findIndex((block) => block.id === toBlockId);

	if (fromIndex < 0 || toIndex < 0) {
		return blocks;
	}

	const reordered = [...blocks];
	const [moved] = reordered.splice(fromIndex, 1);
	reordered.splice(toIndex, 0, moved);

	return reordered;
}

interface BlockEditorFieldsProps {
	block: WikiBlock;
	isUploading: boolean;
	onUpdate: (blockId: string, updates: Partial<WikiBlock>) => void;
	onRequestUpload: (blockId: string, mediaType: "image" | "video") => void;
}

function BlockEditorFields({
	block,
	isUploading,
	onUpdate,
	onRequestUpload,
}: BlockEditorFieldsProps) {
	switch (block.type) {
		case "paragraph":
			return (
				<Textarea
					value={block.text || ""}
					onChange={(event) => onUpdate(block.id, { text: event.target.value })}
					placeholder="Escreva um parágrafo em markdown..."
					className="min-h-[100px]"
				/>
			);

		case "heading1":
		case "heading2":
		case "heading3":
			return (
				<Input
					value={block.text || ""}
					onChange={(event) => onUpdate(block.id, { text: event.target.value })}
					placeholder={`Texto do ${getBlockLabel(block.type)}`}
				/>
			);

		case "callout":
			return (
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<Label className="text-xs text-muted-foreground">Tipo</Label>
						<select
							className="h-8 rounded-md border bg-background px-2 text-sm"
							value={block.tone || "info"}
							onChange={(event) =>
								onUpdate(block.id, { tone: event.target.value as CalloutTone })
							}
						>
							<option value="info">Informação</option>
							<option value="warning">Atenção</option>
							<option value="success">Sucesso</option>
							<option value="error">Erro</option>
						</select>
					</div>
					<Textarea
						value={block.text || ""}
						onChange={(event) =>
							onUpdate(block.id, { text: event.target.value })
						}
						placeholder="Conteúdo do callout..."
						className="min-h-[100px]"
					/>
				</div>
			);

		case "toggle":
			return (
				<div className="space-y-2">
					<Input
						value={block.title || ""}
						onChange={(event) =>
							onUpdate(block.id, { title: event.target.value })
						}
						placeholder="Título do toggle"
					/>
					<Textarea
						value={block.body || ""}
						onChange={(event) =>
							onUpdate(block.id, { body: event.target.value })
						}
						placeholder="Conteúdo interno do toggle..."
						className="min-h-[100px]"
					/>
				</div>
			);

		case "checklist": {
			const items = block.items || [];
			return (
				<div className="space-y-2">
					{items.map((item) => (
						<div key={item.id} className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={item.checked}
								onChange={(event) => {
									const nextItems = items.map((currentItem) =>
										currentItem.id === item.id
											? { ...currentItem, checked: event.target.checked }
											: currentItem,
									);
									onUpdate(block.id, { items: nextItems });
								}}
								className="h-4 w-4"
							/>
							<Input
								value={item.text}
								onChange={(event) => {
									const nextItems = items.map((currentItem) =>
										currentItem.id === item.id
											? { ...currentItem, text: event.target.value }
											: currentItem,
									);
									onUpdate(block.id, { items: nextItems });
								}}
								placeholder="Texto da tarefa"
							/>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									const nextItems = items.filter(
										(currentItem) => currentItem.id !== item.id,
									);
									onUpdate(block.id, { items: nextItems });
								}}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}

					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							const nextItems = [
								...items,
								{ id: createId(), text: "", checked: false },
							];
							onUpdate(block.id, { items: nextItems });
						}}
					>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar item
					</Button>
				</div>
			);
		}

		case "columns":
			return (
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					<Textarea
						value={block.left || ""}
						onChange={(event) =>
							onUpdate(block.id, { left: event.target.value })
						}
						placeholder="Coluna esquerda..."
						className="min-h-[120px]"
					/>
					<Textarea
						value={block.right || ""}
						onChange={(event) =>
							onUpdate(block.id, { right: event.target.value })
						}
						placeholder="Coluna direita..."
						className="min-h-[120px]"
					/>
				</div>
			);

		case "image":
		case "video":
		case "youtube":
		case "embed":
			return (
				<WikiMediaBlockEditor
					block={block}
					isUploading={isUploading}
					onUpdate={onUpdate}
					onRequestUpload={onRequestUpload}
				/>
			);

		case "database": {
			const database = block.database || createDefaultDatabaseConfig();

			const updateDatabase = (nextDatabase: WikiDatabaseConfig) => {
				onUpdate(block.id, { database: nextDatabase });
			};

			return (
				<WikiDatabaseBlockEditor
					database={database}
					onChange={updateDatabase}
				/>
			);
		}

		default:
			return (
				<Textarea
					value={block.text || ""}
					onChange={(event) => onUpdate(block.id, { text: event.target.value })}
					placeholder="Conteúdo do bloco"
				/>
			);
	}
}

export function WikiEditor({ page, draft, onCancel, onSave }: WikiEditorProps) {
	const { user, organizationId } = useAuth();
	const source = page ?? draft ?? null;

	// Auto-Save Local
	useEffect(() => {
		const draftKey = `wiki_draft_${page?.id || "new"}`;
		const timeout = setTimeout(() => {
			if (blocks.length > 0 || title) {
				localStorage.setItem(
					draftKey,
					JSON.stringify({
						title,
						blocks,
						timestamp: Date.now(),
					}),
				);
			}
		}, 5000);
		return () => clearTimeout(timeout);
	}, [blocks, title, page?.id]);

	const recoverLocalDraft = () => {
		const draftKey = `wiki_draft_${page?.id || "new"}`;
		const saved = localStorage.getItem(draftKey);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setTitle(parsed.title);
				setBlocks(parsed.blocks);
				toast.info("Rascunho recuperado com sucesso!");
			} catch  {
				toast.error("Erro ao carregar rascunho salvo.");
			}
		} else {
			toast.info("Nenhum rascunho encontrado para esta página.");
		}
	};

	
	const [title, setTitle] = useState(source?.title || "");
	const [icon, setIcon] = useState(source?.icon || "");
	const [category, setCategory] = useState(source?.category || "");
	const [tags, setTags] = useState(source?.tags?.join(", ") || "");
	const [isPublished, setIsPublished] = useState(source?.is_published ?? true);
	const [showPreview, setShowPreview] = useState(false);
	const [blocks, setBlocks] = useState<WikiBlock[]>(() =>
		buildBlocksFromSource(source),
	);
	const [slashInput, setSlashInput] = useState("");
	const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(
		null,
	);
	const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
	const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
	const [pendingUpload, setPendingUpload] = useState<{
		blockId: string;
		mediaType: "image" | "video";
	} | null>(null);

	const slashInputRef = useRef<HTMLInputElement | null>(null);
	const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
	const videoUploadInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const nextSource = page ?? draft ?? null;
		setTitle(nextSource?.title || "");
		setIcon(nextSource?.icon || "");
		setCategory(nextSource?.category || "");
		setTags(nextSource?.tags?.join(", ") || "");
		setIsPublished(nextSource?.is_published ?? true);
		setBlocks(buildBlocksFromSource(nextSource));
		setSlashInput("");
		setInsertAfterBlockId(null);
		setDraggingBlockId(null);
	}, [page, draft]);

	const slashSearchTerm = slashInput.trim().startsWith("/")
		? slashInput.trim().slice(1).toLowerCase()
		: "";

	const filteredCommands = useMemo(() => {
		if (!slashSearchTerm) return SLASH_COMMANDS;

		return SLASH_COMMANDS.filter((command) => {
			const haystack =
				`${command.label} ${command.description} ${command.keywords.join(" ")}`.toLowerCase();
			return haystack.includes(slashSearchTerm);
		});
	}, [slashSearchTerm]);

	const updateBlock = (blockId: string, updates: Partial<WikiBlock>) => {
		setBlocks((previousBlocks) =>
			previousBlocks.map((block) =>
				block.id === blockId ? normalizeBlock({ ...block, ...updates }) : block,
			),
		);
	};

	const insertBlockFromCommand = (command: SlashCommand) => {
		const nextBlock = createBlock(command.id);
		setBlocks((previousBlocks) =>
			insertBlockAfter(previousBlocks, nextBlock, insertAfterBlockId),
		);
		setInsertAfterBlockId(nextBlock.id);
		setSlashInput("");

		requestAnimationFrame(() => {
			slashInputRef.current?.focus();
		});
	};

	const duplicateBlock = (blockId: string) => {
		setBlocks((previousBlocks) => {
			const blockToDuplicate = previousBlocks.find(
				(block) => block.id === blockId,
			);
			if (!blockToDuplicate) return previousBlocks;

			const duplicatedBlock: WikiBlock = normalizeBlock({
				...blockToDuplicate,
				id: createId(),
				items: blockToDuplicate.items?.map((item) => ({
					...item,
					id: createId(),
				})),
				database: blockToDuplicate.database
					? {
							...blockToDuplicate.database,
							rows: blockToDuplicate.database.rows.map((row) => ({
								id: createId(),
								values: { ...row.values },
							})),
						}
					: undefined,
			});

			return insertBlockAfter(previousBlocks, duplicatedBlock, blockId);
		});
	};

	const removeBlock = (blockId: string) => {
		setBlocks((previousBlocks) => {
			if (previousBlocks.length <= 1) {
				toast.error("A página precisa de pelo menos um bloco.");
				return previousBlocks;
			}
			return previousBlocks.filter((block) => block.id !== blockId);
		});

		if (insertAfterBlockId === blockId) {
			setInsertAfterBlockId(null);
		}
	};

	const requestUpload = (blockId: string, mediaType: "image" | "video") => {
		setPendingUpload({ blockId, mediaType });
		if (mediaType === "image") {
			imageUploadInputRef.current?.click();
			return;
		}
		videoUploadInputRef.current?.click();
	};

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
		mediaType: "image" | "video",
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file || !pendingUpload || pendingUpload.mediaType !== mediaType) {
			return;
		}

		const { blockId } = pendingUpload;
		const block = blocks.find((currentBlock) => currentBlock.id === blockId);
		if (!block) {
			setPendingUpload(null);
			return;
		}

		if (mediaType === "image" && !file.type.startsWith("image/")) {
			toast.error("Selecione um arquivo de imagem válido.");
			setPendingUpload(null);
			return;
		}

		if (mediaType === "video" && !file.type.startsWith("video/")) {
			toast.error("Selecione um arquivo de vídeo válido.");
			setPendingUpload(null);
			return;
		}

		if (mediaType === "image" && file.size > MAX_IMAGE_UPLOAD_BYTES) {
			toast.error("Imagem muito grande. Limite de 15MB.");
			setPendingUpload(null);
			return;
		}

		if (mediaType === "video" && file.size > MAX_VIDEO_UPLOAD_BYTES) {
			toast.error("Vídeo muito grande. Limite de 250MB.");
			setPendingUpload(null);
			return;
		}

		setUploadingBlockId(blockId);

		try {
			const organizationId = user?.organizationId ?? "global";
			const userId = user?.id ?? "anon";
			const pageSlug = buildSlug(title) || "nova-pagina";
			const folder = mediaType === "image" ? "images" : "videos";
			const path = `wiki/${organizationId}/${userId}/${pageSlug}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
			const uploadedFile = await uploadFile(file, {
				folder: path.split("/").slice(0, -1).join("/"),
			});
			const uploadedUrl = uploadedFile.url;

			updateBlock(blockId, { url: uploadedUrl });
			toast.success(
				`${mediaType === "image" ? "Imagem" : "Vídeo"} enviado com sucesso.`,
			);
		} catch  {
			toast.error("Não foi possível enviar o arquivo.");
		} finally {
			setPendingUpload(null);
			setUploadingBlockId(null);
		}
	};

	const handleSave = () => {
		if (!title.trim()) {
			toast.error("Título é obrigatório");
			return;
		}

		const slug = buildSlug(title);
		const markdownContent = blocksToMarkdown(blocks);
		const htmlContent = serializeBlocksDocument(blocks);

		const isE2E =
			typeof window !== "undefined" &&
			window.location.search.includes("e2e=true");
		if (isE2E) {
			console.info(
				"[E2E][WikiEditor][handleSave]",
				JSON.stringify({
					title,
					slug,
					template_id: page?.template_id ?? draft?.template_id,
					tags: tags
						? tags
								.split(",")
								.map((tag) => tag.trim())
								.filter(Boolean)
						: [],
					category: category || null,
					is_published: isPublished,
					blocks_count: blocks.length,
					organization_id: organizationId,
					user_id: user?.uid,
				}),
			);
		}

		onSave({
			slug,
			title,
			template_id: page?.template_id ?? draft?.template_id,
			triage_order: page?.triage_order ?? draft?.triage_order,
			content: markdownContent,
			html_content: htmlContent,
			icon: icon || undefined,
			category: category || undefined,
			tags: tags
				? tags
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean)
				: [],
			is_published: isPublished,
			organization_id: organizationId || "org-1",
			created_by: user?.uid || "user-1",
			updated_by: user?.uid || "user-1",
			parent_id: undefined,
			view_count: page?.view_count ?? 0,
			attachments: page?.attachments ?? [],
			cover_image: page?.cover_image,
		});
	};

	return (
		<div className="flex h-full flex-col">
			<WikiEditorHeader
				title={title}
				icon={icon}
				showPreview={showPreview}
				onTitleChange={setTitle}
				onIconChange={setIcon}
				onTogglePreview={() => setShowPreview((previous) => !previous)}
				onRecoverDraft={recoverLocalDraft}
				onCancel={onCancel}
				onSave={handleSave}
			/>

			<div className="flex min-h-0 flex-1">
				<WikiEditorWorkspace
					showPreview={showPreview}
					commandBar={
						<WikiEditorSlashBar
							slashInput={slashInput}
							slashInputRef={slashInputRef}
							filteredCommands={filteredCommands}
							insertAfterBlockId={insertAfterBlockId}
							onSlashInputChange={setSlashInput}
							onSlashEnter={() => {
								const firstCommand = filteredCommands[0];
								if (firstCommand) {
									insertBlockFromCommand(firstCommand);
								}
							}}
							onInsertParagraph={() => insertBlockFromCommand(SLASH_COMMANDS[0])}
							onSelectCommand={(commandId) => {
								const command = filteredCommands.find(
									(currentCommand) => currentCommand.id === commandId,
								);
								if (command) {
									insertBlockFromCommand(command);
								}
							}}
						/>
					}
					blocks={blocks}
					draggingBlockId={draggingBlockId}
					uploadInputs={
						<>
							<input
								ref={imageUploadInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(event) => handleFileUpload(event, "image")}
							/>
							<input
								ref={videoUploadInputRef}
								type="file"
								accept="video/*"
								className="hidden"
								onChange={(event) => handleFileUpload(event, "video")}
							/>
						</>
					}
					getBlockLabel={getBlockLabel}
					onDropBlock={(targetBlockId) => {
						if (!draggingBlockId) return;
						setBlocks((previousBlocks) =>
							reorderBlocks(previousBlocks, draggingBlockId, targetBlockId),
						);
						setDraggingBlockId(null);
					}}
					onDragStart={setDraggingBlockId}
					onDragEnd={() => setDraggingBlockId(null)}
					onInsertBelow={(blockId) => {
						setInsertAfterBlockId(blockId);
						setSlashInput("/");
						requestAnimationFrame(() => slashInputRef.current?.focus());
					}}
					onDuplicate={duplicateBlock}
					onRemove={removeBlock}
					renderBlockEditor={(blockId) => {
						const block = blocks.find((currentBlock) => currentBlock.id === blockId);
						if (!block) return null;
						return (
							<BlockEditorFields
								block={block}
								isUploading={uploadingBlockId === block.id}
								onUpdate={updateBlock}
								onRequestUpload={requestUpload}
							/>
						);
					}}
					renderPreviewBlock={(blockId) => {
						const block = blocks.find((currentBlock) => currentBlock.id === blockId);
						return block ? <WikiBlockRenderer block={block} /> : null;
					}}
				/>

				<WikiEditorMetaSidebar
					isPublished={isPublished}
					category={category}
					tags={tags}
					page={page}
					onPublishedChange={setIsPublished}
					onCategoryChange={setCategory}
					onTagsChange={setTags}
				/>
			</div>
		</div>
	);
}

/**
 * WikiPageViewer - Visualizador de página wiki
 * Renderiza blocos e habilita comentários inline + histórico com diff.
 */
export function WikiPageViewer({
	page,
	onEdit,
}: {
	page: WikiPage;
	onEdit: () => void;
}) {
	const { user, } = useAuth();
	const queryClient = useQueryClient();

	const blocks = useMemo(() => buildBlocksFromPage(page), [page]);

	const { data: comments = [] } = useQuery({
		queryKey: ["wiki-comments", user?.organizationId, page.id],
		queryFn: () =>
			user?.organizationId
				? wikiService.listComments(user.organizationId, page.id)
				: Promise.resolve([]),
		enabled: !!user?.organizationId && !!page.id,
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
	});

	const { data: versions = [] } = useQuery({
		queryKey: ["wiki-versions", user?.organizationId, page.id],
		queryFn: () =>
			user?.organizationId
				? wikiService.listPageVersions(user.organizationId, page.id)
				: Promise.resolve([]),
		enabled: !!user?.organizationId && !!page.id,
		staleTime: 5 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
	});

	const [activeCommentBlockId, setActiveCommentBlockId] = useState<
		string | null
	>(null);
	const [commentDraftsByBlock, setCommentDraftsByBlock] = useState<
		Record<string, string>
	>({});
	const [selectedTextByBlock, setSelectedTextByBlock] = useState<
		Record<string, BlockTextSelection>
	>({});
	const blockContentRefs = useRef<Record<string, HTMLDivElement | null>>({});

	useEffect(() => {
		setActiveCommentBlockId(null);
		setCommentDraftsByBlock({});
		setSelectedTextByBlock({});
	}, [page.id]);

	const commentsByBlock = useMemo(() => {
		return comments.reduce<Record<string, WikiComment[]>>((acc, comment) => {
			const blockId = comment.block_id || "general";
			if (!acc[blockId]) {
				acc[blockId] = [];
			}
			acc[blockId].push(comment);
			return acc;
		}, {});
	}, [comments]);

	const handleCaptureSelection = (blockId: string) => {
		const container = blockContentRefs.current[blockId];
		if (!container) return;

		const selection = getSelectionWithinElement(container);
		setSelectedTextByBlock((currentSelections) => {
			const nextSelections = { ...currentSelections };
			if (selection) {
				nextSelections[blockId] = selection;
			} else {
				delete nextSelections[blockId];
			}
			return nextSelections;
		});
	};

	const handleSubmitInlineComment = async (block: WikiBlock) => {
		if (!user?.organizationId || !user.id) {
			toast.error("Usuário sem organização válida para comentar.");
			return;
		}

		const draft = (commentDraftsByBlock[block.id] || "").trim();
		if (!draft) {
			toast.error("Digite um comentário antes de enviar.");
			return;
		}
		const selectedRange = selectedTextByBlock[block.id];

		try {
			await wikiService.addComment(user.organizationId, {
				page_id: page.id,
				parent_comment_id: undefined,
				content: draft,
				created_by: user.id,
				block_id: block.id,
				selection_text: selectedRange?.text || getBlockExcerpt(block),
				selection_start: selectedRange?.start,
				selection_end: selectedRange?.end,
				resolved: false,
			});

			setCommentDraftsByBlock((currentDrafts) => ({
				...currentDrafts,
				[block.id]: "",
			}));
			setSelectedTextByBlock((currentSelections) => {
				const nextSelections = { ...currentSelections };
				delete nextSelections[block.id];
				return nextSelections;
			});
			setActiveCommentBlockId(null);

			await queryClient.invalidateQueries({
				queryKey: ["wiki-comments", user.organizationId, page.id],
			});
			toast.success("Comentário inline adicionado.");
		} catch (error) {
			console.error("Erro ao adicionar comentário inline:", error);
			toast.error("Não foi possível adicionar o comentário.");
		}
	};

	return (
		<WikiPageViewerContent
			page={page}
			blocks={blocks}
			versions={versions}
			commentsByBlock={commentsByBlock}
			activeCommentBlockId={activeCommentBlockId}
			commentDraftsByBlock={commentDraftsByBlock}
			selectedTextByBlock={selectedTextByBlock}
			blockContentRefs={blockContentRefs}
			onEdit={onEdit}
			onToggleComment={(blockId) =>
				setActiveCommentBlockId((currentValue) =>
					currentValue === blockId ? null : blockId,
				)
			}
			onCaptureSelection={handleCaptureSelection}
			onCommentDraftChange={(blockId, value) =>
				setCommentDraftsByBlock((currentDrafts) => ({
					...currentDrafts,
					[blockId]: value,
				}))
			}
			onClearSelection={(blockId) =>
				setSelectedTextByBlock((currentSelections) => {
					const nextSelections = { ...currentSelections };
					delete nextSelections[blockId];
					return nextSelections;
				})
			}
			onCancelComment={() => setActiveCommentBlockId(null)}
			onSubmitComment={(blockId) => {
				const block = blocks.find((currentBlock) => currentBlock.id === blockId);
				if (block) {
					void handleSubmitInlineComment(block);
				}
			}}
			formatTimestamp={formatTimestamp}
			getBlockLabel={getBlockLabel}
			getBlockExcerpt={(blockId) => {
				const block = blocks.find((currentBlock) => currentBlock.id === blockId);
				return block ? getBlockExcerpt(block) : "";
			}}
			isEvidencePage={isEvidencePage}
			renderBlock={(blockId) => {
				const block = blocks.find((currentBlock) => currentBlock.id === blockId);
				return block ? <WikiBlockRenderer block={block} /> : null;
			}}
			renderHistoryDiff={(currentPage, currentVersions) => (
				<WikiHistoryDiff page={currentPage} versions={currentVersions} />
			)}
		/>
	);
}
