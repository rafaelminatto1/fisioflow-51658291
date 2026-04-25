import { addDays, addWeeks, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CalendarIcon, Clock, Copy, Package, Repeat, Zap } from "lucide-react";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AppointmentFormData, RecurringConfig, RecurringDayConfig } from "@/types/appointment";
import { AppointmentReminder, type AppointmentReminderData } from "./AppointmentReminder";
import { EquipmentSelector, type SelectedEquipment } from "./EquipmentSelector";

const premiumFieldBaseClass =
  "w-full justify-between rounded-xl border border-blue-100 bg-white px-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50/50";

const premiumFieldClass = `${premiumFieldBaseClass} h-11 text-xs sm:text-sm`;

const WEEKDAYS = [
  { value: 0, label: "Dom", short: "D" },
  { value: 1, label: "Seg", short: "S" },
  { value: 2, label: "Ter", short: "T" },
  { value: 3, label: "Qua", short: "Q" },
  { value: 4, label: "Qui", short: "Q" },
  { value: 5, label: "Sex", short: "S" },
  { value: 6, label: "Sáb", short: "S" },
];

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function generateRecurringPreview(
  startDate: Date,
  config: RecurringConfig,
): { date: Date; time: string }[] {
  if (config.days.length === 0) return [];
  const sorted = [...config.days].sort((a, b) => a.day - b.day);
  const maxSessions = config.endType === "sessions" ? config.sessions : 60;
  const endDate = config.endType === "date" && config.endDate ? parseISO(config.endDate) : null;
  const results: { date: Date; time: string }[] = [];
  const startDay = startDate.getDay();
  let weekStart = startOfDay(addDays(startDate, -startDay));
  let weeksChecked = 0;
  while (results.length < maxSessions && weeksChecked < 100) {
    for (const d of sorted) {
      const date = addDays(weekStart, d.day);
      if (isBefore(startOfDay(date), startOfDay(startDate))) continue;
      if (endDate && isAfter(startOfDay(date), startOfDay(endDate))) {
        return results;
      }
      results.push({ date, time: d.time });
      if (results.length >= maxSessions) break;
    }
    weekStart = addWeeks(weekStart, 1);
    weeksChecked++;
  }
  return results;
}

