import { useEffect, useState } from "react";
import { Clock, Save, Coffee, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "../shared/SectionCard";
import { useScheduleSettings, type BusinessHour } from "@/hooks/useScheduleSettings";

const DAYS = [
  { value: 1, label: "Segunda-feira", short: "SEG" },
  { value: 2, label: "Terça-feira", short: "TER" },
  { value: 3, label: "Quarta-feira", short: "QUA" },
  { value: 4, label: "Quinta-feira", short: "QUI" },
  { value: 5, label: "Sexta-feira", short: "SEX" },
  { value: 6, label: "Sábado", short: "SÁB" },
  { value: 0, label: "Domingo", short: "DOM" },
];

type Draft = Partial<BusinessHour> & { day_of_week: number; hasBreak?: boolean };
type DraftMap = Record<number, Draft>;

function emptyDraft(): DraftMap {
  const map: DraftMap = {};
  for (const d of DAYS) {
    map[d.value] = {
      day_of_week: d.value,
      is_open: false,
      open_time: "07:00",
      close_time: "19:00",
      hasBreak: false,
    };
  }
  return map;
}

export function HorariosTab() {
  const { businessHours, isLoadingHours, upsertBusinessHours, isSavingHours } =
    useScheduleSettings();
  const [draft, setDraft] = useState<DraftMap>(emptyDraft());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (businessHours.length === 0) return;
    const map = emptyDraft();
    for (const h of businessHours) {
      map[h.day_of_week] = { ...h, hasBreak: !!(h.break_start && h.break_end) };
    }
    setDraft(map);
    setDirty(false);
  }, [businessHours]);

  const update = (day: number, patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
    setDirty(true);
  };

  const copyToAll = (sourceDay: number) => {
    const source = draft[sourceDay];
    setDraft((prev) => {
      const next: DraftMap = { ...prev };
      for (const d of DAYS) {
        if (d.value === sourceDay) continue;
        next[d.value] = {
          ...next[d.value],
          is_open: source.is_open,
          open_time: source.open_time,
          close_time: source.close_time,
          break_start: source.hasBreak ? source.break_start : undefined,
          break_end: source.hasBreak ? source.break_end : undefined,
          hasBreak: source.hasBreak,
        };
      }
      return next;
    });
    setDirty(true);
  };

  const save = () => {
    const list = DAYS.map((d) => {
      const row = draft[d.value];
      return {
        id: row.id,
        day_of_week: d.value,
        is_open: !!row.is_open,
        open_time: row.open_time ?? "07:00",
        close_time: row.close_time ?? "19:00",
        break_start: row.hasBreak ? row.break_start : undefined,
        break_end: row.hasBreak ? row.break_end : undefined,
      } satisfies Partial<BusinessHour>;
    });
    upsertBusinessHours.mutate(list, { onSuccess: () => setDirty(false) });
  };

  return (
    <SectionCard
      icon={<Clock className="h-4 w-4" />}
      title="Horários de Funcionamento"
      description="Defina os dias, horários e pausas da clínica"
      action={
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || isSavingHours}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Save className="mr-2 h-3.5 w-3.5" />
          {isSavingHours ? "Salvando…" : "Salvar"}
        </Button>
      }
    >
      {isLoadingHours ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {DAYS.map((day) => {
            const row = draft[day.value];
            return (
              <div
                key={day.value}
                className="rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex min-w-[10rem] items-center gap-3">
                    <Switch
                      checked={!!row.is_open}
                      onCheckedChange={(v) => update(day.value, { is_open: v })}
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={row.open_time ?? "07:00"}
                      disabled={!row.is_open}
                      onChange={(e) => update(day.value, { open_time: e.target.value })}
                      className="h-9 w-28"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={row.close_time ?? "19:00"}
                      disabled={!row.is_open}
                      onChange={(e) => update(day.value, { close_time: e.target.value })}
                      className="h-9 w-28"
                    />
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!row.is_open}
                      onClick={() =>
                        update(day.value, {
                          hasBreak: !row.hasBreak,
                          break_start: row.break_start ?? "12:00",
                          break_end: row.break_end ?? "13:00",
                        })
                      }
                      className={row.hasBreak ? "text-teal-700" : "text-muted-foreground"}
                    >
                      <Coffee className="mr-1 h-3.5 w-3.5" />
                      {row.hasBreak ? "Pausa" : "Sem pausa"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToAll(day.value)}
                      title="Copiar este horário para todos os dias"
                      className="text-muted-foreground"
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                </div>

                {row.is_open && row.hasBreak && (
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="text-xs font-medium text-muted-foreground">Pausa</span>
                    <Input
                      type="time"
                      value={row.break_start ?? "12:00"}
                      onChange={(e) => update(day.value, { break_start: e.target.value })}
                      className="h-8 w-28"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={row.break_end ?? "13:00"}
                      onChange={(e) => update(day.value, { break_end: e.target.value })}
                      className="h-8 w-28"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
