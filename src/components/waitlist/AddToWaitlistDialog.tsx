import { useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAddToWaitlist, PRIORITY_CONFIG } from '@/hooks/useWaitlist';
import { Users, Calendar, Clock, AlertCircle, Loader2, BadgeCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AddToWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
}

const DAYS = [
  { value: 'MON', label: 'Segunda' },
  { value: 'TUE', label: 'Terça' },
  { value: 'WED', label: 'Quarta' },
  { value: 'THU', label: 'Quinta' },
  { value: 'FRI', label: 'Sexta' },
  { value: 'SAT', label: 'Sábado' },
];

const PERIODS = [
  { value: 'morning', label: 'Manhã', time: '08:00 - 12:00' },
  { value: 'afternoon', label: 'Tarde', time: '12:00 - 18:00' },
  { value: 'evening', label: 'Noite', time: '18:00 - 21:00' },
];

export function AddToWaitlistDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
}: AddToWaitlistDialogProps) {
  const isMobile = useIsMobile();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  const addMutation = useAddToWaitlist();

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handlePeriodToggle = (period: string) => {
    setSelectedPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0 || selectedPeriods.length === 0) {
      return;
    }

    try {
      await addMutation.mutateAsync({
        patient_id: patientId,
        preferred_days: selectedDays,
        preferred_periods: selectedPeriods,
        priority,
        notes: notes.trim() || undefined,
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setSelectedDays([]);
      setSelectedPeriods([]);
      setPriority('normal');
      setNotes('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isValid = selectedDays.length > 0 && selectedPeriods.length > 0;

  return (
    <CustomModal 
      open={open} 
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-md"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Adicionar à Lista de Espera
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure as preferências de horário para <strong>{patientName}</strong>
          </p>

          {/* Dias preferidos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              Dias preferidos
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map(day => (
                <div key={day.value} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Checkbox
                    id={`add-day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label
                    htmlFor={`add-day-${day.value}`}
                    className="text-xs font-medium cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-[10px] text-destructive animate-pulse">
                Selecione pelo menos um dia
              </p>
            )}
          </div>

          {/* Períodos preferidos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-semibold">
              <Clock className="w-4 h-4 text-primary" />
              Períodos preferidos
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {PERIODS.map(period => (
                <div key={period.value} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <Checkbox
                    id={`add-period-${period.value}`}
                    checked={selectedPeriods.includes(period.value)}
                    onCheckedChange={() => handlePeriodToggle(period.value)}
                  />
                  <Label
                    htmlFor={`add-period-${period.value}`}
                    className="text-xs font-medium cursor-pointer flex-1 flex justify-between items-center"
                  >
                    <span>{period.label}</span>
                    <span className="text-[10px] text-muted-foreground">({period.time})</span>
                  </Label>
                </div>
              ))}
            </div>
            {selectedPeriods.length === 0 && (
              <p className="text-[10px] text-destructive animate-pulse">
                Selecione pelo menos um período
              </p>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-primary" />
              Prioridade
            </Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as typeof priority)}
              className="flex gap-4"
            >
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`add-priority-${value}`} />
                  <Label
                    htmlFor={`add-priority-${value}`}
                    className="text-xs font-medium cursor-pointer"
                  >
                    {config.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="add-notes" className="font-semibold text-xs">Observações (opcional)</Label>
            <Textarea
              id="add-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prefere horários mais cedo, evitar terça-feira..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!isValid || addMutation.isPending}
          className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2"
        >
          {addMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BadgeCheck className="h-4 w-4" />
          )}
          Adicionar à Lista
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
