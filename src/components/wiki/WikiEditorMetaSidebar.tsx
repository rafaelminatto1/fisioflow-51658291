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
  clinicalMetadata: WikiPage["clinical_metadata"];
  onPublishedChange: (value: boolean) => void;
  onCategoryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onClinicalMetadataChange: (value: WikiPage["clinical_metadata"]) => void;
}) {
  return (
    <div className="w-80 space-y-6 overflow-auto border-l bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="published">Publicar</Label>
        <Switch id="published" checked={isPublished} onCheckedChange={onPublishedChange} />
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

      <div className="space-y-3 pt-4 border-t border-border/60">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
          Inteligência Clínica
        </p>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium">Alvo RPE (Borg)</Label>
          <Input
            type="number"
            min="0"
            max="10"
            placeholder="Ex: 7"
            className="h-8 text-xs"
            value={clinicalMetadata?.rpe_target || ""}
            onChange={(e) =>
              onClinicalMetadataChange({ ...clinicalMetadata, rpe_target: Number(e.target.value) })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium">Regra de Progressão</Label>
          <Input
            placeholder="Ex: +2kg se RPE < 5"
            className="h-8 text-xs"
            value={clinicalMetadata?.progression_rule || ""}
            onChange={(e) =>
              onClinicalMetadataChange({ ...clinicalMetadata, progression_rule: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium">Nível de Evidência</Label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={clinicalMetadata?.evidence_level || ""}
            onChange={(e) =>
              onClinicalMetadataChange({
                ...clinicalMetadata,
                evidence_level: e.target.value as any,
              })
            }
          >
            <option value="">Selecione...</option>
            <option value="A">Nível A (Forte)</option>
            <option value="B">Nível B (Moderado)</option>
            <option value="C">Nível C (Fraco)</option>
            <option value="D">Nível D (Teórico)</option>
          </select>
        </div>
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
