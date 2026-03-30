import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { WikiPage } from "@/types/wiki";

function formatTimestamp(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return new Date(value).toLocaleString("pt-BR");
	if (value instanceof Date) return value.toLocaleString("pt-BR");
	if (
		typeof value === "object" &&
		value !== null &&
		"toDate" in value &&
		typeof (value as { toDate: () => Date }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate().toLocaleString("pt-BR");
	}
	return "";
}

export function WikiEditorMetaSidebar({
	isPublished,
	category,
	tags,
	page,
	onPublishedChange,
	onCategoryChange,
	onTagsChange,
}: {
	isPublished: boolean;
	category: string;
	tags: string;
	page: WikiPage | null;
	onPublishedChange: (value: boolean) => void;
	onCategoryChange: (value: string) => void;
	onTagsChange: (value: string) => void;
}) {
	return (
		<div className="w-80 space-y-6 overflow-auto border-l bg-muted/30 p-4">
			<div className="flex items-center justify-between">
				<Label htmlFor="published">Publicar</Label>
				<Switch
					id="published"
					checked={isPublished}
					onCheckedChange={onPublishedChange}
				/>
			</div>

			<div className="space-y-2">
				<Label>Categoria</Label>
				<Input
					placeholder="Ex: Protocolos"
					value={category}
					onChange={(event) => onCategoryChange(event.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label>Tags</Label>
				<Input
					placeholder="tag1, tag2, tag3"
					value={tags}
					onChange={(event) => onTagsChange(event.target.value)}
				/>
				<p className="text-xs text-muted-foreground">Separadas por vírgula</p>
			</div>

			{page && (
				<div className="space-y-1 text-xs text-muted-foreground">
					<p>Criado em: {formatTimestamp(page.created_at)}</p>
					<p>Versão: {page.version}</p>
					<p>Visualizações: {page.view_count}</p>
				</div>
			)}

			<div className="text-xs text-muted-foreground">
				<p className="mb-2 font-medium">Recursos estilo Notion habilitados:</p>
				<ul className="space-y-1">
					<li>
						<code>/</code> Slash menu com busca de blocos
					</li>
					<li>Drag-and-drop para reordenar</li>
					<li>Callout, Toggle, Checklist e Colunas</li>
					<li>Tabela embutida com filtro e sort</li>
					<li>Mídia: imagem, vídeo, YouTube, embed</li>
				</ul>
			</div>
		</div>
	);
}
