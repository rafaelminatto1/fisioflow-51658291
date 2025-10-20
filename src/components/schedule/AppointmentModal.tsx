import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, User, AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentBase, AppointmentFormData, AppointmentType, AppointmentStatus } from '@/types/appointment';
import { useCreateAppointment, useUpdateAppointment } from '@/hooks/useAppointments';
import { useActivePatients } from '@/hooks/usePatients';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { QuickPatientModal } from '@/components/modals/QuickPatientModal';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  date: z.date({
    required_error: 'Selecione uma data',
  }),
  time: z.string().min(1, 'Selecione um horário'),
  duration: z.number().min(15, 'Duração mínima de 15 minutos').max(240, 'Duração máxima de 4 horas'),
  type: z.string().min(1, 'Selecione o tipo de consulta'),
  status: z.string().min(1, 'Selecione o status'),
  notes: z.string().optional(),
  therapistId: z.string().optional(),
  room: z.string().optional()
});

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: AppointmentBase | null;
  defaultDate?: Date;
  defaultTime?: string;
  mode?: 'create' | 'edit' | 'view';
}

const appointmentTypes: AppointmentType[] = [
  'Consulta Inicial',
  'Fisioterapia',
  'Reavaliação',
  'Consulta de Retorno',
  'Avaliação Funcional',
  'Terapia Manual',
  'Pilates Clínico',
  'RPG',
  'Dry Needling',
  'Liberação Miofascial'
];

// Status válidos conforme constraint do banco
const appointmentStatuses = [
  'agendado',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
  'falta'
] as const;

const statusLabels: Record<string, string> = {
  'agendado': 'Agendado',
  'confirmado': 'Confirmado',
  'em_andamento': 'Em Andamento',
  'concluido': 'Concluído',
  'cancelado': 'Cancelado',
  'falta': 'Faltou'
};

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultTime,
  mode = 'create'
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictingAppointment?: AppointmentBase } | null>(null);
  const [isQuickPatientModalOpen, setIsQuickPatientModalOpen] = useState(false);
  const [quickPatientSearchTerm, setQuickPatientSearchTerm] = useState('');
  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const { data: patients = [] } = useActivePatients();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: appointment?.patientId || '',
      date: appointment?.date || defaultDate || new Date(),
      time: appointment?.time || defaultTime || '09:00',
      duration: appointment?.duration || 60,
      type: appointment?.type || 'Fisioterapia',
      status: appointment?.status || 'agendado',
      notes: appointment?.notes || '',
      priority: 'Normal'
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const watchedDate = watch('date');
  const watchedTime = watch('time');
  const watchedDuration = watch('duration');

  // TODO: Implement conflict checking logic
  // useEffect(() => {
  //   if (watchedDate && watchedTime && watchedDuration) {
  //     // Check for conflicts logic here
  //   }
  // }, [watchedDate, watchedTime, watchedDuration, appointment?.id]);

  // Generate time slots (15-minute intervals from 7:00 to 19:00)
  const timeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const handleSave = async (data: any) => {
    try {
      if (mode === 'edit' && appointment) {
        await updateAppointmentMutation.mutateAsync({ appointmentId: appointment.id, updates: data });
      } else {
        await createAppointmentMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDelete = async () => {
    if (appointment && window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      // TODO: Implement delete appointment functionality
      console.log('Delete appointment:', appointment.id);
      onClose();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmado': return 'default';
      case 'concluido': return 'secondary';
      case 'cancelado': 
      case 'falta': return 'destructive';
      case 'em_andamento': return 'default';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <DialogTitle className="flex items-center gap-3 text-xl">
            {mode === 'create' && (
              <>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <span>Novo Agendamento</span>
              </>
            )}
            {mode === 'edit' && (
              <>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <span>Editar Agendamento</span>
              </>
            )}
            {mode === 'view' && (
              <>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <span>Detalhes do Agendamento</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="p-6 space-y-6">
          {/* Patient Selection - Com Autocomplete */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-primary" />
              <Label htmlFor="patientId">Paciente *</Label>
            </div>
            <PatientCombobox
              patients={patients.map(p => ({
                id: p.id,
                name: p.name,
                incomplete_registration: p.incomplete_registration
              }))}
              value={watch('patientId')}
              onValueChange={(value) => setValue('patientId', value)}
              onCreateNew={(searchTerm) => {
                setQuickPatientSearchTerm(searchTerm);
                setIsQuickPatientModalOpen(true);
              }}
              disabled={mode === 'view'}
            />
            {errors.patientId && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.patientId.message}
              </p>
            )}
          </div>

          {/* Date and Time - Design melhorado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <Label>Data *</Label>
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background hover:bg-muted/50",
                      !watchedDate && "text-muted-foreground"
                    )}
                    disabled={mode === 'view'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedDate ? (
                      format(watchedDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      "Selecione uma data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedDate}
                    onSelect={(date) => {
                      setValue('date', date || new Date());
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Time */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-primary" />
                <Label htmlFor="time">Horário *</Label>
              </div>
              <Select
                value={watchedTime}
                onValueChange={(value) => setValue('time', value)}
                disabled={mode === 'view'}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{slot}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.time.message}
                </p>
              )}
            </div>
          </div>

          {/* Conflict Warning - Redesenhado */}
          {conflictCheck?.hasConflict && (
            <div className="flex items-start gap-3 p-4 border-2 border-destructive/30 bg-destructive/5 rounded-xl animate-fade-in">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-destructive">
                  ⚠️ Conflito de Horário Detectado
                </p>
                <p className="text-sm text-muted-foreground">
                  Já existe um agendamento neste horário com{' '}
                  <strong className="text-foreground">{conflictCheck.conflictingAppointment?.patientName}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Duration, Type, and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min) *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="240"
                step="15"
                {...register('duration', { valueAsNumber: true })}
                disabled={mode === 'view'}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as AppointmentType)}
                disabled={mode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de consulta" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              {mode === 'view' ? (
                <div className="flex items-center gap-2 h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <Badge variant={getStatusBadgeVariant(watch('status'))}>
                    {statusLabels[watch('status')] || watch('status')}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as AppointmentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {statusLabels[status]}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Additional field placeholder */}
            <div className="space-y-2">
              <Label>Configurações Adicionais</Label>
              <p className="text-sm text-muted-foreground">
                Campos adicionais serão implementados na próxima versão
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações sobre o agendamento..."
              rows={3}
              disabled={mode === 'view'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <div>
              {mode === 'edit' && appointment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Excluir
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              {mode === 'view' && appointment && (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      window.location.href = `/patient-evolution/${appointment.id}`;
                    }, 100);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Iniciar Atendimento
                </Button>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {mode === 'view' ? 'Fechar' : 'Cancelar'}
              </Button>
              
              {mode !== 'view' && (
                <Button
                  type="submit"
                  disabled={isSubmitting || conflictCheck?.hasConflict}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {mode === 'edit' ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Quick Patient Registration Modal */}
        <QuickPatientModal
          open={isQuickPatientModalOpen}
          onOpenChange={setIsQuickPatientModalOpen}
          suggestedName={quickPatientSearchTerm}
          onPatientCreated={(patientId, patientName) => {
            setValue('patientId', patientId);
            // Force re-fetch of patients list
            window.location.reload();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};