function RecurringConfigPanel({
  config,
  onChange,
  disabled,
  appointmentDate,
  appointmentTime,
}: {
  config: RecurringConfig;
  onChange: (c: RecurringConfig) => void;
  disabled: boolean;
  appointmentDate: Date;
  appointmentTime: string;
}) {
  const preview = useMemo(
    () => generateRecurringPreview(appointmentDate, config),
    [appointmentDate, config],
  );

  const toggleDay = (day: number) => {
    const exists = config.days.find((d) => d.day === day);
    if (exists) {
      onChange({ ...config, days: config.days.filter((d) => d.day !== day) });
      return;
    }

    const newDay: RecurringDayConfig = {
      day,
      time: appointmentTime || "09:00",
    };
    const newDays = [...config.days, newDay].sort((a, b) => a.day - b.day);
    onChange({ ...config, days: newDays });
  };

  const updateDayTime = (day: number, time: string) => {
    onChange({
      ...config,
      days: config.days.map((d) => (d.day === day ? { ...d, time } : d)),
    });
  };

  const endDateObj = config.endDate
    ? (() => {
        try {
          return parseISO(config.endDate);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return (
    <div className="space-y-3 rounded-[20px] border border-blue-500/15 bg-background/80 p-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.28)]">
      <div className="space-y-1.5">
        <Label className="text-[10px] sm:text-xs text-muted-foreground">Dias da semana</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((wd) => {
            const selected = config.days.some((d) => d.day === wd.value);
            return (
              <button
                key={wd.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleDay(wd.value)}
                className={cn(
                  "h-8 w-10 rounded-xl text-[11px] font-semibold border transition-all",
                  selected
                    ? "bg-blue-500 text-white border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.4)]"
                    : "bg-background text-muted-foreground border-border/60 hover:border-blue-400/60 hover:text-blue-600",
                )}
              >
                {wd.label}
              </button>
            );
          })}
        </div>
      </div>

      {config.days.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Horário por dia
          </Label>
          <div className="space-y-1.5">
            {config.days.map((d) => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="text-xs text-foreground/80 w-28 shrink-0">
                  {WEEKDAY_NAMES[d.day]}
                </span>
                <Input
                  type="time"
                  value={d.time}
                  onChange={(e) => updateDayTime(d.day, e.target.value)}
                  disabled={disabled}
                  className="h-7 w-28 text-xs rounded-xl border-border/60 focus:border-blue-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] sm:text-xs text-muted-foreground">Termina</Label>
        <RadioGroup
          value={config.endType}
          onValueChange={(v) => onChange({ ...config, endType: v as "sessions" | "date" })}
          className="space-y-1.5"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sessions" id="end-sessions" />
            <Label htmlFor="end-sessions" className="text-xs cursor-pointer">
              Após
            </Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={config.sessions}
              onChange={(e) =>
                onChange({
                  ...config,
                  sessions: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              disabled={disabled || config.endType !== "sessions"}
              className="h-7 w-16 text-xs rounded-xl border-border/60 focus:border-blue-400"
            />
            <Label htmlFor="end-sessions" className="text-xs cursor-pointer text-muted-foreground">
              sessões
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="date" id="end-date" />
            <Label htmlFor="end-date" className="text-xs cursor-pointer">
              Até a data
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || config.endType !== "date"}
                  className="h-7 text-xs rounded-xl border-border/60 px-2 gap-1"
                >
                  <CalendarIcon className="h-3 w-3" />
                  {endDateObj ? format(endDateObj, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) =>
                    onChange({
                      ...config,
                      endDate: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                  disabled={(d) => d < startOfDay(appointmentDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </RadioGroup>
      </div>

      {preview.length > 0 && (
        <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-800/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700/80 dark:text-blue-300/80">
              Preview
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-blue-400/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0"
            >
              {preview.length} sessão(ões)
            </Badge>
          </div>
          <div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
            {preview.slice(0, 10).map((item, i) => (
              <div
                key={`${item.time}-${format(item.date, "yyyy-MM-dd")}`}
                className="flex items-center gap-2 text-[11px]"
              >
                <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                <span className="text-foreground/80">
                  {format(item.date, "EEE dd/MM", { locale: ptBR })}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{item.time}</span>
              </div>
            ))}
            {preview.length > 10 && (
              <div className="text-[10px] text-muted-foreground italic pl-6">
                + {preview.length - 10} mais
              </div>
            )}
          </div>
        </div>
      )}

      {config.days.length === 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Selecione ao menos um dia da semana para habilitar a recorrência.
        </p>
      )}
    </div>
  );
}

interface AppointmentOptionsPanelProps {
  disabled: boolean;
  currentMode: string;
  selectedEquipments: SelectedEquipment[];
  setSelectedEquipments: (equipments: SelectedEquipment[]) => void;
  recurringConfig: RecurringConfig;
  setRecurringConfig: (config: RecurringConfig) => void;
  reminders: AppointmentReminderData[];
  setReminders: (reminders: AppointmentReminderData[]) => void;
  onDuplicate?: () => void;
}

export function AppointmentOptionsPanel({
  disabled,
  currentMode,
  selectedEquipments,
  setSelectedEquipments,
  recurringConfig,
  setRecurringConfig,
  reminders,
  setReminders,
  onDuplicate,
}: AppointmentOptionsPanelProps) {
  const { watch, setValue } = useFormContext<AppointmentFormData>();
  const isRecurring = watch("is_recurring");
  const appointmentDateStr = watch("appointment_date");
  const appointmentTime = watch("appointment_time");

  const appointmentDate = useMemo(() => {
    if (!appointmentDateStr) return new Date();
    try {
      return parseISO(appointmentDateStr);
    } catch {
      return new Date();
    }
  }, [appointmentDateStr]);

  return (
    <div className="mt-0 space-y-3 sm:space-y-4">
      <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              Equipamentos
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Marque os recursos usados ou reservados para esta sessão.
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600"
          >
            {selectedEquipments.length > 0
              ? `${selectedEquipments.length} selecionados`
              : "Opcional"}
          </Badge>
        </div>
        <EquipmentSelector
          selectedEquipments={selectedEquipments}
          onSelectionChange={setSelectedEquipments}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-blue-600" />
              <Label
                htmlFor="is_recurring"
                className="text-xs sm:text-sm font-medium cursor-pointer text-blue-900"
              >
                Agendamento Recorrente
              </Label>
              {isRecurring && (
                <Badge
                  variant="outline"
                  className="rounded-full border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700"
                >
                  {recurringConfig.days.length > 0
                    ? recurringConfig.days.map((d) => WEEKDAYS[d.day]?.label).join("+")
                    : "Semanal"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isRecurring && recurringConfig.days.length > 0
                ? `${recurringConfig.endType === "sessions" ? `${recurringConfig.sessions} sessões` : "até a data"} · ${recurringConfig.days.length} dia(s)/semana`
                : "Crie múltiplas sessões de uma vez (ex: 10 sessões, seg + qua + sex)."}
            </p>
          </div>
          <Switch
            id="is_recurring"
            checked={Boolean(isRecurring)}
            onCheckedChange={(checked) => setValue("is_recurring", Boolean(checked))}
            disabled={disabled}
            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
          />
        </div>

        {isRecurring && (
          <RecurringConfigPanel
            config={recurringConfig}
            onChange={setRecurringConfig}
            disabled={disabled}
            appointmentDate={appointmentDate}
            appointmentTime={appointmentTime || ""}
          />
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
              <Bell className="h-3.5 w-3.5 text-blue-500" />
              Lembretes
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Programe avisos rápidos para evitar faltas e atrasos.
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600"
          >
            {reminders.length > 0 ? `${reminders.length} ativos` : "Opcional"}
          </Badge>
        </div>
        <AppointmentReminder
          disabled={disabled}
          reminders={reminders}
          onRemindersChange={setReminders}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div>
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
            <Package className="h-3.5 w-3.5 text-blue-500" />
            Sala
          </Label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Defina onde o atendimento acontecerá.
          </p>
        </div>
        <Select
          value={watch("room") || ""}
          onValueChange={(value) => setValue("room", value)}
          disabled={disabled}
        >
          <SelectTrigger className={cn(premiumFieldClass, "text-sm border-blue-100")}>
            <SelectValue placeholder="Selecione a sala" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-blue-100">
            <SelectItem value="sala-1">🚪 Sala 01</SelectItem>
            <SelectItem value="sala-2">🚪 Sala 02</SelectItem>
            <SelectItem value="sala-3">🚪 Sala 03</SelectItem>
            <SelectItem value="pilates">🧘 Sala Pilates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {currentMode === "edit" && onDuplicate && (
        <Button
          type="button"
          variant="outline"
          onClick={onDuplicate}
          className="w-full justify-start gap-2 h-11 rounded-xl border-blue-100 text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicar Agendamento</span>
        </Button>
      )}
    </div>
  );
}
