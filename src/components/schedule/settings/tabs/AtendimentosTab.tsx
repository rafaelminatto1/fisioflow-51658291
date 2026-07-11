import { useEffect, useState } from "react";
import { Stethoscope, Plus, Trash2, Copy, Star, Palette, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/schedule/settings/shared/SectionCard";
import { EmptyState } from "@/components/schedule/settings/shared/EmptyState";
import { SortableList } from "@/components/schedule/settings/shared/SortableList";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { useStatusConfig } from "@/hooks/useStatusConfig";
import type { TabComponentProps } from "../types";

interface NewStatusForm {
  label: string;
  color: string;
}

const EMPTY_STATUS_FORM: NewStatusForm = { label: "", color: "#2563eb" };

export function AtendimentosTab({ registerHandle }: TabComponentProps) {
  const { types, isLoading: isLoadingTypes, addType, updateType, removeType, toggleActive, duplicateType } =
    useAppointmentTypes();
  const { allStatusRows, updateStatus, deleteStatus, createStatus, isLoading: isLoadingStatus, isSaving } =
    useStatusConfig();

  const [newStatusDialog, setNewStatusDialog] = useState(false);
  const [newStatusForm, setNewStatusForm] = useState<NewStatusForm>(EMPTY_STATUS_FORM);

  useEffect(() => {
    registerHandle({
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      save: () => {},
      discard: () => {},
    });
    return () => registerHandle(null);
  }, [registerHandle]);

  const handleReorderTypes = (next: typeof types) => {
    next.forEach((t, idx) => {
      if (t.sortOrder !== idx) {
        updateType(t.id, { sortOrder: idx });
      }
    });
  };

  const openNewStatusDialog = () => {
    setNewStatusForm(EMPTY_STATUS_FORM);
    setNewStatusDialog(true);
  };

  const handleCreateStatus = () => {
    if (!newStatusForm.label.trim()) return;
    const key = newStatusForm.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    createStatus({
      key,
      label: newStatusForm.label.trim(),
      color: newStatusForm.color,
      bgColor: `${newStatusForm.color}26`,
      borderColor: newStatusForm.color,
      allowedActions: [],
      isActive: true,
      countsTowardCapacity: true,
    });
    setNewStatusDialog(false);
  };

  const handleReorderStatus = (next: typeof allStatusRows) => {
    next.forEach((row, idx) => {
      const newOrder = (idx + 1) * 10;
      if (row.sort_order !== newOrder) {
        updateStatus(row.id, { sortOrder: newOrder });
      }
    });
  };

  return (
    <div className="space-y-5">
      <SectionCard
        icon={<Stethoscope className="h-4 w-4" />}
        title="Tipos de Atendimento"
        description="Serviços oferecidos com duração, buffers e cor"
        action={
          <Button size="sm" onClick={() => addType()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo tipo
          </Button>
        }
      >
        {isLoadingTypes ? (
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
            onReorder={handleReorderTypes}
            renderItem={(t, dragHandle) => (
              <div className="flex flex-col gap-3 rounded-lg border border-border/40 p-3 hover:border-border/80 transition-colors sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center text-muted-foreground">{dragHandle}</div>
                  <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-border/50">
                    <span className="block h-full w-full" style={{ backgroundColor: t.color }} />
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => updateType(t.id, { color: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="min-w-[120px] flex-1">
                    <Input
                      value={t.name}
                      onChange={(e) => updateType(t.id, { name: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Nome do Tipo"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={t.durationMinutes}
                      onChange={(e) => updateType(t.id, { durationMinutes: Number(e.target.value) })}
                      className="h-8 text-sm text-center"
                      placeholder="Min"
                      title="Duração (min)"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={t.bufferBeforeMinutes}
                      onChange={(e) => updateType(t.id, { bufferBeforeMinutes: Number(e.target.value) })}
                      className="h-8 text-sm text-center"
                      placeholder="Antes"
                      title="Buffer antes"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={t.bufferAfterMinutes}
                      onChange={(e) => updateType(t.id, { bufferAfterMinutes: Number(e.target.value) })}
                      className="h-8 text-sm text-center"
                      placeholder="Depois"
                      title="Buffer depois"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={t.maxPerDay ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateType(t.id, { maxPerDay: v === "" ? null : Number(v) });
                      }}
                      className="h-8 text-sm text-center"
                      placeholder="Sem limite"
                      title="Limite por dia"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/40 pt-3 sm:border-0 sm:pt-0">
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 ml-1"
                    onClick={() => duplicateType(t.id)}
                  >
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

      <SectionCard
        icon={<Palette className="h-4 w-4" />}
        title="Status de Atendimento"
        description="Arraste para reordenar. Personalize cores, rótulos e regras de capacidade."
        action={
          <Button
            size="sm"
            onClick={openNewStatusDialog}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo status
          </Button>
        }
      >
        {isLoadingStatus ? (
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
            onReorder={handleReorderStatus}
            renderItem={(row, dragHandle) => (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
                {dragHandle}

                <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="block h-full w-full" style={{ backgroundColor: row.color }} />
                  <input
                    type="color"
                    value={row.color}
                    onChange={(e) =>
                      updateStatus(row.id, { color: e.target.value, borderColor: e.target.value })
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <Input
                    value={row.label}
                    onChange={(e) => updateStatus(row.id, { label: e.target.value })}
                    className="h-8 border-none bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
                  />
                  <p className="text-[11px] text-muted-foreground">{row.key}</p>
                </div>

                {row.is_default ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Padrão
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Custom
                  </Badge>
                )}

                <button
                  type="button"
                  onClick={() =>
                    updateStatus(row.id, { countsTowardCapacity: !row.counts_toward_capacity })
                  }
                  title={row.counts_toward_capacity ? "Ocupa vaga na capacidade" : "Não ocupa vaga"}
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wider transition",
                    row.counts_toward_capacity
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  <Users className="h-3 w-3" />
                  {row.counts_toward_capacity ? "Conta" : "Não conta"}
                </button>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => updateStatus(row.id, { isActive: v })}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {row.is_active ? "Ativo" : "Oculto"}
                  </span>
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

      {/* Dialog para criar novo status — substitui window.prompt() */}
      <Dialog open={newStatusDialog} onOpenChange={setNewStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo status</DialogTitle>
            <DialogDescription>
              Defina o nome e a cor principal do novo status de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome do status</Label>
              <Input
                autoFocus
                value={newStatusForm.label}
                onChange={(e) => setNewStatusForm((p) => ({ ...p, label: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateStatus()}
                placeholder="Ex: Em espera, Confirmado…"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <div className="mt-1 flex items-center gap-3">
                <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="block h-full w-full" style={{ backgroundColor: newStatusForm.color }} />
                  <input
                    type="color"
                    value={newStatusForm.color}
                    onChange={(e) => setNewStatusForm((p) => ({ ...p, color: e.target.value }))}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <span className="font-mono text-sm text-muted-foreground">{newStatusForm.color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewStatusDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateStatus}
              disabled={!newStatusForm.label.trim() || isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Criando…" : "Criar status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
