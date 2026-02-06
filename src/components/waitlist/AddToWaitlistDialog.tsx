import { useState } from 'react';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAddToWaitlist, PRIORITY_CONFIG } from '@/hooks/useWaitlist';
import { Users, Calendar, Clock, AlertCircle } from 'lucide-react';

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
  };

  const isValid = selectedDays.length > 0 && selectedPeriods.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Adicionar à Lista de Espera
          </DialogTitle>
          <DialogDescription>
            Configure as preferências de horário para {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dias preferidos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dias preferidos
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map(day => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label
                    htmlFor={day.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Selecione pelo menos um dia
              </p>
            )}
          </div>

          {/* Períodos preferidos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Períodos preferidos
            </Label>
            <div className="space-y-2">
              {PERIODS.map(period => (
                <div key={period.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={period.value}
                    checked={selectedPeriods.includes(period.value)}
                    onCheckedChange={() => handlePeriodToggle(period.value)}
                  />
                  <Label
                    htmlFor={period.value}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {period.label}
                    <span className="text-muted-foreground ml-2">({period.time})</span>
                  </Label>
                </div>
              ))}
            </div>
            {selectedPeriods.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Selecione pelo menos um período
              </p>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Prioridade
            </Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as typeof priority)}
              className="flex gap-4"
            >
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`priority-${value}`} />
                  <Label
                    htmlFor={`priority-${value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {config.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Prefere horários mais cedo, evitar terça-feira..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || addMutation.isPending}
          >
            {addMutation.isPending ? 'Adicionando...' : 'Adicionar à Lista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

