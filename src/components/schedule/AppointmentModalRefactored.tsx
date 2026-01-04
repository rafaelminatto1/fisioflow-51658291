import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
// ScrollArea removed - using native overflow
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  User, 
  AlertTriangle, 
  Check, 
  X, 
  CreditCard,
  FileText,
  Repeat,
  Copy,
  Bell,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentBase, AppointmentFormData, AppointmentType, AppointmentStatus } from '@/types/appointment';
import { useCreateAppointment, useUpdateAppointment, useAppointments } from '@/hooks/useAppointments';
import { useActivePatients } from '@/hooks/usePatients';
import { useQueryClient } from '@tanstack/react-query';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { QuickPatientModal } from '@/components/modals/QuickPatientModal';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { toast } from '@/hooks/use-toast';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { EquipmentSelector, SelectedEquipment } from './EquipmentSelector';
import { AppointmentReminder, AppointmentReminderData } from './AppointmentReminder';
import { DuplicateAppointmentDialog, DuplicateConfig } from './DuplicateAppointmentDialog';
import { CapacityExceededDialog } from './CapacityExceededDialog';
import { WaitlistQuickAdd } from './WaitlistQuickAdd';

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
  payment_status: z.enum(['pending', 'paid_single', 'paid_package']).default('pending'),
  payment_amount: z.number().min(0).default(170),
  payment_method: z.enum(['pix', 'dinheiro', 'debito', 'credito']).optional(),
  installments: z.number().min(1).max(6).optional(),
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
  defaultPatientId?: string;
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
  'aguardando_confirmacao': 'Aguardando',
  'em_andamento': 'Em Andamento',
  'em_espera': 'Em Espera',
  'atrasado': 'Atrasado',
  'concluido': 'Concluído',
  'remarcado': 'Remarcado',
  'cancelado': 'Cancelado',
  'falta': 'Falta'
};

const statusColors: Record<string, string> = {
  'agendado': 'bg-blue-500',
  'confirmado': 'bg-emerald-500',
  'aguardando_confirmacao': 'bg-amber-500',
  'em_andamento': 'bg-cyan-500',
  'em_espera': 'bg-indigo-500',
  'atrasado': 'bg-yellow-500',
  'concluido': 'bg-purple-500',
  'remarcado': 'bg-orange-500',
  'cancelado': 'bg-red-500',
  'falta': 'bg-rose-500'
};

