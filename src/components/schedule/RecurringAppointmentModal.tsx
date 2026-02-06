/**
 * Modal para criar/editar agendamentos recorrentes
 * @module components/schedule/RecurringAppointmentModal
 */


// =====================================================================
// TYPES
// =====================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, addWeeks, addMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, Info, Repeat, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { RecurringAppointmentFormData, RecurrenceType, RecurrenceEndType, DayOfWeek } from '@/types/recurring-appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { useActivePatients } from '@/hooks/usePatients';

interface RecurringAppointmentModalProps {
  /** Indica se o modal está aberto */
  open: boolean;
  /** Callback ao fechar o modal */
  onOpenChange: (open: boolean) => void;
  /** Dados iniciais para edição */
  initialData?: Partial<RecurringAppointmentFormData>;
  /** Callback após criar com sucesso */
  onSuccess?: (result: { id: string; recurrence: { type: string; interval?: number; daysOfWeek?: number[]; endDate?: string } }) => void;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const END_TYPES: { value: RecurrenceEndType; label: string }[] = [
  { value: 'never', label: 'Nunca' },
  { value: 'date', label: 'Em uma data específica' },
  { value: 'occurrences', label: 'Após um número de ocorrências' },
];

const WEEKDAYS: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

const APPOINTMENT_TYPES = [
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'sessao', label: 'Sessão' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'procedimento', label: 'Procedimento' },
];

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export const RecurringAppointmentModal: React.FC<RecurringAppointmentModalProps> = ({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}) => {
  // =================================================================
  // FORM STATE
  // =================================================================

  const [formData, setFormData] = useState<RecurringAppointmentFormData>(() => ({
    patient_id: initialData?.patient_id || '',
    therapist_id: initialData?.therapist_id || '',
    service_id: initialData?.service_id || '',
    room_id: initialData?.room_id || '',
    recurrence: {
      type: initialData?.recurrence?.type || 'weekly',
      interval: initialData?.recurrence?.interval || 1,
      daysOfWeek: initialData?.recurrence?.daysOfWeek || [1, 3, 5], // Seg, Qua, Sex
      dayOfMonth: initialData?.recurrence?.dayOfMonth,
      weekOfMonth: initialData?.recurrence?.weekOfMonth,
      endType: initialData?.recurrence?.endType || 'never',
      endDate: initialData?.recurrence?.endDate,
      maxOccurrences: initialData?.recurrence?.maxOccurrences,
    },
    firstDate: initialData?.firstDate || new Date(),
    time: initialData?.time || '10:00',
    duration: initialData?.duration || 60,
    type: initialData?.type || 'sessao',
    notes: initialData?.notes || '',
    auto_confirm: initialData?.auto_confirm || false,
  }));

  const { data: patients = [], isLoading: isLoadingPatients } = useActivePatients();

  // =================================================================
  // PREVIEW
  // =================================================================

  const previewDates = useMemo(() => {
    const dates = [];
    const { recurrence, firstDate } = formData;
    const { type, interval, endType, endDate, maxOccurrences } = recurrence;

    let currentDate = startOfDay(firstDate);
    const maxIterations = endType === 'occurrences' ? (maxOccurrences || 12) : 12;
    const limit = endType === 'never' ? 12 : maxIterations;

    for (let i = 0; i < limit; i++) {
      // Verificar data limite
      if (endType === 'date' && endDate && currentDate > endDate) {
        break;
      }

      // Verificar dia da semana para weekly
      if (type === 'weekly' && recurrence.daysOfWeek) {
        if (!recurrence.daysOfWeek.includes(currentDate.getDay() as number)) {
          // Avançar até o próximo dia válido
          currentDate = addDays(currentDate, 1);
          continue;
        }
      }

      dates.push(currentDate);

      // Avançar para próxima ocorrência
      switch (type) {
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
          currentDate = addMonths(currentDate, interval * 12);
          break;
      }
    }

    return dates;
  }, [formData]);

  // =================================================================
  // HANDLERS
  // =================================================================

  const handleSubmit = useCallback(async () => {
    try {
      // Validar campos obrigatórios
      if (!formData.patient_id) {
        toast({
          title: 'Campo obrigatório',
          description: 'Selecione o paciente',
          variant: 'destructive',
        });
        return;
      }

      if (previewDates.length === 0) {
        toast({
          title: 'Nenhuma ocorrência gerada',
          description: 'Verifique as configurações de recorrência',
          variant: 'destructive',
        });
        return;
      }

      // Chamar callback de sucesso
      await onSuccess?.(formData);

      onOpenChange(false);
    } catch (error) {
      logger.error('Erro ao criar série recorrente', error, 'RecurringAppointmentModal');
      toast({
        title: '❌ Erro ao criar série',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    }
  }, [formData, previewDates, onSuccess, onOpenChange]);

  const updateRecurrence = useCallback((field: string, value: string | number | boolean | number[]) => {
    setFormData((prev) => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        [field]: value,
      },
    }));
  }, []);

  const toggleDayOfWeek = useCallback((day: DayOfWeek) => {
    setFormData((prev) => {
      const days = prev.recurrence.daysOfWeek || [];
      const newDays = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort();
      return {
        ...prev,
        recurrence: {
          ...prev.recurrence,
          daysOfWeek: newDays,
        },
      };
    });
  }, []);

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Agendamento Recorrente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <Label htmlFor="patient">Paciente *</Label>
            <PatientCombobox
              patients={patients || []}
              value={formData.patient_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, patient_id: value }))}
              disabled={isLoadingPatients}
            />
          </div>

          {/* Configuração de Recorrência */}
          <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-semibold flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Configuração de Recorrência
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo de Recorrência */}
              <div className="space-y-2">
                <Label>Repetir</Label>
                <Select
                  value={formData.recurrence.type}
                  onValueChange={(value) => updateRecurrence('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intervalo */}
              <div className="space-y-2">
                <Label>A cada</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.recurrence.interval}
                    onChange={(e) => updateRecurrence('interval', parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.recurrence.type === 'weekly' ? 'semana(s)' : 'dia(s)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dias da Semana (apenas para weekly) */}
            {formData.recurrence.type === 'weekly' && (
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.recurrence.daysOfWeek?.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDayOfWeek(day.value)}
                    >
                      {day.label.substring(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Condição de Fim */}
            <div className="space-y-2">
              <Label>Termina</Label>
              <Select
                value={formData.recurrence.endType}
                onValueChange={(value) => updateRecurrence('endType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {END_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.recurrence.endType === 'date' && (
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.recurrence.endDate ? (
                        format(formData.recurrence.endDate, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.recurrence.endDate}
                      onSelect={(date) => updateRecurrence('endDate', date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {formData.recurrence.endType === 'occurrences' && (
              <div className="space-y-2">
                <Label>Número de Ocorrências</Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={formData.recurrence.maxOccurrences || ''}
                  onChange={(e) => updateRecurrence('maxOccurrences', parseInt(e.target.value) || undefined)}
                  placeholder="Ex: 12"
                />
              </div>
            )}
          </div>

          {/* Configuração do Appointment */}
          <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Configuração do Agendamento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Primeira Data */}
              <div className="space-y-2">
                <Label>Primeira Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.firstDate, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.firstDate}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, firstDate: date || new Date() }))}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Horário */}
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>

              {/* Duração */}
              <div className="space-y-2">
                <Label>Duração</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((dur) => (
                      <SelectItem key={dur.value} value={dur.value.toString()}>
                        {dur.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas ou observações para todos os agendamentos..."
              />
            </div>

            {/* Auto Confirmar */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_confirm"
                checked={formData.auto_confirm}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, auto_confirm: checked }))}
              />
              <Label htmlFor="auto_confirm" className="cursor-pointer">
                Confirmar automaticamente todos os agendamentos
              </Label>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Info className="w-4 h-4" />
                Preview das Ocorrências
              </h3>
              <span className="text-sm text-muted-foreground">
                {previewDates.length} agendamento(s)
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1">
              {previewDates.slice(0, 10).map((date, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="font-mono w-8">{index + 1}.</span>
                  <span>{format(date, 'EEEE, dd/MM/yyyy', { locale: ptBR })}</span>
                  <span className="text-muted-foreground">{formData.time}</span>
                </div>
              ))}
              {previewDates.length > 10 && (
                <div className="text-sm text-muted-foreground italic">
                  ... e mais {previewDates.length - 10} ocorrências
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          {previewDates.length > 50 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Atenção: Grande número de ocorrências
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Esta configuração gerará {previewDates.length} agendamentos. Considere reduzir o número ou adicionar uma data limite.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Série Recorrente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

RecurringAppointmentModal.displayName = 'RecurringAppointmentModal';

export default RecurringAppointmentModal;
