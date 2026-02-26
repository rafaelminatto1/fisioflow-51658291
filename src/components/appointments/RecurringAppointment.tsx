/**
 * RecurringAppointment - Agendamentos recorrentes
 *
 * Features:
 * - Recorrência diária, semanal, mensal, anual
 * - Personalização de intervalo
 * - Exceções (datas específicas)
 * - Limitação de ocorrências
 * - Preview do calendário
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Repeat, CalendarClock, Check, X } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears, format, isSameDay, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

interface RecurringAppointmentConfig {
  startDate: Date;
  recurrenceType: RecurrenceType;
  interval?: number; // A cada X dias/semanas/meses/anos
  weekdays?: Weekday[]; // Para recorrência semanal
  dayOfMonth?: number; // Para recorrência mensal (1-31)
  endDate?: Date | null;
  maxOccurrences?: number | null;
  excludeDates?: Date[];
}

interface RecurringAppointmentProps {
  config: RecurringAppointmentConfig;
  onChange: (config: RecurringAppointmentConfig) => void;
  disabled?: boolean;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const RecurringAppointment: React.FC<RecurringAppointmentProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  // Calcular próximas datas baseadas na recorrência
  const occurrences = useMemo(() => {
    if (config.recurrenceType === 'once') return [config.startDate];

    const dates: Date[] = [];
    let currentDate = new Date(config.startDate);
    const interval = config.interval || 1;

    while (dates.length < 10) {
      // Verificar se passou data final ou máximo de ocorrências
      if (config.endDate && currentDate > config.endDate) break;
      if (config.maxOccurrences && dates.length >= config.maxOccurrences) break;

      // Adicionar data se não estiver na lista de exclusão
      const isExcluded = config.excludeDates?.some(d => isSameDay(d, currentDate));
      if (!isExcluded) {
        dates.push(new Date(currentDate));
      }

      // Próxima data
      switch (config.recurrenceType) {
        case 'daily':
          currentDate = addDays(currentDate, interval);
          break;
        case 'weekly':
          if (config.weekdays && config.weekdays.length > 0) {
            // Encontrar próximo dia da semana
            let added = false;
            for (let i = 1; i <= 7 && !added; i++) {
              const nextDay = addDays(currentDate, i * interval);
              const dayOfWeek = nextDay.getDay() as Weekday;
              if (config.weekdays?.includes(dayOfWeek)) {
                currentDate = nextDay;
                added = true;
              }
            }
          } else {
            currentDate = addWeeks(currentDate, interval);
          }
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, interval);
          if (config.dayOfMonth) {
            currentDate.setDate(config.dayOfMonth);
          }
          break;
        case 'yearly':
          currentDate = addYears(currentDate, interval);
          break;
      }
    }

    return dates;
  }, [config]);

  // Calcular resumo
  const summary = useMemo(() => {
    if (config.recurrenceType === 'once') {
      return 'Acontece uma vez';
    }

    const intervalText = config.interval && config.interval > 1 ? `a cada ${config.interval}` : '';
    const recurrenceText = {
      daily: intervalText ? `${intervalText} dias` : 'diariamente',
      weekly: intervalText ? `${intervalText} semanas` : 'semanalmente',
      monthly: intervalText ? `${intervalText} meses` : 'mensalmente',
      yearly: intervalText ? `${intervalText} anos` : 'anualmente',
    }[config.recurrenceType];

    let details = recurrenceText;

    if (config.weekdays && config.weekdays.length > 0) {
      const dayNames = config.weekdays.map(d => WEEKDAY_LABELS[d]).join(', ');
      details += ` (${dayNames})`;
    }

    if (config.endDate) {
      details += ` até ${format(config.endDate, "dd/MM/yyyy", { locale: ptBR })}`;
    }

    if (config.maxOccurrences) {
      details += ` (${config.maxOccurrences} ocorrências)`;
    }

    return details.charAt(0).toUpperCase() + details.slice(1);
  }, [config]);

  const handleRecurrenceTypeChange = (type: RecurrenceType) => {
    onChange({ ...config, recurrenceType: type });
  };

  const handleIntervalChange = (value: number) => {
    onChange({ ...config, interval: value });
  };

  const handleWeekdayToggle = (day: Weekday) => {
    const weekdays = config.weekdays || [];
    const newWeekdays = weekdays.includes(day)
      ? weekdays.filter(d => d !== day)
      : [...weekdays, day];
    onChange({ ...config, weekdays: newWeekdays });
  };

  const handleDayOfMonthChange = (value: number) => {
    onChange({ ...config, dayOfMonth: value });
  };

  const handleEndDateChange = (date: Date | null) => {
    onChange({ ...config, endDate: date });
  };

  const handleMaxOccurrencesChange = (value: number | null) => {
    onChange({ ...config, maxOccurrences: value });
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
        <Repeat className="w-5 h-5 text-primary" />
        <span className="font-medium">{summary}</span>
      </div>

      {/* Tipo de recorrência */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Repetir</label>
        <div className="grid grid-cols-5 gap-2">
          {(['once', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleRecurrenceTypeChange(type)}
              disabled={disabled}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                config.recurrenceType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {type === 'once' && <CalendarClock className="w-4 h-4 mx-auto mb-1" />}
              {type === 'daily' && <Calendar className="w-4 h-4 mx-auto mb-1" />}
              {type === 'weekly' && <Repeat className="w-4 h-4 mx-auto mb-1" />}
              {type === 'monthly' && <CalendarClock className="w-4 h-4 mx-auto mb-1" />}
              {type === 'yearly' && <Calendar className="w-4 h-4 mx-auto mb-1" />}
              <span className="capitalize block">
                {type === 'once' ? 'Uma vez' :
                 type === 'daily' ? 'Diário' :
                 type === 'weekly' ? 'Semanal' :
                 type === 'monthly' ? 'Mensal' : 'Anual'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Configurações específicas por tipo */}
      {config.recurrenceType !== 'once' && (
        <div className="space-y-4">
          {/* Intervalo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Intervalo ({config.recurrenceType === 'weekly' ? 'semanas' : config.recurrenceType === 'monthly' ? 'meses' : config.recurrenceType === 'yearly' ? 'anos' : 'dias'})
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.interval || 1}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="w-full px-4 py-2 rounded-lg border bg-background"
            />
          </div>

          {/* Dias da semana (para recorrência semanal) */}
          {config.recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias da semana</label>
              <div className="flex gap-2">
                {WEEKDAY_LABELS.map((label, i) => {
                  const isSelected = config.weekdays?.includes(i as Weekday);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleWeekdayToggle(i as Weekday)}
                      disabled={disabled}
                      className={cn(
                        'w-10 h-10 rounded-lg font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dia do mês (para recorrência mensal) */}
          {config.recurrenceType === 'monthly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Dia do mês</label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayOfMonthChange(day)}
                    disabled={disabled}
                    className={cn(
                      'w-10 h-10 rounded-lg text-sm font-medium transition-all',
                      config.dayOfMonth === day
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data de término */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Data de término</label>
        <input
          type="date"
          value={config.endDate ? format(config.endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => handleEndDateChange(e.target.value ? new Date(e.target.value) : null)}
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border bg-background"
          min={format(config.startDate, 'yyyy-MM-dd')}
        />
      </div>

      {/* Máximo de ocorrências */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Número máximo de ocorrências</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="365"
            value={config.maxOccurrences || ''}
            onChange={(e) => handleMaxOccurrencesChange(e.target.value ? parseInt(e.target.value) || 1 : null)}
            disabled={disabled}
            className="flex-1 px-4 py-2 rounded-lg border bg-background"
            placeholder="Sem limite"
          />
          {config.maxOccurrences && (
            <button
              type="button"
              onClick={() => handleMaxOccurrencesChange(null)}
              disabled={disabled}
              className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview do calendário */}
      {config.recurrenceType !== 'once' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Próximas ocorrências</label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {occurrences.map((date, i) => (
              <div
                key={i}
                className={cn(
                  'p-2 rounded-lg text-center text-sm',
                  isWeekend(date) && 'bg-muted/30'
                )}
              >
                <div className="font-medium">{format(date, 'dd')}</div>
                <div className="text-xs text-muted-foreground">{format(date, 'MMM', { locale: ptBR })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

RecurringAppointment.displayName = 'RecurringAppointment';

// ============================================================================
// HOOK DE AGENDAMENTO RECORRENTE
// ============================================================================

export const useRecurringAppointments = () => {
  const generateOccurrences = useCallback((config: RecurringAppointmentConfig): Date[] => {
    if (config.recurrenceType === 'once') return [config.startDate];

    const dates: Date[] = [];
    let currentDate = new Date(config.startDate);
    const interval = config.interval || 1;

    while (true) {
      if (config.endDate && currentDate > config.endDate) break;
      if (config.maxOccurrences && dates.length >= config.maxOccurrences) break;

      const isExcluded = config.excludeDates?.some(d => isSameDay(d, currentDate));
      if (!isExcluded) {
        dates.push(new Date(currentDate));
      }

      switch (config.recurrenceType) {
        case 'daily':
          currentDate = addDays(currentDate, interval);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, interval);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, interval);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, interval);
          break;
      }
    }

    return dates;
  }, []);

  return { generateOccurrences };
};

// ============================================================================
// MODAL DE AGENDAMENTO RECORRENTE
// ============================================================================

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: RecurringAppointmentConfig) => void;
  initialDate?: Date;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate = new Date(),
}) => {
  const [config, setConfig] = useState<RecurringAppointmentConfig>({
    startDate: initialDate,
    recurrenceType: 'once',
    interval: 1,
    weekdays: [],
    endDate: null,
    maxOccurrences: null,
    excludeDates: [],
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Agendamento Recorrente</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <RecurringAppointment
            config={config}
            onChange={setConfig}
          />
        </div>

        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(config)}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
