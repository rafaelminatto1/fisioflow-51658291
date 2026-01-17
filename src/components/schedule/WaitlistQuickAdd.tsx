import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Calendar, AlertCircle, User } from 'lucide-react';
import { useAddToWaitlist } from '@/hooks/useWaitlist';
import { usePatients } from '@/hooks/usePatients';
import { toast } from 'sonner';
import { PatientHelpers } from '@/types';

interface WaitlistQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  defaultPatientId?: string;
}

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const getTimeSlot = (time: string): string => {
  // Safety check for time - handle null, undefined, or empty string
  if (!time || !time.trim()) return 'morning';
  const [hour] = time.split(':').map(Number);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

export function WaitlistQuickAdd({ open, onOpenChange, date, time = '00:00', defaultPatientId = '' }: WaitlistQuickAddProps) {
  const [patientId, setPatientId] = useState(defaultPatientId);
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  const { mutate: addToWaitlist, isPending: isAdding } = useAddToWaitlist();
  const { data: patients = [] } = usePatients();

  // Update local state when prop changes
  useEffect(() => {
    if (defaultPatientId) {
      setPatientId(defaultPatientId);
    }
  }, [defaultPatientId]);

  // Safely handle potentially invalid dates
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const dayOfWeek = DAY_MAP[safeDate.getDay()];
  const timeSlot = getTimeSlot(time);

  const handleSubmit = () => {
    if (!patientId) {
      toast.error('Selecione um paciente');
      return;
    }

    addToWaitlist({
      patient_id: patientId,
      preferred_days: [dayOfWeek],
      preferred_periods: [timeSlot],
      priority,
      notes: notes || `Interesse registrado para ${format(safeDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às ${time}`,
    });

    onOpenChange(false);
    setPatientId('');
    setPriority('normal');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Adicionar à Lista de Espera
          </DialogTitle>
          <DialogDescription>
            Registrar interesse de paciente neste horário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Slot info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">
                {format(safeDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
              <span className="text-muted-foreground"> às </span>
              <span className="font-medium">{time}</span>
            </div>
          </div>

          {/* Patient Select */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => {
                  const patientName = PatientHelpers.getName(patient);
                  return (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {patientName}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <RadioGroup value={priority} onValueChange={(v) => setPriority(v as typeof priority)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="text-sm font-normal cursor-pointer">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="text-sm font-normal cursor-pointer text-orange-600">Alta</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="text-sm font-normal cursor-pointer text-red-600">Urgente</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Alguma observação sobre o interesse..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              Quando este horário ficar disponível, você receberá uma notificação para entrar em contato com o paciente.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isAdding || !patientId}>
            {isAdding ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
