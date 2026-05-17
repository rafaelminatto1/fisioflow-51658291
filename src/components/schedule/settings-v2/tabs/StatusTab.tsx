import { Palette, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "../shared/SectionCard";
import { EmptyState } from "../shared/EmptyState";
import { SortableList } from "../shared/SortableList";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import { cn } from "@/lib/utils";

export function StatusTab() {
  const { allStatusRows, updateStatus, deleteStatus, createStatus, isLoading, isSaving } = useStatusConfig();

  const handleAdd = () => {
    const label = window.prompt("Nome do novo status:");
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    createStatus({
      key,
      label,
      color: "#0d9488",
      bgColor: "#ccfbf1",
      borderColor: "#0d9488",
      allowedActions: [],
      isActive: true,
      countsTowardCapacity: true,
    });
  };

  const handleReorder = (next: typeof allStatusRows) => {
    next.forEach((row, idx) => {
      const newOrder = (idx + 1) * 10;
      if (row.sort_order !== newOrder) {
        updateStatus(row.id, { sortOrder: newOrder });
      }
    });
  };

  return (
    <SectionCard
      icon={<Palette className="h-4 w-4" />}
      title="Status de Atendimento"
      description="Arraste para reordenar. Personalize cores, rótulos e regras de capacidade."
      action={
        <Button size="sm" onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700" disabled={isSaving}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Novo status
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : allStatusRows.length === 0 ? (
        <EmptyState icon={<Palette className="h-5 w-5" />} title="Nenhum status configurado" />
      ) : (
        <SortableList
          items={allStatusRows}
          onReorder={handleReorder}
          renderItem={(row, dragHandle) => (
            <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
              {dragHandle}

              <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <span className="block h-full w-full" style={{ backgroundColor: row.color }} />
                <input
                  type="color"
                  value={row.color}
                  onChange={(e) => updateStatus(row.id, { color: e.target.value, borderColor: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>

              <div className="min-w-0">
                <Input
                  value={row.label}
                  onChange={(e) => updateStatus(row.id, { label: e.target.value })}
                  className="h-8 border-none bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
                />
                <p className="text-[11px] text-muted-foreground">{row.key}</p>
              </div>

              {row.is_default ? (
                <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Custom</Badge>
              )}

              <button
                type="button"
                onClick={() => updateStatus(row.id, { countsTowardCapacity: !row.counts_toward_capacity })}
                title={row.counts_toward_capacity ? "Ocupa vaga na capacidade" : "Não ocupa vaga"}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wider transition",
                  row.counts_toward_capacity
                    ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900",
                )}
              >
                <Users className="h-3 w-3" />
                {row.counts_toward_capacity ? "Conta" : "Não conta"}
              </button>

              <div className="flex items-center gap-2">
                <Switch checked={row.is_active} onCheckedChange={(v) => updateStatus(row.id, { isActive: v })} />
                <span className="text-[11px] text-muted-foreground">{row.is_active ? "Ativo" : "Oculto"}</span>
              </div>

              <Button
                size="icon"
                variant="ghost"
                disabled={row.is_default}
                onClick={() => {
                  if (confirm(`Remover status "${row.label}"?`)) deleteStatus(row.id);
                }}
                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-30 dark:hover:bg-red-950"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        />
      )}
    </SectionCard>
  );
}
