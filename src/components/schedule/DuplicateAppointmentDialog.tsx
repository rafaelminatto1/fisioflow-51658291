import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, CalendarIcon, Check } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { AppointmentBase } from '@/types/appointment';

interface DuplicateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentBase | null;
  onDuplicate: (config: DuplicateConfig) => void;
}

export interface DuplicateConfig {
  dates: Date[];
  keepTime: boolean;
  newTime?: string;
  keepNotes: boolean;
  keepEquipments: boolean;
  keepPaymentInfo: boolean;
}

export const DuplicateAppointmentDialog: React.FC<DuplicateAppointmentDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  onDuplicate
}) => {
  const [duplicateType, setDuplicateType] = useState<'single' | 'multiple' | 'weekly'>('single');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [weekCount, setWeekCount] = useState(4);
  const [keepTime, setKeepTime] = useState(true);
  const [newTime, setNewTime] = useState('');
  const [keepNotes, setKeepNotes] = useState(true);
  const [keepEquipments, setKeepEquipments] = useState(true);
  const [keepPaymentInfo, setKeepPaymentInfo] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDuplicate = () => {
    let dates: Date[] = [];

    if (duplicateType === 'single' && selectedDates.length > 0) {
      dates = [selectedDates[0]];
    } else if (duplicateType === 'multiple') {
      dates = selectedDates;
    } else if (duplicateType === 'weekly' && appointment) {
      const baseDate = new Date(appointment.date || appointment.appointment_date || '');
      for (let i = 1; i <= weekCount; i++) {
        dates.push(addWeeks(baseDate, i));
      }
    }

    onDuplicate({
      dates,
      keepTime,
      newTime: keepTime ? undefined : newTime,
      keepNotes,
      keepEquipments,
      keepPaymentInfo
    });

    // Reset state
    setSelectedDates([]);
    setDuplicateType('single');
    onOpenChange(false);
  };

  const timeSlots = Array.from({ length: 28 }, (_, i) => {
    const hour = 7 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Duplicar Agendamento
          </DialogTitle>
          <DialogDescription>
            Crie cópias deste agendamento para outras datas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Duplicate Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de duplicação</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'single', label: 'Data única', icon: '📅' },
                { value: 'multiple', label: 'Múltiplas datas', icon: '📆' },
                { value: 'weekly', label: 'Semanal', icon: '🔄' },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={duplicateType === option.value ? 'default' : 'outline'}
                  className="h-16 flex-col gap-1"
                  onClick={() => {
                    setDuplicateType(option.value as DuplicateType);
                    setSelectedDates([]);
                  }}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          {(duplicateType === 'single' || duplicateType === 'multiple') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {duplicateType === 'single' ? 'Selecione a nova data' : 'Selecione as datas'}
              </Label>
              
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedDates.map((date, idx) => (
                    <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {format(date, 'dd/MM', { locale: ptBR })}
                    </span>
                  ))}
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCalendar(true)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDates.length === 0 
                  ? 'Selecionar data(s)' 
                  : `${selectedDates.length} data(s) selecionada(s)`}
              </Button>
            </div>
          )}

          {/* Weekly Count */}
          {duplicateType === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Repetir por quantas semanas?</Label>
              <Select
                value={weekCount.toString()}
                onValueChange={(value) => setWeekCount(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 6, 8, 10, 12].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} semanas
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Serão criados {weekCount} agendamentos no mesmo dia da semana
              </p>
            </div>
          )}

          {/* Time Options */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="keep-time"
                checked={keepTime}
                onCheckedChange={(checked) => setKeepTime(checked as boolean)}
              />
              <Label htmlFor="keep-time" className="text-sm cursor-pointer">
                Manter mesmo horário ({appointment.time || appointment.appointment_time})
              </Label>
            </div>

            {!keepTime && (
              <div className="pl-6 space-y-2">
                <Label className="text-sm">Novo horário</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Copy Options */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Copiar também:</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-notes"
                  checked={keepNotes}
                  onCheckedChange={(checked) => setKeepNotes(checked as boolean)}
                />
                <Label htmlFor="keep-notes" className="text-sm cursor-pointer">Observações</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-equipments"
                  checked={keepEquipments}
                  onCheckedChange={(checked) => setKeepEquipments(checked as boolean)}
                />
                <Label htmlFor="keep-equipments" className="text-sm cursor-pointer">Equipamentos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-payment"
                  checked={keepPaymentInfo}
                  onCheckedChange={(checked) => setKeepPaymentInfo(checked as boolean)}
                />
                <Label htmlFor="keep-payment" className="text-sm cursor-pointer">Info de pagamento</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate}
            disabled={
              (duplicateType !== 'weekly' && selectedDates.length === 0) ||
              (!keepTime && !newTime)
            }
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {duplicateType === 'single' ? 'Selecione a data' : 'Selecione as datas'}
            </DialogTitle>
          </DialogHeader>
          {duplicateType === 'single' ? (
            <Calendar
              mode="single"
              selected={selectedDates[0]}
              onSelect={(date) => {
                setSelectedDates(date ? [date] : []);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md"
            />
          ) : (
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => {
                setSelectedDates(dates || []);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md"
            />
          )}
          <Button onClick={() => setShowCalendar(false)} className="w-full">
            <Check className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
