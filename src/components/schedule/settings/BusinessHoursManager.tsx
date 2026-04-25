import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle2, Briefcase, Zap, Sun, Moon, Coffee } from "lucide-react";
import { useScheduleSettings, type BusinessHour } from "@/hooks/useScheduleSettings";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SettingsSaveButton } from "@/components/schedule/settings/shared/SettingsSaveButton";
import { SettingsLoadingState } from "@/components/schedule/settings/shared/SettingsLoadingState";

const DEFAULT_HOURS: Partial<BusinessHour>[] = [
  { day_of_week: 0, is_open: false, open_time: "08:00", close_time: "18:00" },
  {
    day_of_week: 1,
    is_open: true,
    open_time: "07:00",
    close_time: "21:00",
    break_start: undefined,
    break_end: undefined,
  },
  {
    day_of_week: 2,
    is_open: true,
    open_time: "07:00",
    close_time: "21:00",
    break_start: undefined,
    break_end: undefined,
  },
  {
    day_of_week: 3,
    is_open: true,
    open_time: "07:00",
    close_time: "21:00",
    break_start: undefined,
    break_end: undefined,
  },
  {
    day_of_week: 4,
    is_open: true,
    open_time: "07:00",
    close_time: "21:00",
    break_start: undefined,
    break_end: undefined,
  },
  {
    day_of_week: 5,
    is_open: true,
    open_time: "07:00",
    close_time: "21:00",
    break_start: undefined,
    break_end: undefined,
  },
  {
    day_of_week: 6,
    is_open: true,
    open_time: "08:00",
    close_time: "13:00",
    break_start: undefined,
    break_end: undefined,
  },
];

const TIME_PRESETS = [
  { label: "Comercial", icon: Briefcase, open: "09:00", close: "18:00" },
  { label: "Estendido", icon: Zap, open: "08:00", close: "20:00" },
  { label: "Manhã", icon: Sun, open: "07:00", close: "13:00" },
  { label: "Tarde", icon: Moon, open: "13:00", close: "19:00" },
];

const DEFAULT_BREAK_START = "12:00";
const DEFAULT_BREAK_END = "13:00";

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
};

