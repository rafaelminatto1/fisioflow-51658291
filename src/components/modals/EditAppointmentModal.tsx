import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useData } from '@/contexts/DataContext';
import { CalendarIcon, Clock, User, Phone, FileText, Trash2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface EditAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
}

export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  open,
  onOpenChange,
  appointment
}) => {
  const { patients, updateAppointment, deleteAppointment } = useData();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date>(new Date(appointment.date));
  const [time, setTime] = useState<string>(appointment.time);
  const [duration, setDuration] = useState<number>(appointment.duration);
  const [type, setType] = useState<string>(appointment.type);
  const [status, setStatus] = useState<string>(appointment.status);
  const [notes, setNotes] = useState<string>(appointment.notes || '');
  const [patientId, setPatientId] = useState<string>(appointment.patientId);

  useEffect(() => {
    setDate(new Date(appointment.date));
    setTime(appointment.time);
    setDuration(appointment.duration);
    setType(appointment.type);
    setStatus(appointment.status);
    setNotes(appointment.notes || '');
    setPatientId(appointment.patientId);
  }, [appointment]);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !time || !patientId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === patientId);
    if (!selectedPatient) {
      toast({
        title: "Erro",
        description: "Paciente não encontrado.",
        variant: "destructive"
      });
      return;
    }

    const updatedAppointment: Appointment = {
      ...appointment,
      patientId,
      patientName: selectedPatient.name,
      phone: selectedPatient.phone,
      date,
      time,
      duration,
      type: type as Appointment['type'],
      status: status as Appointment['status'],
      notes,
      updatedAt: new Date()
    };

    updateAppointment(updatedAppointment.id, updatedAppointment);
    
    toast({
      title: "Sucesso!",
      description: "Agendamento atualizado com sucesso.",
    });
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteAppointment(appointment.id);
    toast({
      title: "Agendamento removido",
      description: "O agendamento foi removido com sucesso.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Editar Agendamento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient" className="text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Paciente *
            </Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{patient.name}</span>
                      <span className="text-sm text-muted-foreground">{patient.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Data *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-background border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário *
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeSlots().map((timeSlot) => (
                    <SelectItem key={timeSlot} value={timeSlot}>
                      {timeSlot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration, Type, Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-foreground">
                Duração (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="bg-background border-border"
                min="15"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta Inicial">Consulta Inicial</SelectItem>
                  <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="Reavaliação">Reavaliação</SelectItem>
                  <SelectItem value="Consulta de Retorno">Consulta de Retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Reagendado">Reagendado</SelectItem>
                  <SelectItem value="Realizado">Realizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observações
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o agendamento..."
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-background border-border text-foreground">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-background border-border text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground hover:shadow-medical"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};