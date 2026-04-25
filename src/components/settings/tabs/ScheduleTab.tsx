import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Loader2 } from "lucide-react";
import { useScheduleSettings, type BusinessHour } from "@/hooks/useScheduleSettings";

// Aceitando props originais para não quebrar a página pai antes da refatoração
export function ScheduleTab(_props: any) {
  const { businessHours, isLoadingHours, upsertBusinessHours, isSavingHours, daysOfWeek } =
    useScheduleSettings();
  const [hoursState, setHoursState] = useState<Record<number, Partial<BusinessHour>>>({});

  useEffect(() => {
    if (businessHours && businessHours.length > 0) {
      const newState: Record<number, Partial<BusinessHour>> = {};
      businessHours.forEach((h) => {
        newState[h.day_of_week] = { ...h };
      });
      // Preenche faltantes
      daysOfWeek.forEach((day) => {
        if (!newState[day.value]) {
          newState[day.value] = {
            day_of_week: day.value,
            is_open: day.value >= 1 && day.value <= 5, // seg a sex aberto por padrão
            open_time: "08:00",
            close_time: "18:00",
            break_start: "12:00",
            break_end: "13:00",
          };
        }
      });
      setHoursState(newState);
    } else if (!isLoadingHours) {
      // Default
      const newState: Record<number, Partial<BusinessHour>> = {};
      daysOfWeek.forEach((day) => {
        newState[day.value] = {
          day_of_week: day.value,
          is_open: day.value >= 1 && day.value <= 5,
          open_time: "08:00",
          close_time: "18:00",
          break_start: "12:00",
          break_end: "13:00",
        };
      });
      setHoursState(newState);
    }
  }, [businessHours, isLoadingHours, daysOfWeek]);

  const handleSave = () => {
    const payload = Object.values(hoursState);
    upsertBusinessHours.mutate(payload);
  };

  const updateDay = (day: number, field: keyof BusinessHour, value: any) => {
    setHoursState((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  if (isLoadingHours) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="border-b border-border p-3 sm:p-4">
        <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Horário de Funcionamento
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Configure os horários de atendimento para que sejam refletidos corretamente na sua Agenda.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const data = hoursState[day.value] || {};
            const isOpen = data.is_open ?? false;

            return (
              <div
                key={day.value}
                className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-3 min-w-[160px]">
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(v) => updateDay(day.value, "is_open", v)}
                  />
                  <Label
                    className="font-medium cursor-pointer"
                    onClick={() => updateDay(day.value, "is_open", !isOpen)}
                  >
                    {day.label}
                  </Label>
                </div>

                {isOpen ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={data.open_time || ""}
                        onChange={(e) => updateDay(day.value, "open_time", e.target.value)}
                        className="w-[110px] h-9 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input
                        type="time"
                        value={data.close_time || ""}
                        onChange={(e) => updateDay(day.value, "close_time", e.target.value)}
                        className="w-[110px] h-9 text-sm"
                      />
                    </div>

                    <div className="hidden sm:block w-px h-6 bg-border mx-1"></div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm font-medium mr-1">Pausa:</span>
                      <Input
                        type="time"
                        value={data.break_start || ""}
                        onChange={(e) => updateDay(day.value, "break_start", e.target.value)}
                        className="w-[110px] h-9 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">-</span>
                      <Input
                        type="time"
                        value={data.break_end || ""}
                        onChange={(e) => updateDay(day.value, "break_end", e.target.value)}
                        className="w-[110px] h-9 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-sm text-muted-foreground italic px-2">Fechado</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={handleSave}
            disabled={isSavingHours}
            className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider w-full sm:w-auto"
          >
            {isSavingHours && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
