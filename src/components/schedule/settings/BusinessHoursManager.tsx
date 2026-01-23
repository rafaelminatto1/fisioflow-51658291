import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Clock, Save, Loader2, Sun, Moon, Copy, CheckCircle2 } from 'lucide-react';
import { useScheduleSettings, BusinessHour } from '@/hooks/useScheduleSettings';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DEFAULT_HOURS: Partial<BusinessHour>[] = [
  { day_of_week: 0, is_open: false, open_time: '08:00', close_time: '18:00', break_start: undefined, break_end: undefined },
  { day_of_week: 1, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 2, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 3, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 4, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 5, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 6, is_open: true, open_time: '08:00', close_time: '13:00', break_start: undefined, break_end: undefined },
];

// Helper to convert time string to minutes
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes to time string
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export function BusinessHoursManager() {
  const { businessHours, daysOfWeek, upsertBusinessHours, isLoadingHours, isSavingHours } = useScheduleSettings();
  const [hours, setHours] = useState<Partial<BusinessHour>[]>(DEFAULT_HOURS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (businessHours.length > 0) {
      const merged = DEFAULT_HOURS.map(def => {
        const existing = businessHours.find(h => h.day_of_week === def.day_of_week);
        return existing || def;
      });
      setHours(merged);
    }
  }, [businessHours]);

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: string | boolean | Date) => {
    setHours(prev => prev.map(h =>
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    ));
    setSaved(false);
  };

  const updateOpenTime = (dayOfWeek: number, minutes: number) => {
    const time = minutesToTime(minutes);
    updateHour(dayOfWeek, 'open_time', time);
  };

  const updateCloseTime = (dayOfWeek: number, minutes: number) => {
    const time = minutesToTime(minutes);
    updateHour(dayOfWeek, 'close_time', time);
  };

  const copyToAllDays = (sourceDay: number) => {
    const source = hours.find(h => h.day_of_week === sourceDay);
    if (!source) return;

    const updated = hours.map(h =>
      h.day_of_week === sourceDay ? h : { ...h, is_open: source.is_open, open_time: source.open_time, close_time: source.close_time }
    );
    setHours(updated);
    setSaved(false);
  };

  const handleSave = () => {
    upsertBusinessHours(hours);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoadingHours) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando horários...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate time range for slider (6:00 to 23:00 = 360 to 1380 minutes)
  const minTime = 360; // 6:00
  const maxTime = 1380; // 23:00

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Clock className="h-5 w-5 text-white" />
          </div>
          Horários de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários de atendimento da clínica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          {daysOfWeek.map((day, index) => {
            const hour = hours.find(h => h.day_of_week === day.value) || DEFAULT_HOURS[day.value];
            const isOpen = hour.is_open;
            const isWeekend = day.value === 0 || day.value === 6;

            return (
              <div
                key={day.value}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200",
                  isOpen
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
                    : "bg-muted/30 border-muted"
                )}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={isOpen}
                      onCheckedChange={(checked) => updateHour(day.value, 'is_open', checked)}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-base font-semibold transition-colors",
                        isOpen ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {day.label}
                      </span>
                      {isWeekend && (
                        <Badge variant="secondary" className="text-xs">Fim de semana</Badge>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToAllDays(day.value)}
                      className="h-8 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>

                {isOpen ? (
                  <div className="space-y-4 pl-14">
                    {/* Horário de Abertura */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Sun className="h-4 w-4 text-amber-500" />
                          Abertura
                        </Label>
                        <Badge variant="outline" className="font-mono">
                          {hour.open_time || '07:00'}
                        </Badge>
                      </div>
                      <Slider
                        value={[timeToMinutes(hour.open_time || '07:00')]}
                        onValueChange={([value]) => updateOpenTime(day.value, value)}
                        min={minTime}
                        max={maxTime}
                        step={15}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:00</span>
                      </div>
                    </div>

                    {/* Horário de Fechamento */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Moon className="h-4 w-4 text-indigo-500" />
                          Fechamento
                        </Label>
                        <Badge variant="outline" className="font-mono">
                          {hour.close_time || '21:00'}
                        </Badge>
                      </div>
                      <Slider
                        value={[timeToMinutes(hour.close_time || '21:00')]}
                        onValueChange={([value]) => updateCloseTime(day.value, value)}
                        min={minTime}
                        max={maxTime}
                        step={15}
                        className="cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:00</span>
                      </div>
                    </div>

                    {/* Total de horas */}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Total de atendimento: <span className="font-semibold text-foreground">
                          {((timeToMinutes(hour.close_time || '21:00') - timeToMinutes(hour.open_time || '07:00')) / 60).toFixed(1)}h
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pl-14 py-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Fechado
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save button with success state */}
        <div className="sticky bottom-0 pt-4 bg-background/95 backdrop-blur border-t">
          <Button
            onClick={handleSave}
            disabled={isSavingHours || saved}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all",
              saved && "bg-green-600 hover:bg-green-700"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Salvo com sucesso!
              </>
            ) : isSavingHours ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Salvar Horários
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
