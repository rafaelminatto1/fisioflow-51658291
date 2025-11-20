import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, User, AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentBase, AppointmentFormData, AppointmentType, AppointmentStatus } from '@/types/appointment';
import { useCreateAppointment, useUpdateAppointment, useAppointments } from '@/hooks/useAppointments';
import { useActivePatients } from '@/hooks/usePatients';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { QuickPatientModal } from '@/components/modals/QuickPatientModal';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { toast } from '@/hooks/use-toast';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  appointment_date: z.date({
    required_error: 'Selecione uma data',
  }),
  appointment_time: z.string().min(1, 'Selecione um horário'),
  duration: z.number().min(15, 'Duração mínima de 15 minutos').max(240, 'Duração máxima de 4 horas'),
  type: z.string().min(1, 'Selecione o tipo de consulta'),
  status: z.string().min(1, 'Selecione o status'),
  notes: z.string().optional(),
  therapist_id: z.string().optional(),
  room: z.string().optional(),
  payment_status: z.enum(['pending', 'paid', 'package']).default('pending'),
  payment_amount: z.number().min(0).optional(),
  session_package_id: z.string().uuid().optional(),
  is_recurring: z.boolean().default(false),
  recurring_until: z.date().optional(),
}).refine((data) => {
  if (data.is_recurring && !data.recurring_until) {
    return false;
  }
  return true;
}, {
  message: 'Selecione a data final da recorrência',
  path: ['recurring_until']
});

type AppointmentSchemaType = z.infer<typeof appointmentSchema>;

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

const appointmentStatuses = [
  'agendado',
  'confirmado',
  'aguardando_confirmacao',
  'em_andamento',
  'em_espera',
  'atrasado',
  'concluido',
  'remarcado',
  'cancelado',
  'falta'
] as const;

const statusLabels: Record<string, string> = {
  'agendado': 'Agendado',
  'confirmado': 'Confirmado',
  'aguardando_confirmacao': 'Aguardando Confirmação',
  'em_andamento': 'Em Andamento',
  'em_espera': 'Em Espera',
  'atrasado': 'Atrasado',
  'concluido': 'Concluído',
  'remarcado': 'Remarcado',
  'cancelado': 'Cancelado',
  'falta': 'Não Compareceu'
};

