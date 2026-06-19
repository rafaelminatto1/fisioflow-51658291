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
  patientVisible,
  category,
  tags,
  page,
  clinicalMetadata,
  onPublishedChange,
  onPatientVisibleChange,
  onCategoryChange,
  onTagsChange,
  onClinicalMetadataChange,
}: {
  isPublished: boolean;
  patientVisible: boolean;
  category: string;
  tags: string;
  page: WikiPage | null;
  clinicalMetadata: WikiPage["clinical_metadata"];
  onPublishedChange: (value: boolean) => void;
  onPatientVisibleChange: (value: boolean) => void;
  onCategoryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onClinicalMetadataChange: (value: WikiPage["clinical_metadata"]) => void;
}) {
  return (
    <div className="w-80 space-y-8 overflow-auto border-l bg-slate-50/30 p-6">
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publicação</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="published" className="font-bold text-slate-700">Publicar</Label>
          <Switch id="published" checked={isPublished} onCheckedChange={onPublishedChange} className="data-[state=checked]:bg-blue-600" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="patient-visible" className="font-bold text-slate-700">Visível p/ pacientes</Label>
            <Switch
              id="patient-visible"
              checked={patientVisible}
              onCheckedChange={onPatientVisibleChange}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
            Entra no assistente do app do paciente. Use só para orientações revisadas.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classificação</p>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-600 ml-1">Categoria</Label>
          <Input
            placeholder="Ex: Protocolos"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="rounded-xl border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-600 ml-1">Tags</Label>
          <Input
            placeholder="tag1, tag2, tag3"
            value={tags}
            onChange={(event) => onTagsChange(event.target.value)}
            className="rounded-xl border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
          />
          <p className="text-[10px] text-slate-400 font-medium ml-1">Separadas por vírgula</p>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-200/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
          Inteligência Clínica
        </p>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-600">Alvo RPE (Borg)</Label>
          <Input
            type="number"
            min="0"
            max="10"
            placeholder="Ex: 7"
            className="h-9 rounded-xl border-slate-200 bg-white"
            value={clinicalMetadata?.rpe_target || ""}
            onChange={(e) =>
              onClinicalMetadataChange({ ...clinicalMetadata, rpe_target: Number(e.target.value) })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-600">Regra de Progressão</Label>
          <Input
            placeholder="Ex: +2kg se RPE < 5"
            className="h-9 rounded-xl border-slate-200 bg-white"
            value={clinicalMetadata?.progression_rule || ""}
            onChange={(e) =>
              onClinicalMetadataChange({ ...clinicalMetadata, progression_rule: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-slate-600">Nível de Evidência</Label>
          <select
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 outline-none"
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
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-1.5">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Metadata</p>
           <div className="flex justify-between text-[10px] font-bold">
             <span className="text-slate-400">Criado</span>
             <span className="text-slate-600">{formatTimestamp(page.created_at)}</span>
           </div>
           <div className="flex justify-between text-[10px] font-bold">
             <span className="text-slate-400">Versão</span>
             <span className="text-blue-600">v{page.version}</span>
           </div>
           <div className="flex justify-between text-[10px] font-bold">
             <span className="text-slate-400">Visualizações</span>
             <span className="text-orange-600">{page.view_count}</span>
           </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-[10px]">
        <p className="mb-2 font-black uppercase tracking-widest text-blue-700">Notion Shortcuts</p>
        <ul className="space-y-1.5 text-blue-600/80 font-medium">
          <li className="flex items-center gap-2">
            <code className="bg-white px-1 rounded border border-blue-200 text-[9px]">/</code> Slash menu
          </li>
          <li>• Drag-and-drop blocos</li>
          <li>• Callout e Colunas</li>
          <li>• Tabelas Dinâmicas</li>
          <li>• Mídia rica (Embeds)</li>
        </ul>
      </div>
    </div>
  );
}
