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
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 xl:flex-row xl:items-start">
                <div className="flex shrink-0 items-center gap-3 xl:mt-7">
                  <div className="flex items-center text-muted-foreground">{dragHandle}</div>
                  <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border border-border/50 shadow-sm transition-transform hover:scale-105">
                    <span className="block h-full w-full" style={{ backgroundColor: t.color }} />
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => updateType(t.id, { color: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>

                <div className="flex flex-1 flex-wrap items-start gap-4">
                  <div className="min-w-[200px] flex-1">
                    <Label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Nome do Serviço</Label>
                    <Input
                      value={t.name}
                      onChange={(e) => updateType(t.id, { name: e.target.value })}
                      className="h-9 font-medium"
                      placeholder="Ex: Avaliação Inicial"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Duração</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={5}
                        max={240}
                        value={t.durationMinutes}
                        onChange={(e) => updateType(t.id, { durationMinutes: Number(e.target.value) })}
                        className="h-9 pr-8 text-right font-medium"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                  <div className="w-24">
                    <Label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400" title="Tempo bloqueado antes do agendamento">Pausa Antes</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={t.bufferBeforeMinutes}
                        onChange={(e) => updateType(t.id, { bufferBeforeMinutes: Number(e.target.value) })}
                        className="h-9 pr-8 text-right font-medium"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                  <div className="w-24">
                    <Label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400" title="Tempo bloqueado após o agendamento">Pausa Depois</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={t.bufferAfterMinutes}
                        onChange={(e) => updateType(t.id, { bufferAfterMinutes: Number(e.target.value) })}
                        className="h-9 pr-8 text-right font-medium"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                  <div className="w-32">
                    <Label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Limite Diário</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={t.maxPerDay ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateType(t.id, { maxPerDay: v === "" ? null : Number(v) });
                      }}
                      className="h-9 text-center font-medium placeholder:text-xs placeholder:font-normal"
                      placeholder="Sem limite"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 xl:mt-7 xl:items-end xl:border-0 xl:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateType(t.id, { isDefault: !t.isDefault })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        t.isDefault
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", t.isDefault && "fill-amber-500 text-amber-500")} />
                      {t.isDefault ? "Padrão" : "Tornar padrão"}
                    </button>
                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 pr-3 dark:border-slate-700 dark:bg-slate-900">
                      <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id)} className="scale-75 origin-left" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {t.isActive ? "Ativo" : "Off"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => duplicateType(t.id)}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                      onClick={() => {
                        if (confirm(`Remover tipo "${t.name}"?`)) removeType(t.id);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>
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