const statusColors: Record<string, string> = {
  'agendado': 'bg-gradient-to-r from-blue-500 to-blue-600',
  'confirmado': 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  'aguardando_confirmacao': 'bg-gradient-to-r from-amber-500 to-amber-600',
  'em_andamento': 'bg-gradient-to-r from-cyan-500 to-cyan-600',
  'em_espera': 'bg-gradient-to-r from-indigo-500 to-indigo-600',
  'atrasado': 'bg-gradient-to-r from-yellow-500 to-yellow-600',
  'concluido': 'bg-gradient-to-r from-purple-500 to-purple-600',
  'remarcado': 'bg-gradient-to-r from-orange-500 to-orange-600',
  'cancelado': 'bg-gradient-to-r from-red-500 to-red-600',
  'falta': 'bg-gradient-to-r from-rose-500 to-rose-600'
};

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultTime,
  mode: initialMode = 'create'
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRecurringCalendarOpen, setIsRecurringCalendarOpen] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictingAppointment?: AppointmentBase; conflictCount?: number } | null>(null);
  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view'>(initialMode);
  const { mutate: createAppointmentMutation, isPending: isCreating } = useCreateAppointment();
  const { mutate: updateAppointmentMutation, isPending: isUpdating } = useUpdateAppointment();
  const { data: activePatients, isLoading: patientsLoading } = useActivePatients();
  const { data: appointments = [] } = useAppointments();
  const { getCapacityForTime } = useScheduleCapacity();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<AppointmentSchemaType>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: (appointment as any)?.patient_id || '',
      appointment_date: (appointment as any)?.appointment_date ? new Date((appointment as any).appointment_date) : (defaultDate || new Date()),
      appointment_time: (appointment as any)?.appointment_time || defaultTime || '',
      duration: appointment?.duration || 60,
      type: appointment?.type || 'Fisioterapia',
      status: appointment?.status || 'agendado',
      notes: appointment?.notes || '',
      therapist_id: (appointment as any)?.therapist_id || undefined,
      room: (appointment as any)?.room || undefined,
      payment_status: 'pending',
      payment_amount: undefined,
      session_package_id: undefined,
      is_recurring: false,
      recurring_until: undefined,
    },
  });

  useEffect(() => {
    if (appointment && isOpen) {
      const apt = appointment as any;
      setValue('patient_id', apt.patient_id);
      setValue('appointment_date', apt.appointment_date ? new Date(apt.appointment_date) : new Date());
      setValue('appointment_time', apt.appointment_time);
      setValue('duration', appointment.duration || 60);
      setValue('type', appointment.type || 'Fisioterapia');
      setValue('status', appointment.status || 'agendado');
      setValue('notes', appointment.notes || '');
      setValue('therapist_id', apt.therapist_id);
      setValue('room', apt.room || undefined);
      setValue('payment_status', 'pending');
      setValue('payment_amount', undefined);
      setValue('session_package_id', undefined);
      setValue('is_recurring', false);
      setValue('recurring_until', undefined);
    } else {
      reset({
        patient_id: '',
        appointment_date: defaultDate || new Date(),
        appointment_time: defaultTime || '',
        duration: 60,
        type: 'Fisioterapia',
        status: 'agendado',
        notes: '',
        payment_status: 'pending',
        is_recurring: false,
      });
    }
    setCurrentMode(initialMode);
  }, [appointment, isOpen, defaultDate, defaultTime, initialMode, setValue, reset]);

  const watchedDate = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');

  useEffect(() => {
    if (watchedDate && watchedTime && watchedDuration) {
      const result = checkAppointmentConflict({
        date: watchedDate,
        time: watchedTime,
        duration: watchedDuration,
        excludeId: appointment?.id,
        appointments: appointments
      });
      setConflictCheck(result);
    }
  }, [watchedDate, watchedTime, watchedDuration, appointment?.id, appointments]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 7; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const handleSave = async (data: AppointmentSchemaType) => {
    try {
      const dateStr = format(data.appointment_date, 'yyyy-MM-dd');

      const formData: AppointmentFormData = {
        patient_id: data.patient_id,
        appointment_date: dateStr,
        appointment_time: data.appointment_time,
        duration: data.duration,
        type: data.type as AppointmentType,
        status: data.status as AppointmentStatus,
        notes: data.notes || null,
        therapist_id: data.therapist_id || null,
        room: data.room || null,
        payment_status: data.payment_status,
        payment_amount: data.payment_amount || null,
        session_package_id: data.session_package_id || null,
        is_recurring: data.is_recurring,
        recurring_until: data.recurring_until ? format(data.recurring_until, 'yyyy-MM-dd') : null,
      };

      if (currentMode === 'edit' && appointment) {
        updateAppointmentMutation({
          appointmentId: appointment.id,
          updates: formData
        },
          {
            onSuccess: () => {
              toast({
                title: 'Agendamento atualizado',
                description: 'As alterações foram salvas com sucesso.',
              });
              onClose();
            },
            onError: (error: Error) => {
              toast({
                title: 'Erro ao atualizar',
                description: error.message,
                variant: 'destructive'
              });
            }
          }
        );
      } else {
        createAppointmentMutation(formData, {
          onSuccess: () => {
            toast({
              title: 'Agendamento criado',
              description: 'O agendamento foi criado com sucesso.',
            });
            onClose();
          },
          onError: (error: Error) => {
            toast({
              title: 'Erro ao criar',
              description: error.message,
              variant: 'destructive'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o agendamento.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = () => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A exclusão de agendamentos estará disponível em breve.',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    return statusColors[status] || 'bg-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
        <DialogHeader className="pb-4 border-b space-y-2 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-medical">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {currentMode === 'create' ? 'Novo Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Detalhes do Agendamento'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {currentMode === 'create' ? 'Preencha os dados para criar um novo agendamento' : 
             currentMode === 'edit' ? 'Atualize os dados do agendamento' :
             'Visualize as informações do agendamento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6 pt-4 overflow-y-auto flex-1 pr-2">
          {/* Patient Selection */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-primary" />
              <Label>Paciente *</Label>
            </div>
            <PatientCombobox
              patients={activePatients || []}
              value={watch('patient_id')}
              onValueChange={(value) => setValue('patient_id', value)}
              onCreateNew={() => setQuickPatientModalOpen(true)}
              disabled={currentMode === 'view' || patientsLoading}
            />
            {errors.patient_id && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.patient_id.message}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    disabled={currentMode === 'view'}
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
                      setValue('appointment_date', date || new Date());
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.appointment_date && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.appointment_date.message}
                </p>
              )}
            </div>

            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-primary" />
                <Label>Horário *</Label>
              </div>
              <Select
                value={watchedTime}
                onValueChange={(value) => setValue('appointment_time', value)}
                disabled={currentMode === 'view'}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.appointment_time && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.appointment_time.message}
                </p>
              )}
            </div>
          </div>

          {/* Capacity Warning */}
          {watchedDate && watchedTime && (() => {
            const dayOfWeek = watchedDate.getDay();
            const maxCapacity = getCapacityForTime(dayOfWeek, watchedTime);
            const conflictCount = conflictCheck?.conflictCount || 0;
            const exceedsCapacity = conflictCount >= maxCapacity;
            
            return (conflictCount > 0 || exceedsCapacity) && (
              <div className={cn(
                "flex items-start gap-3 p-4 border-2 rounded-xl animate-fade-in",
                exceedsCapacity 
                  ? "border-amber-500/30 bg-amber-500/5" 
                  : "border-blue-500/30 bg-blue-500/5"
              )}>
                <div className={cn(
                  "p-2 rounded-lg",
                  exceedsCapacity ? "bg-amber-500/10" : "bg-blue-500/10"
                )}>
                  <AlertTriangle className={cn(
                    "w-5 h-5 flex-shrink-0",
                    exceedsCapacity ? "text-amber-600" : "text-blue-600"
                  )} />
                </div>
                <div className="space-y-1 flex-1">
                  <p className={cn(
                    "text-sm font-semibold",
                    exceedsCapacity ? "text-amber-600" : "text-blue-600"
                  )}>
                    {exceedsCapacity ? '⚠️ Capacidade Excedida' : 'ℹ️ Horário em Uso'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {conflictCount} de {maxCapacity} paciente(s) agendado(s) neste horário.
                    {exceedsCapacity && ' Capacidade máxima atingida!'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Duration, Type, and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min) *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="240"
                step="15"
                {...register('duration', { valueAsNumber: true })}
                disabled={currentMode === 'view'}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as AppointmentType)}
                disabled={currentMode === 'view'}
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

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              {currentMode === 'view' ? (
                <div className="flex items-center gap-2 h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <Badge className={cn("text-white shadow-lg", getStatusBadgeVariant(watch('status')))}>
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
                        <Badge className={cn("text-white shadow-md", getStatusBadgeVariant(status))}>
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

          {/* Payment Fields */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <Label className="text-base font-semibold">Pagamento</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_status">Status do Pagamento</Label>
                <Select
                  value={watch('payment_status')}
                  onValueChange={(value) => setValue('payment_status', value as 'pending' | 'paid' | 'package')}
                  disabled={currentMode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago (Avulso)</SelectItem>
                    <SelectItem value="package">Pacote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watch('payment_status') === 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Valor Pago (R$)</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="180.00"
                    {...register('payment_amount', { valueAsNumber: true })}
                    disabled={currentMode === 'view'}
                  />
                </div>
              )}

              {watch('payment_status') === 'package' && (
                <div className="space-y-2">
                  <Label>Pacote de Sessões</Label>
                  <p className="text-sm text-muted-foreground">
                    Será descontado do pacote do paciente
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recurring Fields */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_recurring"
                checked={watch('is_recurring')}
                onCheckedChange={(checked) => setValue('is_recurring', checked as boolean)}
                disabled={currentMode === 'view'}
              />
              <Label htmlFor="is_recurring" className="text-base font-semibold cursor-pointer">
                Agendamento Recorrente
              </Label>
            </div>

            {watch('is_recurring') && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="recurring_until">Repetir até</Label>
                <Popover open={isRecurringCalendarOpen} onOpenChange={setIsRecurringCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watch('recurring_until') && "text-muted-foreground"
                      )}
                      disabled={currentMode === 'view'}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch('recurring_until') ? (
                        format(watch('recurring_until')!, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        "Selecione a data final"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watch('recurring_until')}
                      onSelect={(date) => {
                        setValue('recurring_until', date);
                        setIsRecurringCalendarOpen(false);
                      }}
                      disabled={(date) => date < watchedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.recurring_until && (
                  <p className="text-sm text-destructive">{errors.recurring_until.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Este agendamento se repetirá semanalmente até a data selecionada
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações sobre o agendamento..."
              rows={3}
              disabled={currentMode === 'view'}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t flex-shrink-0">
            <div>
              {currentMode === 'edit' && appointment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2 hover-lift"
                >
                  <X className="w-4 h-4" />
                  Excluir
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              {currentMode === 'view' && appointment && (
                <>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setCurrentMode('edit')}
                    className="flex items-center gap-2 bg-gradient-primary hover-lift shadow-medical"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Editar
                  </Button>
                </>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating || isUpdating}
                className="hover-scale"
              >
                {currentMode === 'view' ? 'Fechar' : 'Cancelar'}
              </Button>
              
              {currentMode !== 'view' && (
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex items-center gap-2 relative min-w-[140px] bg-gradient-primary hover-lift shadow-medical"
                >
                  {(isCreating || isUpdating) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{currentMode === 'edit' ? 'Salvar Alterações' : 'Criar Agendamento'}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>

      {quickPatientModalOpen && (
        <QuickPatientModal
          open={quickPatientModalOpen}
          onOpenChange={setQuickPatientModalOpen}
          onPatientCreated={(patientId) => {
            setValue('patient_id', patientId);
            setQuickPatientModalOpen(false);
          }}
        />
      )}
    </Dialog>
  );
};
