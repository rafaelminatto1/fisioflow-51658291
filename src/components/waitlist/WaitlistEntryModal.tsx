import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { usePatients } from '@/hooks/usePatients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface WaitlistEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WaitlistEntry;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda' },
  { value: 'tuesday', label: 'Terça' },
  { value: 'wednesday', label: 'Quarta' },
  { value: 'thursday', label: 'Quinta' },
  { value: 'friday', label: 'Sexta' },
  { value: 'saturday', label: 'Sábado' },
];

const TIME_SLOTS = [
  { value: 'morning', label: 'Manhã (07h-12h)' },
  { value: 'afternoon', label: 'Tarde (12h-18h)' },
  { value: 'evening', label: 'Noite (18h-21h)' },
];

export function WaitlistEntryModal({ open, onOpenChange, entry }: WaitlistEntryModalProps) {
  const [patientId, setPatientId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [priorityReason, setPriorityReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(['morning', 'afternoon']);

  const { data: patients = [] } = usePatients();
  const { addToWaitlist, updateWaitlist, isAdding, isUpdating } = useWaitlist();
  const isEditing = !!entry;
  const isPending = isAdding || isUpdating;

  useEffect(() => {
    if (entry) {
      setPatientId(entry.patient_id);
      setPriority(entry.priority);
      setPriorityReason(entry.priority_reason || '');
      setNotes(entry.notes || '');
      setSelectedDays(entry.preferred_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setSelectedTimeSlots(entry.preferred_time_slots || ['morning', 'afternoon']);
    } else {
      setPatientId('');
      setPriority('normal');
      setPriorityReason('');
      setNotes('');
      setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setSelectedTimeSlots(['morning', 'afternoon']);
    }
  }, [entry]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleTimeSlotToggle = (slot: string) => {
    setSelectedTimeSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const handleSubmit = () => {
    if (!patientId) return;

    const data = {
      patient_id: patientId,
      priority,
      priority_reason: priority !== 'normal' ? priorityReason : undefined,
      notes,
      preferred_days: selectedDays,
      preferred_time_slots: selectedTimeSlots,
    };

    if (isEditing) {
      updateWaitlist({ id: entry.id, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      addToWaitlist(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Entrada' : 'Adicionar à Lista'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados do paciente na lista de espera' : 'Adicione um paciente à lista de espera'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="patient">Paciente *</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={isEditing}>
              <SelectTrigger id="patient">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>{patient.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Dias preferidos</Label>
            <div className="grid grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox id={day.value} checked={selectedDays.includes(day.value)} onCheckedChange={() => handleDayToggle(day.value)} />
                  <label htmlFor={day.value} className="text-sm font-medium">{day.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Horários preferidos</Label>
            <div className="space-y-2">
              {TIME_SLOTS.map(slot => (
                <div key={slot.value} className="flex items-center space-x-2">
                  <Checkbox id={slot.value} checked={selectedTimeSlots.includes(slot.value)} onCheckedChange={() => handleTimeSlotToggle(slot.value)} />
                  <label htmlFor={slot.value} className="text-sm font-medium">{slot.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Prioridade</Label>
            <RadioGroup value={priority} onValueChange={(v: any) => setPriority(v)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="normal" id="normal" /><Label htmlFor="normal">Normal</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="high" id="high" /><Label htmlFor="high">Alta</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="urgent" id="urgent" /><Label htmlFor="urgent">Urgente</Label></div>
            </RadioGroup>
          </div>

          {priority !== 'normal' && (
            <div>
              <Label htmlFor="priority-reason">Motivo da Prioridade</Label>
              <Input id="priority-reason" value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} placeholder="Ex: Dor aguda" />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!patientId || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
