import { cn } from "@/lib/utils";
import { WikiDatabaseViewer } from "@/components/wiki/WikiDatabaseViewer";
import { WikiInlineMarkdown } from "@/components/wiki/WikiInlineMarkdown";
import { WikiMediaBlock } from "@/components/wiki/WikiMediaBlock";

type CalloutTone = "info" | "warning" | "success" | "error";

interface WikiChecklistItemLike {
	id: string;
	text: string;
	checked: boolean;
}

interface WikiDatabaseColumnLike {
	id: string;
	name: string;
	type: "text" | "number" | "date";
}

interface WikiDatabaseRowLike {
	id: string;
	values: Record<string, string>;
}

interface WikiDatabaseConfigLike {
	title: string;
	columns: WikiDatabaseColumnLike[];
	rows: WikiDatabaseRowLike[];
	filter: string;
	sortColumnId: string;
	sortDirection: "asc" | "desc";
}

interface WikiBlockLike {
	type:
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
	text?: string;
	tone?: CalloutTone;
	title?: string;
	body?: string;
	open?: boolean;
	items?: WikiChecklistItemLike[];
	left?: string;
	right?: string;
	url?: string;
	database?: WikiDatabaseConfigLike;
}

const CALLOUT_STYLES: Record<
	CalloutTone,
	{ label: string; className: string }
> = {
	info: {
		label: "Informacao",
		className:
			"border-sky-300 bg-sky-50/80 text-sky-900 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100",
	},
	warning: {
		label: "Atencao",
		className:
			"border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100",
	},
	success: {
		label: "Sucesso",
		className:
			"border-emerald-300 bg-emerald-50/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100",
	},
	error: {
		label: "Erro",
		className:
			"border-rose-300 bg-rose-50/80 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100",
	},
};

function createDefaultDatabaseConfig(): WikiDatabaseConfigLike {
	return {
		title: "Tabela sem titulo",
		columns: [],
		rows: [],
		filter: "",
		sortColumnId: "",
		sortDirection: "asc",
	};
}

export function WikiBlockRenderer({ block }: { block: WikiBlockLike }) {
	switch (block.type) {
		case "paragraph":
			return <WikiInlineMarkdown text={block.text || ""} />;
		case "heading1":
			return (
				<h1 className="text-3xl font-bold tracking-tight">
					{block.text || "Titulo H1"}
				</h1>
			);
		case "heading2":
			return (
				<h2 className="text-2xl font-semibold tracking-tight">
					{block.text || "Titulo H2"}
				</h2>
			);
		case "heading3":
			return (
				<h3 className="text-xl font-semibold tracking-tight">
					{block.text || "Titulo H3"}
				</h3>
			);
		case "callout": {
			const tone = block.tone || "info";
			const style = CALLOUT_STYLES[tone];
			return (
				<div className={cn("rounded-xl border p-4", style.className)}>
					<div className="mb-1 text-xs font-semibold uppercase tracking-wide">
						{style.label}
					</div>
					<WikiInlineMarkdown text={block.text || ""} />
				</div>
			);
		}
		case "toggle":
			return (
				<details
					className="rounded-xl border bg-muted/10 p-4"
					open={Boolean(block.open)}
				>
					<summary className="cursor-pointer select-none font-medium">
						{block.title || "Detalhes"}
					</summary>
					<div className="mt-3">
						<WikiInlineMarkdown text={block.body || ""} />
					</div>
				</details>
			);
		case "checklist":
			return (
				<div className="space-y-2 rounded-xl border bg-muted/10 p-4">
					{(block.items || []).map((item) => (
						<label key={item.id} className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={item.checked}
								readOnly
								className="h-4 w-4"
							/>
							<span
								className={cn(
									item.checked && "text-muted-foreground line-through",
								)}
							>
								{item.text || "(sem texto)"}
							</span>
						</label>
					))}
				</div>
			);
		case "columns":
			return (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<div className="rounded-xl border bg-muted/10 p-4">
						<WikiInlineMarkdown text={block.left || ""} />
					</div>
					<div className="rounded-xl border bg-muted/10 p-4">
						<WikiInlineMarkdown text={block.right || ""} />
					</div>
				</div>
			);
		case "image":
		case "video":
		case "youtube":
		case "embed":
			return <WikiMediaBlock block={block} />;
		case "database":
			return (
				<WikiDatabaseViewer
					database={block.database || createDefaultDatabaseConfig()}
				/>
			);
		default:
			return <WikiInlineMarkdown text={block.text || ""} />;
	}
}
