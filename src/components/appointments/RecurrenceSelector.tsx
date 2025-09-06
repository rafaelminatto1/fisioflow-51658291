import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, RotateCcw, X } from 'lucide-react';
import { format, addWeeks, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RecurrencePattern {
  type: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interval: number;
  frequency: number; // número de sessões
  endDate?: Date;
  daysOfWeek?: number[]; // para recorrência customizada
}

interface RecurrenceSelectorProps {
  value: RecurrencePattern;
  onChange: (pattern: RecurrencePattern) => void;
  baseDate: Date;
  baseTime: string;
}

export const RecurrenceSelector = ({ 
  value, 
  onChange, 
  baseDate, 
  baseTime 
}: RecurrenceSelectorProps) => {
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  // Gerar preview das datas
  useEffect(() => {
    if (value.type === 'none' || value.frequency === 0) {
      setPreviewDates([]);
      return;
    }

    const dates: Date[] = [];
    let currentDate = new Date(baseDate);
    
    for (let i = 0; i < Math.min(value.frequency, 10); i++) { // Limitar preview a 10 datas
      if (i === 0) {
        dates.push(new Date(currentDate));
      } else {
        switch (value.type) {
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
            currentDate = addDays(currentDate, value.interval || 7);
            break;
        }
        dates.push(new Date(currentDate));
      }
    }
    
    setPreviewDates(dates);
  }, [value, baseDate]);

  const handleTypeChange = (type: RecurrencePattern['type']) => {
    let newPattern: RecurrencePattern = {
      ...value,
      type,
    };

    // Definir valores padrão para cada tipo
    switch (type) {
      case 'none':
        newPattern = { type: 'none', interval: 0, frequency: 0 };
        break;
      case 'weekly':
        newPattern.interval = 1;
        newPattern.frequency = value.frequency || 4;
        break;
      case 'biweekly':
        newPattern.interval = 2;
        newPattern.frequency = value.frequency || 6;
        break;
      case 'monthly':
        newPattern.interval = 1;
        newPattern.frequency = value.frequency || 3;
        break;
      case 'custom':
        newPattern.interval = value.interval || 7;
        newPattern.frequency = value.frequency || 4;
        break;
    }

    onChange(newPattern);
  };

  const handleFrequencyChange = (frequency: number) => {
    onChange({
      ...value,
      frequency,
    });
  };

  const handleIntervalChange = (interval: number) => {
    onChange({
      ...value,
      interval,
    });
  };

  if (value.type === 'none') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <Label>Recorrência</Label>
        </div>
        <Select value={value.type} onValueChange={handleTypeChange}>
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
          <Select value={value.type} onValueChange={handleTypeChange}>
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
            value={value.frequency}
            onChange={(e) => handleFrequencyChange(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {value.type === 'custom' && (
        <div>
          <Label className="text-sm">Intervalo (dias)</Label>
          <Input
            type="number"
            min="1"
            max="365"
            value={value.interval}
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