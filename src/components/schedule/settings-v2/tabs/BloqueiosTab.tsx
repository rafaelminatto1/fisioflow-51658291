import { useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SectionCard } from "../shared/SectionCard";
import { EmptyState } from "../shared/EmptyState";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { cn } from "@/lib/utils";

const RECURRING_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function BloqueiosTab() {
  const { blockedTimes, isLoadingBlocked, createBlockedTime, deleteBlockedTime, isCreatingBlocked } = useScheduleSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    reason: "",
    start_date: "",
    end_date: "",
    start_time: "08:00",
    end_time: "18:00",
    is_all_day: true,
    is_recurring: false,
    recurring_days: [] as number[],
  });

  const toggleRecurringDay = (d: number) => {
    setForm((p) => ({
      ...p,
      recurring_days: p.recurring_days.includes(d)
        ? p.recurring_days.filter((x) => x !== d)
        : [...p.recurring_days, d],
    }));
  };

  const handleSubmit = () => {
    if (!form.title || !form.start_date) return;
    createBlockedTime.mutate(
      {
        title: form.title,
        reason: form.reason || undefined,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        start_time: form.is_all_day ? undefined : form.start_time,
        end_time: form.is_all_day ? undefined : form.end_time,
        is_all_day: form.is_all_day,
        is_recurring: form.is_recurring,
        recurring_days: form.is_recurring ? form.recurring_days : [],
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm({
            title: "",
            reason: "",
            start_date: "",
            end_date: "",
            start_time: "08:00",
            end_time: "18:00",
            is_all_day: true,
            is_recurring: false,
            recurring_days: [],
          });
        },
      },
    );
  };

  return (
    <SectionCard
      icon={<CalendarOff className="h-4 w-4" />}
      title="Bloqueios de Agenda"
      description="Feriados, recessos e períodos indisponíveis"
      action={
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-3.5 w-3.5" />
          Novo bloqueio
        </Button>
      }
    >
      {isLoadingBlocked ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : blockedTimes.length === 0 ? (
        <EmptyState icon={<CalendarOff className="h-5 w-5" />} title="Nenhum bloqueio cadastrado" description="Crie bloqueios para feriados, folgas e indisponibilidades." />
      ) : (
        <div className="space-y-2">
          {blockedTimes.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{b.title}</span>
                  {b.is_all_day && <Badge variant="secondary" className="text-[10px]">Dia inteiro</Badge>}
                  {b.is_recurring && <Badge variant="outline" className="text-[10px]">Semanal</Badge>}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {b.start_date}
                  {b.end_date && b.end_date !== b.start_date ? ` até ${b.end_date}` : ""}
                  {!b.is_all_day && b.start_time ? ` · ${b.start_time}–${b.end_time}` : ""}
                </p>
                {b.reason && <p className="mt-0.5 text-xs text-muted-foreground">{b.reason}</p>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  if (confirm(`Remover bloqueio "${b.title}"?`)) deleteBlockedTime.mutate(b.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo bloqueio</DialogTitle>
            <DialogDescription>Indique o período em que a agenda ficará indisponível.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Feriado nacional" className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data início</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Data fim</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium">Dia inteiro</p>
                <p className="text-[11px] text-muted-foreground">Bloqueia todo o expediente</p>
              </div>
              <Switch checked={form.is_all_day} onCheckedChange={(v) => setForm((p) => ({ ...p, is_all_day: v }))} />
            </div>
            {!form.is_all_day && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} className="h-9" />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium">Recorrente (semanal)</p>
                <p className="text-[11px] text-muted-foreground">Repete nos dias selecionados</p>
              </div>
              <Switch
                checked={form.is_recurring}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_recurring: v }))}
              />
            </div>
            {form.is_recurring && (
              <div className="flex flex-wrap gap-2">
                {RECURRING_DAYS.map((d) => {
                  const sel = form.recurring_days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleRecurringDay(d.value)}
                      className={cn(
                        "h-8 min-w-[3rem] rounded-md border px-2 text-xs font-semibold uppercase tracking-wider transition",
                        sel
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Recesso de fim de ano" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.title || !form.start_date || isCreatingBlocked} className="bg-teal-600 hover:bg-teal-700">
              {isCreatingBlocked ? "Criando…" : "Criar bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
