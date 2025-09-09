import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, RotateCcw, X } from 'lucide-react';
import { format, addWeeks, addDays, addMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RecurrencePattern as AppointmentRecurrencePattern, DayOfWeek } from '@/types/appointment';

// Legacy interface for backward compatibility
export interface RecurrencePattern {
  type: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval: number;
  frequency: number; // número de sessões
  endDate?: Date;
  daysOfWeek?: number[]; // para recorrência customizada
}

interface RecurrenceSelectorProps {
  value?: RecurrencePattern | AppointmentRecurrencePattern;
  onChange: (pattern: RecurrencePattern | AppointmentRecurrencePattern) => void;
  baseDate?: Date;
  baseTime?: string;
}

export const RecurrenceSelector = ({ 
  value, 
  onChange, 
  baseDate = new Date(), 
  baseTime = '09:00'
}: RecurrenceSelectorProps) => {
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  // Determine if we're using the new or legacy pattern format
  const isNewPattern = value && 'type' in value && 
    ['Daily', 'Weekly', 'Monthly', 'Custom'].includes(value.type as string);

  // Convert to internal format for consistency
  const currentPattern = useMemo(() => value ? (isNewPattern ? {
    type: value.type === 'Daily' ? 'custom' : 
          value.type === 'Weekly' ? 'weekly' :
          value.type === 'Monthly' ? 'monthly' : 'custom',
    interval: (value as AppointmentRecurrencePattern).frequency || 1,
    frequency: (value as AppointmentRecurrencePattern).maxOccurrences || 4,
    endDate: (value as AppointmentRecurrencePattern).endDate,
    daysOfWeek: (value as AppointmentRecurrencePattern).daysOfWeek?.map(day => {
      const dayMap: Record<DayOfWeek, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      return dayMap[day];
    }) || []
  } as RecurrencePattern : value as RecurrencePattern) : {
    type: 'none' as const,
    interval: 0,
    frequency: 0
  }, [value, isNewPattern]);

  // Gerar preview das datas
  useEffect(() => {
    if (!currentPattern || currentPattern.type === 'none' || currentPattern.frequency === 0) {
      setPreviewDates([]);
      return;
    }

    const dates: Date[] = [];
    let currentDate = new Date(baseDate);
    
    for (let i = 0; i < Math.min(currentPattern.frequency, 10); i++) { // Limitar preview a 10 datas
      if (i === 0) {
        dates.push(new Date(currentDate));
      } else {
        switch (currentPattern.type) {
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            currentDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, 1);
            break;
          case 'custom':
            currentDate = addDays(currentDate, currentPattern.interval || 7);
            break;
        }
        dates.push(new Date(currentDate));
      }
    }
    
    setPreviewDates(dates);
  }, [currentPattern, baseDate]);

  const handleTypeChange = (type: RecurrencePattern['type']) => {
    let newPattern: RecurrencePattern = {
      ...currentPattern,
      type,
    };

    // Definir valores padrão para cada tipo
    switch (type) {
      case 'none':
        newPattern = { type: 'none', interval: 0, frequency: 0 };
        break;
      case 'weekly':
        newPattern.interval = 1;
        newPattern.frequency = currentPattern.frequency || 4;
        break;
      case 'biweekly':
        newPattern.interval = 2;
        newPattern.frequency = currentPattern.frequency || 6;
        break;
      case 'monthly':
        newPattern.interval = 1;
        newPattern.frequency = currentPattern.frequency || 3;
        break;
      case 'custom':
        newPattern.interval = currentPattern.interval || 7;
        newPattern.frequency = currentPattern.frequency || 4;
        break;
    }

    // Convert to new pattern format if needed
    if (isNewPattern || type === 'none') {
      const convertedPattern: AppointmentRecurrencePattern = {
        type: type === 'weekly' ? 'Weekly' :
              type === 'biweekly' ? 'Weekly' :
              type === 'monthly' ? 'Monthly' :
              type === 'custom' ? 'Custom' : 'Weekly',
        frequency: type === 'biweekly' ? 2 : newPattern.interval,
        maxOccurrences: newPattern.frequency,
        endDate: newPattern.endDate,
        daysOfWeek: newPattern.daysOfWeek ? newPattern.daysOfWeek.map(day => {
          const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return dayNames[day];
        }) : undefined
      };
      
      if (type === 'none') {
        onChange(undefined);
      } else {
        onChange(convertedPattern);
      }
    } else {
      onChange(newPattern);
    }
  };

  const handleFrequencyChange = (frequency: number) => {
    if (isNewPattern) {
      onChange({
        ...(value as AppointmentRecurrencePattern),
        maxOccurrences: frequency,
      });
    } else {
      onChange({
        ...currentPattern,
        frequency,
      });
    }
  };

  const handleIntervalChange = (interval: number) => {
    if (isNewPattern) {
      onChange({
        ...(value as AppointmentRecurrencePattern),
        frequency: interval,
      });
    } else {
      onChange({
        ...currentPattern,
        interval,
      });
    }
  };

  if (currentPattern.type === 'none') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <Label>Recorrência</Label>
        </div>
        <Select value={currentPattern.type} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Agendamento único</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="biweekly">Quinzenal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4" />
        <Label>Configurar Recorrência</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleTypeChange('none')}
          className="ml-auto h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Tipo</Label>
          <Select value={currentPattern.type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="biweekly">Quinzenal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Número de sessões</Label>
          <Input
            type="number"
            min="1"
            max="52"
            value={currentPattern.frequency}
            onChange={(e) => handleFrequencyChange(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {currentPattern.type === 'custom' && (
        <div>
          <Label className="text-sm">Intervalo (dias)</Label>
          <Input
            type="number"
            min="1"
            max="365"
            value={currentPattern.interval}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 7)}
          />
        </div>
      )}

      {/* Preview das datas */}
      {previewDates.length > 0 && (
        <Card className="bg-muted/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview dos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {previewDates.map((date, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {format(date, 'dd/MM/yyyy', { locale: ptBR })} - {baseTime}
                </Badge>
              ))}
              {value.frequency > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{value.frequency - 10} mais...
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {value.frequency} sessões programadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};