export const AppointmentModalRefactored: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultTime,
  defaultPatientId,
  mode: initialMode = 'create'
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRecurringCalendarOpen, setIsRecurringCalendarOpen] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictingAppointment?: AppointmentBase; conflictCount?: number } | null>(null);
  const queryClient = useQueryClient();
  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
  const [suggestedPatientName, setSuggestedPatientName] = useState('');
  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view'>(initialMode);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedEquipments, setSelectedEquipments] = useState<SelectedEquipment[]>([]);
  const [reminders, setReminders] = useState<AppointmentReminderData[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<AppointmentSchemaType | null>(null);
  const [forceOverCapacity, setForceOverCapacity] = useState(false);
  
  const { mutate: createAppointmentMutation, isPending: isCreating } = useCreateAppointment();
  const { mutate: updateAppointmentMutation, isPending: isUpdating } = useUpdateAppointment();
  const { data: activePatients, isLoading: patientsLoading } = useActivePatients();
  const { data: appointments = [] } = useAppointments();
  const { getCapacityForTime } = useScheduleCapacity();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<AppointmentSchemaType>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: (appointment as any)?.patient_id || defaultPatientId || '',
      appointment_date: (appointment as any)?.appointment_date ? new Date((appointment as any).appointment_date) : (defaultDate || new Date()),
      appointment_time: (appointment as any)?.appointment_time || defaultTime || '',
      duration: appointment?.duration || 60,
      type: appointment?.type || 'Fisioterapia',
      status: appointment?.status || 'agendado',
      notes: appointment?.notes || '',
      therapist_id: (appointment as any)?.therapist_id || undefined,
      room: (appointment as any)?.room || undefined,
      payment_status: 'pending',
      payment_amount: 170,
      payment_method: undefined,
      installments: 1,
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
      setValue('payment_amount', 170);
      setValue('payment_method', undefined);
      setValue('installments', 1);
      setValue('session_package_id', undefined);
      setValue('is_recurring', false);
      setValue('recurring_until', undefined);
    } else {
      reset({
        patient_id: defaultPatientId || '',
        appointment_date: defaultDate || new Date(),
        appointment_time: defaultTime || '',
        duration: 60,
        type: 'Fisioterapia',
        status: 'agendado',
        notes: '',
        payment_status: 'pending',
        payment_amount: 170,
        payment_method: undefined,
        installments: 1,
        is_recurring: false,
      });
    }
    setCurrentMode(initialMode);
    setActiveTab('info');
  }, [appointment, isOpen, defaultDate, defaultTime, initialMode, setValue, reset]);

  const watchedDate = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');
  const watchedPatientId = watch('patient_id');
  const watchPaymentStatus = watch('payment_status');
  const watchPaymentMethod = watch('payment_method');

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

  const { timeSlots: slotInfo, isDayClosed } = useAvailableTimeSlots(watchedDate || null);
  
  const timeSlots = useMemo(() => {
    if (slotInfo.length === 0 && !isDayClosed) {
      const slots: string[] = [];
      for (let hour = 7; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        }
      }
      return slots;
    }
    return slotInfo.map(s => s.time);
  }, [slotInfo, isDayClosed]);

  const selectedPatient = useMemo(() => {
    if (!watchedPatientId || !activePatients) return null;
    return activePatients.find(p => p.id === watchedPatientId);
  }, [watchedPatientId, activePatients]);

  // Check if over capacity before saving
  const checkCapacityBeforeSave = (data: AppointmentSchemaType): boolean => {
    if (forceOverCapacity) return true; // User chose to schedule anyway
    
    const dayOfWeek = data.appointment_date.getDay();
    const maxCapacity = getCapacityForTime(dayOfWeek, data.appointment_time);
    const conflictCount = conflictCheck?.conflictCount || 0;
    
    // If editing, don't count current appointment
    const adjustedCount = currentMode === 'edit' ? conflictCount : conflictCount;
    
    if (adjustedCount >= maxCapacity) {
      setPendingFormData(data);
      setCapacityDialogOpen(true);
      return false;
    }
    
    return true;
  };

  const executeCreateAppointment = (formData: AppointmentFormData, isOverCapacity: boolean = false) => {
    // Add over-capacity marker to notes if needed
    const notesWithMarker = isOverCapacity 
      ? `[EXCEDENTE] ${formData.notes || ''}`.trim()
      : formData.notes;

    const finalFormData = {
      ...formData,
      notes: notesWithMarker,
    };

    if (currentMode === 'edit' && appointment) {
      updateAppointmentMutation({
        appointmentId: appointment.id,
        updates: finalFormData
      }, {
        onSuccess: () => {
          toast({
            title: 'Agendamento atualizado',
            description: isOverCapacity 
              ? 'Agendamento salvo como excedente.' 
              : 'As alterações foram salvas com sucesso.',
            variant: isOverCapacity ? 'default' : 'default'
          });
          setForceOverCapacity(false);
          onClose();
        },
        onError: (error: Error) => {
          toast({
            title: 'Erro ao atualizar',
            description: error.message,
            variant: 'destructive'
          });
        }
      });
    } else {
      createAppointmentMutation(finalFormData, {
        onSuccess: () => {
          toast({
            title: isOverCapacity ? 'Agendamento excedente criado' : 'Agendamento criado',
            description: isOverCapacity 
              ? 'Paciente agendado além da capacidade. Ficará destacado na agenda.' 
              : 'O agendamento foi criado com sucesso.',
          });
          setForceOverCapacity(false);
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
  };

  const handleSave = async (data: AppointmentSchemaType) => {
    try {
      // Check capacity first (unless user already chose to force)
      if (!checkCapacityBeforeSave(data)) {
        return; // Dialog will be shown
      }

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
        payment_status: data.payment_status === 'paid_single' || data.payment_status === 'paid_package' ? 'paid' : 'pending',
        payment_amount: data.payment_amount || null,
        session_package_id: data.session_package_id || null,
        is_recurring: data.is_recurring,
        recurring_until: data.recurring_until ? format(data.recurring_until, 'yyyy-MM-dd') : null,
      };

      executeCreateAppointment(formData, forceOverCapacity);
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o agendamento.',
        variant: 'destructive'
      });
    }
  };

  // Handle capacity dialog options
  const handleAddToWaitlistFromCapacity = () => {
    if (pendingFormData) {
      setCapacityDialogOpen(false);
      setWaitlistQuickAddOpen(true);
    }
  };

  const handleChooseAnotherTime = () => {
    setCapacityDialogOpen(false);
    setPendingFormData(null);
    setActiveTab('info');
    toast({
      title: 'Selecione outro horário',
      description: 'Escolha um horário com vagas disponíveis.',
    });
  };

  const handleScheduleAnyway = () => {
    if (pendingFormData) {
      setCapacityDialogOpen(false);
      setForceOverCapacity(true);
      
      const dateStr = format(pendingFormData.appointment_date, 'yyyy-MM-dd');
      const formData: AppointmentFormData = {
        patient_id: pendingFormData.patient_id,
        appointment_date: dateStr,
        appointment_time: pendingFormData.appointment_time,
        duration: pendingFormData.duration,
        type: pendingFormData.type as AppointmentType,
        status: pendingFormData.status as AppointmentStatus,
        notes: pendingFormData.notes || null,
        therapist_id: pendingFormData.therapist_id || null,
        room: pendingFormData.room || null,
        payment_status: pendingFormData.payment_status === 'paid_single' || pendingFormData.payment_status === 'paid_package' ? 'paid' : 'pending',
        payment_amount: pendingFormData.payment_amount || null,
        session_package_id: pendingFormData.session_package_id || null,
        is_recurring: pendingFormData.is_recurring,
        recurring_until: pendingFormData.recurring_until ? format(pendingFormData.recurring_until, 'yyyy-MM-dd') : null,
      };

      executeCreateAppointment(formData, true);
      setPendingFormData(null);
    }
  };

  const [waitlistQuickAddOpen, setWaitlistQuickAddOpen] = useState(false);

  const handleDelete = () => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A exclusão de agendamentos estará disponível em breve.',
    });
  };

  const handleDuplicate = (config: DuplicateConfig) => {
    if (!appointment) return;
    
    // Create duplicated appointments
    const apt = appointment as any;
    config.dates.forEach((date) => {
      const formData: AppointmentFormData = {
        patient_id: apt.patient_id,
        appointment_date: format(date, 'yyyy-MM-dd'),
        appointment_time: config.keepTime ? apt.appointment_time : (config.newTime || apt.appointment_time),
        duration: appointment.duration || 60,
        type: appointment.type as AppointmentType,
        status: 'agendado',
        notes: config.keepNotes ? appointment.notes : null,
        therapist_id: apt.therapist_id || null,
        room: apt.room || null,
        payment_status: config.keepPaymentInfo ? apt.payment_status : 'pending',
        payment_amount: config.keepPaymentInfo ? apt.payment_amount : null,
        session_package_id: null,
        is_recurring: false,
        recurring_until: null,
      };

      createAppointmentMutation(formData, {
        onError: (error: Error) => {
          toast({
            title: 'Erro ao duplicar',
            description: error.message,
            variant: 'destructive'
          });
        }
      });
    });

    toast({
      title: 'Agendamentos duplicados',
      description: `${config.dates.length} agendamento(s) criado(s) com sucesso.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[80vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header - Fixed */}
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {currentMode === 'create' ? 'Novo Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Detalhes'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {watchedDate && watchedTime ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {format(watchedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {watchedTime}
                    </span>
                  </span>
                ) : 'Preencha os dados do agendamento'}
              </DialogDescription>
            </div>
            {watch('status') && (
              <Badge className={cn("text-white text-xs shrink-0", statusColors[watch('status')])}>
                {statusLabels[watch('status')]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {/* Tabs Navigation - Fixed */}
          <div className="px-4 sm:px-6 py-1.5 border-b shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="info" className="flex items-center gap-1 sm:gap-2 text-xs">
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Informações</span>
                <span className="xs:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-1 sm:gap-2 text-xs">
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Pagamento</span>
                <span className="xs:hidden">Pag.</span>
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-1 sm:gap-2 text-xs">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Opções</span>
                <span className="xs:hidden">Opç.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <form id="appointment-form" onSubmit={handleSubmit(handleSave)} className="px-4 sm:px-6 py-3">
              
              {/* Tab: Informações */}
              <TabsContent value="info" className="mt-0 space-y-2.5 sm:space-y-3">
                {/* Patient Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Paciente *
                  </Label>
                  <PatientCombobox
                    patients={activePatients || []}
                    value={watch('patient_id')}
                    onValueChange={(value) => setValue('patient_id', value)}
                    onCreateNew={(searchTerm) => {
                      setSuggestedPatientName(searchTerm);
                      setQuickPatientModalOpen(true);
                    }}
                    disabled={currentMode === 'view' || patientsLoading}
                  />
                  {errors.patient_id && (
                    <p className="text-xs text-destructive">{errors.patient_id.message}</p>
                  )}
                </div>

                {/* Date and Time - Responsive Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Data *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm",
                        !watchedDate && "text-muted-foreground"
                      )}
                      disabled={currentMode === 'view'}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {watchedDate ? format(watchedDate, 'dd/MM', { locale: ptBR }) : "Data"}
                    </Button>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Horário *</Label>
                    <Select
                      value={watchedTime}
                      onValueChange={(value) => setValue('appointment_time', value)}
                      disabled={currentMode === 'view'}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-1">
                    <Label className="text-xs sm:text-sm font-medium">Duração</Label>
                    <Select
                      value={watchedDuration?.toString()}
                      onValueChange={(value) => setValue('duration', parseInt(value))}
                      disabled={currentMode === 'view'}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h30</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Capacity Indicator */}
                {watchedDate && watchedTime && (() => {
                  const dayOfWeek = watchedDate.getDay();
                  const maxCapacity = getCapacityForTime(dayOfWeek, watchedTime);
                  const conflictCount = conflictCheck?.conflictCount || 0;
                  const availableSlots = maxCapacity - conflictCount;
                  const exceedsCapacity = conflictCount >= maxCapacity;
                  
                  return (
                    <div className={cn(
                      "flex items-center justify-between p-2 sm:p-2.5 border rounded-lg text-xs sm:text-sm transition-all",
                      exceedsCapacity 
                        ? "border-red-500/30 bg-red-500/5" 
                        : conflictCount > 0 
                          ? "border-amber-500/30 bg-amber-500/5" 
                          : "border-emerald-500/30 bg-emerald-500/5"
                    )}>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {exceedsCapacity ? (
                          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                        ) : (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        )}
                        <span className={cn(
                          "font-medium",
                          exceedsCapacity ? "text-red-700" : conflictCount > 0 ? "text-amber-700" : "text-emerald-700"
                        )}>
                          {exceedsCapacity 
                            ? "Horário lotado!" 
                            : availableSlots === maxCapacity 
                              ? "Horário livre" 
                              : `${availableSlots} vaga${availableSlots !== 1 ? 's' : ''} disponível`
                          }
                        </span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[10px] sm:text-xs h-5 sm:h-6",
                        exceedsCapacity ? "border-red-500/50" : "border-muted"
                      )}>
                        {conflictCount}/{maxCapacity}
                      </Badge>
                    </div>
                  );
                })()}

                {/* Type and Status */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Tipo *</Label>
                    <Select
                      value={watch('type')}
                      onValueChange={(value) => setValue('type', value as AppointmentType)}
                      disabled={currentMode === 'view'}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Status *</Label>
                    <Select
                      value={watch('status')}
                      onValueChange={(value) => setValue('status', value as AppointmentStatus)}
                      disabled={currentMode === 'view'}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appointmentStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
                              {statusLabels[status]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Observações</Label>
                  <Textarea
                    {...register('notes')}
                    placeholder="Informações importantes sobre o atendimento..."
                    rows={2}
                    disabled={currentMode === 'view'}
                    className="resize-none text-sm min-h-[60px]"
                  />
                </div>
              </TabsContent>

              {/* Tab: Pagamento */}
              <TabsContent value="payment" className="mt-0 space-y-2.5 sm:space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    Tipo de Pagamento
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {[
                      { value: 'pending', label: 'Pendente', icon: '⏳', color: 'border-amber-500/30 bg-amber-500/5' },
                      { value: 'paid_single', label: 'Avulso', icon: '💵', color: 'border-emerald-500/30 bg-emerald-500/5' },
                      { value: 'paid_package', label: 'Pacote', icon: '📦', color: 'border-blue-500/30 bg-blue-500/5' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={watchPaymentStatus === option.value ? 'default' : 'outline'}
                        className={cn(
                          "h-14 sm:h-16 flex-col gap-0.5 sm:gap-1 transition-all",
                          watchPaymentStatus === option.value 
                            ? "ring-2 ring-primary ring-offset-1 sm:ring-offset-2 shadow-md" 
                            : option.color
                        )}
                        onClick={() => {
                          setValue('payment_status', option.value as any);
                          if (option.value === 'paid_single') setValue('payment_amount', 180);
                          if (option.value === 'paid_package') setValue('payment_amount', 170);
                        }}
                        disabled={currentMode === 'view'}
                      >
                        <span className="text-base sm:text-lg">{option.icon}</span>
                        <span className="text-[10px] sm:text-xs font-medium">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Payment Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">Valor da Sessão (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="170.00"
                    {...register('payment_amount', { valueAsNumber: true })}
                    disabled={currentMode === 'view' || watchPaymentStatus === 'pending'}
                    className="h-9 sm:h-10 text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                    💡 Pacote: R$ 170/sessão • Avulso: R$ 180/sessão
                  </p>
                </div>

                {/* Payment Method */}
                {(watchPaymentStatus === 'paid_single' || watchPaymentStatus === 'paid_package') && (
                  <div className="space-y-2 bg-gradient-to-r from-emerald-500/5 to-transparent p-3 sm:p-4 rounded-lg border border-emerald-500/20">
                    <Label className="text-xs sm:text-sm font-medium">Forma de Pagamento</Label>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {[
                        { value: 'pix', label: 'PIX', icon: '📲' },
                        { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
                        { value: 'debito', label: 'Débito', icon: '💳' },
                        { value: 'credito', label: 'Crédito', icon: '💳' },
                      ].map((method) => (
                        <Button
                          key={method.value}
                          type="button"
                          variant={watchPaymentMethod === method.value ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "h-10 sm:h-12 flex-col gap-0 sm:gap-0.5 transition-all",
                            watchPaymentMethod === method.value && "ring-1 ring-primary shadow-sm"
                          )}
                          onClick={() => setValue('payment_method', method.value as any)}
                          disabled={currentMode === 'view'}
                        >
                          <span className="text-xs sm:text-sm">{method.icon}</span>
                          <span className="text-[8px] sm:text-[10px]">{method.label}</span>
                        </Button>
                      ))}
                    </div>

                    {/* Installments for Credit */}
                    {watchPaymentMethod === 'credito' && (
                      <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                        <Label className="text-xs sm:text-sm">Parcelas (até 6x sem juros)</Label>
                        <Select
                          value={watch('installments')?.toString()}
                          onValueChange={(value) => setValue('installments', parseInt(value))}
                          disabled={currentMode === 'view'}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Parcelas" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}x de R$ {(watch('payment_amount') / num).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Opções */}
              <TabsContent value="options" className="mt-0 space-y-3 sm:space-y-4">
                {/* Equipment Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Equipamentos
                  </Label>
                  <EquipmentSelector
                    selectedEquipments={selectedEquipments}
                    onSelectionChange={setSelectedEquipments}
                    disabled={currentMode === 'view'}
                  />
                </div>

                {/* Recurring */}
                <div className="space-y-2 bg-gradient-to-r from-blue-500/5 to-transparent p-3 sm:p-4 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Checkbox
                      id="is_recurring"
                      checked={watch('is_recurring')}
                      onCheckedChange={(checked) => setValue('is_recurring', checked as boolean)}
                      disabled={currentMode === 'view'}
                      className="h-4 w-4"
                    />
                    <div className="flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5 text-blue-600" />
                      <Label htmlFor="is_recurring" className="text-xs sm:text-sm font-medium cursor-pointer">
                        Agendamento Recorrente
                      </Label>
                    </div>
                  </div>

                  {watch('is_recurring') && (
                    <div className="space-y-1.5 pl-6 sm:pl-7">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground">Repetir semanalmente até</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start h-9 sm:h-10 text-xs sm:text-sm", !watch('recurring_until') && "text-muted-foreground")}
                        disabled={currentMode === 'view'}
                        onClick={() => setIsRecurringCalendarOpen(true)}
                      >
                        <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {watch('recurring_until') ? format(watch('recurring_until')!, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione a data final"}
                      </Button>
                      {errors.recurring_until && <p className="text-xs text-destructive">{errors.recurring_until.message}</p>}
                    </div>
                  )}
                </div>

                {/* Reminders */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    Lembretes
                  </Label>
                  <AppointmentReminder
                    reminders={reminders}
                    onRemindersChange={setReminders}
                    disabled={currentMode === 'view'}
                  />
                </div>

                {/* Room Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">Sala</Label>
                  <Select
                    value={watch('room') || ''}
                    onValueChange={(value) => setValue('room', value)}
                    disabled={currentMode === 'view'}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Selecione a sala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sala-1">🚪 Sala 01</SelectItem>
                      <SelectItem value="sala-2">🚪 Sala 02</SelectItem>
                      <SelectItem value="sala-3">🚪 Sala 03</SelectItem>
                      <SelectItem value="pilates">🧘 Sala Pilates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duplicate Button - Only in edit mode */}
                {currentMode === 'edit' && appointment && (
                  <div className="pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                      onClick={() => setDuplicateDialogOpen(true)}
                    >
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      Duplicar Agendamento
                    </Button>
                  </div>
                )}
              </TabsContent>
            </form>
          </div>
        </Tabs>

        {/* Fixed Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-t bg-background shrink-0">
          <div className="flex justify-center sm:justify-start">
            {currentMode === 'edit' && appointment && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                size="sm"
              >
                <X className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            {currentMode === 'view' && appointment && (
              <Button
                type="button"
                variant="default"
                onClick={() => setCurrentMode('edit')}
                size="sm"
              >
                Editar
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating || isUpdating}
              size="sm"
            >
              {currentMode === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {currentMode !== 'view' && (
              <Button
                type="submit"
                form="appointment-form"
                disabled={isCreating || isUpdating}
                className="min-w-[80px] sm:min-w-[100px]"
                size="sm"
              >
                {(isCreating || isUpdating) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {currentMode === 'edit' ? 'Salvar' : 'Criar'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {quickPatientModalOpen && (
        <QuickPatientModal
          open={quickPatientModalOpen}
          onOpenChange={(open) => {
            setQuickPatientModalOpen(open);
            if (!open) {
              setSuggestedPatientName('');
            }
          }}
          onPatientCreated={(patientId, patientName) => {
            setValue('patient_id', patientId);
            setQuickPatientModalOpen(false);
            setSuggestedPatientName('');
            queryClient.invalidateQueries({ queryKey: ['patients'] });
          }}
          suggestedName={suggestedPatientName}
        />
      )}

      {/* Calendar Dialog for Main Date */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Selecionar Data</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={watchedDate}
            onSelect={(date) => {
              setValue('appointment_date', date || new Date());
              setIsCalendarOpen(false);
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            className="rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog for Recurring Until */}
      <Dialog open={isRecurringCalendarOpen} onOpenChange={setIsRecurringCalendarOpen}>
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-base">Data Final da Recorrência</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={watch('recurring_until')}
            onSelect={(date) => {
              setValue('recurring_until', date);
              setIsRecurringCalendarOpen(false);
            }}
            disabled={(date) => date < watchedDate}
            initialFocus
            className="rounded-md"
          />
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <DuplicateAppointmentDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        appointment={appointment || null}
        onDuplicate={handleDuplicate}
      />

      {/* Capacity Exceeded Dialog */}
      <CapacityExceededDialog
        open={capacityDialogOpen}
        onOpenChange={setCapacityDialogOpen}
        currentCount={(conflictCheck?.conflictCount || 0) + 1}
        maxCapacity={watchedDate && watchedTime ? getCapacityForTime(watchedDate.getDay(), watchedTime) : 1}
        selectedTime={watchedTime || ''}
        selectedDate={watchedDate || new Date()}
        onAddToWaitlist={handleAddToWaitlistFromCapacity}
        onChooseAnotherTime={handleChooseAnotherTime}
        onScheduleAnyway={handleScheduleAnyway}
      />

      {/* Waitlist Quick Add from Capacity Dialog */}
      {waitlistQuickAddOpen && pendingFormData && (
        <WaitlistQuickAdd
          open={waitlistQuickAddOpen}
          onOpenChange={(open) => {
            setWaitlistQuickAddOpen(open);
            if (!open) setPendingFormData(null);
          }}
          date={pendingFormData.appointment_date}
          time={pendingFormData.appointment_time}
        />
      )}
    </Dialog>
  );
};
