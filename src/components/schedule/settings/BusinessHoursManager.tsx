import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { Clock, Save, Loader2 } from 'lucide-react';
import { useScheduleSettings, BusinessHour } from '@/hooks/useScheduleSettings';

const DEFAULT_HOURS: Partial<BusinessHour>[] = [
  { day_of_week: 0, is_open: false, open_time: '08:00', close_time: '18:00', break_start: undefined, break_end: undefined },
  { day_of_week: 1, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 2, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 3, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 4, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 5, is_open: true, open_time: '07:00', close_time: '21:00', break_start: undefined, break_end: undefined },
  { day_of_week: 6, is_open: true, open_time: '08:00', close_time: '13:00', break_start: undefined, break_end: undefined },
];

export function BusinessHoursManager() {
  const { businessHours, daysOfWeek, upsertBusinessHours, isLoadingHours, isSavingHours } = useScheduleSettings();
  const [hours, setHours] = useState<Partial<BusinessHour>[]>(DEFAULT_HOURS);

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
  };

  const handleSave = () => {
    upsertBusinessHours(hours);
  };

  if (isLoadingHours) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários de atendimento da clínica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const hour = hours.find(h => h.day_of_week === day.value) || DEFAULT_HOURS[day.value];
            return (
              <div key={day.value} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="w-32 flex items-center gap-2">
                  <Switch
                    checked={hour.is_open}
                    onCheckedChange={(checked) => updateHour(day.value, 'is_open', checked)}
                  />
                  <span className={`text-sm font-medium ${!hour.is_open ? 'text-muted-foreground' : ''}`}>
                    {day.label.substring(0, 3)}
                  </span>
                </div>
                
                {hour.is_open ? (
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Abertura</Label>
                      <Input
                        type="time"
                        value={hour.open_time || '07:00'}
                        onChange={(e) => updateHour(day.value, 'open_time', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Fechamento</Label>
                      <Input
                        type="time"
                        value={hour.close_time || '21:00'}
                        onChange={(e) => updateHour(day.value, 'close_time', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Início Intervalo</Label>
                      <Input
                        type="time"
                        value={hour.break_start || ''}
                        onChange={(e) => updateHour(day.value, 'break_start', e.target.value || null)}
                        className="h-8"
                        placeholder="--:--"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Fim Intervalo</Label>
                      <Input
                        type="time"
                        value={hour.break_end || ''}
                        onChange={(e) => updateHour(day.value, 'break_end', e.target.value || null)}
                        className="h-8"
                        placeholder="--:--"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Fechado</span>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={handleSave} disabled={isSavingHours} className="w-full">
          {isSavingHours ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Horários
        </Button>
      </CardContent>
    </Card>
  );
}