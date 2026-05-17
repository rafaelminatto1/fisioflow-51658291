import { Stethoscope, Plus, Trash2, Copy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SectionCard } from "../shared/SectionCard";
import { EmptyState } from "../shared/EmptyState";
import { SortableList } from "../shared/SortableList";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";

export function TiposTab() {
  const { types, isLoading, addType, updateType, removeType, toggleActive, duplicateType } = useAppointmentTypes();

  const handleReorder = (next: typeof types) => {
    next.forEach((t, idx) => {
      const newOrder = idx;
      if (t.sortOrder !== newOrder) {
        updateType(t.id, { sortOrder: newOrder });
      }
    });
  };

  return (
    <SectionCard
      icon={<Stethoscope className="h-4 w-4" />}
      title="Tipos de Atendimento"
      description="Serviços oferecidos com duração, buffers e cor"
      action={
        <Button size="sm" onClick={() => addType()} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Novo tipo
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : types.length === 0 ? (
        <EmptyState icon={<Stethoscope className="h-5 w-5" />} title="Nenhum tipo cadastrado" />
      ) : (
        <SortableList
          items={types}
          onReorder={handleReorder}
          renderItem={(t, dragHandle) => (
            <div className="grid gap-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800 sm:grid-cols-[auto_auto_1fr_auto]">
              <div className="flex items-center">{dragHandle}</div>
              <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <span className="block h-full w-full" style={{ backgroundColor: t.color }} />
                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => updateType(t.id, { color: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateType(t.id, { name: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duração (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    value={t.durationMinutes}
                    onChange={(e) => updateType(t.id, { durationMinutes: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Buffer antes</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={t.bufferBeforeMinutes}
                    onChange={(e) => updateType(t.id, { bufferBeforeMinutes: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Buffer depois</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={t.bufferAfterMinutes}
                    onChange={(e) => updateType(t.id, { bufferAfterMinutes: Number(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Limite por dia (vazio = sem limite)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={t.maxPerDay ?? ""}
                    placeholder="Sem limite"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateType(t.id, { maxPerDay: v === "" ? null : Number(v) });
                    }}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateType(t.id, { isDefault: !t.isDefault })}
                  title={t.isDefault ? "Tipo padrão" : "Definir como padrão"}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    t.isDefault ? "text-amber-500" : "text-muted-foreground hover:text-amber-500",
                  )}
                >
                  <Star className={cn("h-4 w-4", t.isDefault && "fill-amber-500")} />
                </button>
                <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateType(t.id)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => {
                    if (confirm(`Remover tipo "${t.name}"?`)) removeType(t.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </SectionCard>
  );
}