export function BusinessHoursManager() {
  const { businessHours, daysOfWeek, upsertBusinessHours, isLoadingHours, isSavingHours } =
    useScheduleSettings();
  const [hours, setHours] = useState<Partial<BusinessHour>[]>(DEFAULT_HOURS);
  const [saved, setSaved] = useState(false);
  const [copiedDay, setCopiedDay] = useState<number | null>(null);
  const [expandedBreak, setExpandedBreak] = useState<number | null>(null);

  useEffect(() => {
    if (businessHours && businessHours.length > 0) {
      const merged = DEFAULT_HOURS.map((def) => {
        const existing = businessHours.find((h) => h.day_of_week === def.day_of_week);
        return existing || def;
      });
      setHours(merged);
    }
  }, [businessHours]);

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h)),
    );
    setSaved(false);
  };

  const toggleBreak = (dayOfWeek: number, enabled: boolean) => {
    setHours((prev) =>
      prev.map((h) => {
        if (h.day_of_week !== dayOfWeek) return h;
        return {
          ...h,
          break_start: enabled ? h.break_start || DEFAULT_BREAK_START : undefined,
          break_end: enabled ? h.break_end || DEFAULT_BREAK_END : undefined,
        };
      }),
    );
    setSaved(false);
    if (enabled) setExpandedBreak(dayOfWeek);
  };

  const copyToAllDays = (sourceDay: number) => {
    const source = hours.find((h) => h.day_of_week === sourceDay);
    if (!source) return;
    const updated = hours.map((h) =>
      h.day_of_week === sourceDay
        ? h
        : {
            ...h,
            is_open: source.is_open,
            open_time: source.open_time,
            close_time: source.close_time,
            break_start: source.break_start,
            break_end: source.break_end,
          },
    );
    setHours(updated);
    setSaved(false);
    setCopiedDay(sourceDay);
    setTimeout(() => setCopiedDay(null), 1500);
  };

  const applyPresetToAll = (preset: (typeof TIME_PRESETS)[0]) => {
    setHours((prev) =>
      prev.map((h) => ({
        ...h,
        is_open: true,
        open_time: preset.open,
        close_time: preset.close,
      })),
    );
    setSaved(false);
  };

  const invalidOpenDays = useMemo(
    () =>
      hours.filter((h) => {
        if (!h.is_open) return false;
        if (toMinutes(h.open_time || "07:00") >= toMinutes(h.close_time || "21:00")) return true;
        if (h.break_start && h.break_end) {
          const bs = toMinutes(h.break_start);
          const be = toMinutes(h.break_end);
          const open = toMinutes(h.open_time || "07:00");
          const close = toMinutes(h.close_time || "21:00");
          if (bs >= be || bs <= open || be >= close) return true;
        }
        return false;
      }),
    [hours],
  );

  const handleSave = async () => {
    if (invalidOpenDays.length > 0) {
      const labels = invalidOpenDays
        .map((h) => daysOfWeek?.find((d) => d.value === h.day_of_week)?.label)
        .filter(Boolean)
        .join(", ");
      toast({
        title: "Horário inválido",
        description: `Corrija os horários em: ${labels}.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await upsertBusinessHours.mutateAsync(
        hours.map((h) => ({
          ...h,
          break_start: h.break_start || undefined,
          break_end: h.break_end || undefined,
        })),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  if (isLoadingHours) {
    return <SettingsLoadingState message="Carregando horários..." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Preset:</span>
        {TIME_PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <Button
              key={preset.label}
              size="sm"
              variant="outline"
              onClick={() => applyPresetToAll(preset)}
              className="h-7 text-xs gap-1.5"
            >
              <Icon className="h-3 w-3" />
              {preset.label}
            </Button>
          );
        })}
      </div>

      {invalidOpenDays.length > 0 && (
        <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          Horários inválidos nos dias destacados. Verifique abertura/fechamento e intervalos.
        </div>
      )}

      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_3rem_2rem] items-center gap-1.5 px-1 pb-1 border-b">
        <span />
        <span className="text-xs font-medium text-muted-foreground">Dia</span>
        <span className="text-xs font-medium text-muted-foreground text-center">Abre</span>
        <span className="text-xs font-medium text-muted-foreground text-center">Fecha</span>
        <span className="text-xs font-medium text-muted-foreground text-center">Total</span>
        <span />
      </div>

      <div className="space-y-0.5">
        {daysOfWeek?.map((day) => {
          const hour = hours.find((h) => h.day_of_week === day.value) || DEFAULT_HOURS[day.value];
          const isOpen = !!hour?.is_open;
          const hasBreak = !!(hour?.break_start && hour?.break_end);
          const hasError =
            isOpen &&
            toMinutes(hour?.open_time || "07:00") >= toMinutes(hour?.close_time || "21:00");
          const hasBreakError =
            isOpen &&
            hasBreak &&
            (() => {
              const bs = toMinutes(hour.break_start!);
              const be = toMinutes(hour.break_end!);
              const open = toMinutes(hour.open_time || "07:00");
              const close = toMinutes(hour.close_time || "21:00");
              return bs >= be || bs <= open || be >= close;
            })();

          const totalMinutes = isOpen
            ? (() => {
                let diff =
                  toMinutes(hour?.close_time || "21:00") - toMinutes(hour?.open_time || "07:00");
                if (hasBreak) {
                  diff -= toMinutes(hour.break_end!) - toMinutes(hour.break_start!);
                }
                return Math.max(0, diff);
              })()
            : 0;

          const isExpanded = expandedBreak === day.value;

          return (
            <div key={day.value}>
              <div
                className={cn(
                  "grid grid-cols-[2rem_1fr_5rem_5rem_3rem_2rem] items-center gap-1.5 py-1.5 px-1 rounded-lg transition-colors",
                  isOpen ? "hover:bg-muted/30" : "opacity-60",
                  (hasError || hasBreakError) && "bg-red-50/50 dark:bg-red-950/10",
                )}
              >
                <Switch
                  checked={isOpen}
                  onCheckedChange={(checked) => updateHour(day.value, "is_open", checked)}
                  className="scale-75 origin-left"
                />

                <span
                  className={cn("text-sm font-medium truncate", !isOpen && "text-muted-foreground")}
                >
                  {day.label}
                </span>

                {isOpen ? (
                  <>
                    <Input
                      type="time"
                      value={hour?.open_time || "07:00"}
                      onChange={(e) => updateHour(day.value, "open_time", e.target.value)}
                      className={cn(
                        "h-8 text-xs text-center px-1",
                        (hasError || hasBreakError) && "border-red-400 focus-visible:ring-red-400",
                      )}
                    />
                    <Input
                      type="time"
                      value={hour?.close_time || "21:00"}
                      onChange={(e) => updateHour(day.value, "close_time", e.target.value)}
                      className={cn(
                        "h-8 text-xs text-center px-1",
                        (hasError || hasBreakError) && "border-red-400 focus-visible:ring-red-400",
                      )}
                    />
                    <span className="text-xs text-muted-foreground text-center tabular-nums">
                      {formatDuration(totalMinutes)}
                    </span>
                  </>
                ) : (
                  <span className="col-span-3 text-xs text-muted-foreground">Fechado</span>
                )}

                {isOpen ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToAllDays(day.value)}
                    className={cn("h-7 w-7", copiedDay === day.value && "text-primary")}
                    title="Copiar para todos os dias"
                  >
                    {copiedDay === day.value ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ) : (
                  <span />
                )}
              </div>

              {isOpen && (
                <div className="ml-[2rem] pl-3 pr-1 py-1">
                  <button
                    type="button"
                    onClick={() => setExpandedBreak(isExpanded ? null : day.value)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors",
                      hasBreak
                        ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <Coffee className="h-3 w-3 shrink-0" />
                    {hasBreak ? (
                      <span className="font-medium">
                        Pausa: {hour.break_start?.slice(0, 5)} - {hour.break_end?.slice(0, 5)}
                      </span>
                    ) : (
                      <span>+ Adicionar intervalo</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-lg border bg-muted/20 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Coffee className="h-3.5 w-3.5" />
                          Intervalo / Pausa
                        </Label>
                        <Switch
                          checked={hasBreak}
                          onCheckedChange={(checked) => toggleBreak(day.value, checked)}
                          className="scale-90"
                        />
                      </div>

                      {hasBreak && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Início</Label>
                            <Input
                              type="time"
                              value={hour.break_start || DEFAULT_BREAK_START}
                              onChange={(e) => updateHour(day.value, "break_start", e.target.value)}
                              className={cn(
                                "h-8 text-xs text-center px-1",
                                hasBreakError && "border-red-400 focus-visible:ring-red-400",
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Fim</Label>
                            <Input
                              type="time"
                              value={hour.break_end || DEFAULT_BREAK_END}
                              onChange={(e) => updateHour(day.value, "break_end", e.target.value)}
                              className={cn(
                                "h-8 text-xs text-center px-1",
                                hasBreakError && "border-red-400 focus-visible:ring-red-400",
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {hasBreakError && (
                        <p className="text-[10px] text-red-600 dark:text-red-400">
                          O intervalo deve estar entre o horário de abertura e fechamento.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SettingsSaveButton
        onSave={handleSave}
        isSaving={isSavingHours}
        isSaved={saved}
        disabled={invalidOpenDays.length > 0}
        label="Salvar horários"
      />
    </div>
  );
}
