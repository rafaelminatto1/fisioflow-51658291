import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  User, CreditCard, FileText, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

import { useActivePatients } from '@/hooks/usePatients';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment
} from '@/hooks/useAppointments';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import {
  type AppointmentBase,
  type AppointmentFormData,
  type AppointmentType,
  type AppointmentStatus
} from '@/types/appointment';
import { appointmentFormSchema } from '@/lib/validations/agenda';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { cn } from '@/lib/utils';

import { QuickPatientModal } from '../modals/QuickPatientModal';
import { DuplicateAppointmentDialog, type DuplicateConfig } from './DuplicateAppointmentDialog';
import { CapacityExceededDialog } from './CapacityExceededDialog';
import { WaitlistQuickAdd } from './WaitlistQuickAdd';

import {
  PatientSelectionSection,
  DateTimeSection,
  TypeAndStatusSection,
  PaymentTab,
  OptionsTab
} from './AppointmentDialogSegments';

import { type SelectedEquipment } from './EquipmentSelector';
import { type AppointmentReminderData } from './AppointmentReminder';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: AppointmentBase | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultPatientId?: string;
  mode?: 'create' | 'edit' | 'view';
}

import { useNavigate } from 'react-router-dom';

export const AppointmentModalRefactored: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultTime,
  defaultPatientId,
  mode: initialMode = 'create'
}) => {
  const navigate = useNavigate();
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
  const [pendingFormData, setPendingFormData] = useState<AppointmentFormData | null>(null);
  const [waitlistQuickAddOpen, setWaitlistQuickAddOpen] = useState(false);

  const { mutate: createAppointmentMutation, isPending: isCreating } = useCreateAppointment();
  const { mutate: updateAppointmentMutation, isPending: isUpdating } = useUpdateAppointment();
  const { mutate: deleteAppointmentMutation } = useDeleteAppointment();
  const { data: activePatients, isLoading: patientsLoading } = useActivePatients();
  const { data: appointments = [] } = useAppointments();
  const { getCapacityForTime } = useScheduleCapacity();

  // Verifica se o paciente já teve sessões/evoluções anteriores
  const checkPatientHasPreviousSessions = useCallback((patientId: string): boolean => {
    const previousAppointments = appointments.filter(
      apt => apt.patientId === patientId &&
        ['concluido', 'atendido', 'em_andamento', 'completado'].includes(apt.status)
    );
    return previousAppointments.length > 0;
  }, [appointments]);

  const methods = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointment?.patientId || defaultPatientId || '',
      appointment_date: appointment?.date ? format(new Date(appointment.date), 'yyyy-MM-dd') : (defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      appointment_time: appointment?.time || defaultTime || '',
      duration: appointment?.duration || 60,
      type: appointment?.type || 'Fisioterapia',
      status: appointment?.status || 'agendado',
      notes: appointment?.notes || '',
      therapist_id: appointment?.therapistId || '',
      room: appointment?.room || '',
      payment_status: appointment?.payment_status || 'pending',
      payment_amount: appointment?.payment_amount || 170,
      payment_method: '',
      installments: 1,
      is_recurring: appointment?.is_recurring || false,
      recurring_until: appointment?.recurring_until ? format(new Date(appointment.recurring_until), 'yyyy-MM-dd') : '',
    },
  });

  const { handleSubmit, setValue, watch, reset } = methods;
  const watchedPatientId = watch('patient_id');

  useEffect(() => {
    if (appointment && isOpen) {
      reset({
        patient_id: appointment.patientId,
        appointment_date: appointment.date ? format(new Date(appointment.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        appointment_time: appointment.time,
        duration: appointment.duration || 60,
        type: appointment.type || 'Fisioterapia',
        status: appointment.status || 'agendado',
        notes: appointment.notes || '',
        therapist_id: appointment.therapistId || '',
        room: appointment.room || '',
        payment_status: appointment.payment_status || 'pending',
        payment_amount: appointment.payment_amount || 170,
        payment_method: appointment.payment_method || '',
        installments: appointment.installments || 1,
        is_recurring: appointment.is_recurring || false,
        recurring_until: appointment.recurring_until ? format(new Date(appointment.recurring_until), 'yyyy-MM-dd') : '',
      });
    } else if (isOpen) {
      // Para novos agendamentos, define o status padrão como 'agendado'
      reset({
        patient_id: defaultPatientId || '',
        appointment_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        appointment_time: defaultTime || '',
        duration: 60,
        type: 'Fisioterapia',
        status: 'agendado',
        notes: '',
        payment_status: 'pending',
        payment_amount: 170,
        payment_method: '',
        installments: 1,
        is_recurring: false,
      });
    }
    setCurrentMode(initialMode);
    setActiveTab('info');
  }, [appointment, isOpen, defaultDate, defaultTime, defaultPatientId, initialMode, reset]);

  // Monitora mudanças no paciente selecionado para ajustar o status automaticamente
  useEffect(() => {
    // Só aplica lógica automática para novos agendamentos (sem appointment definido)
    if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
      const hasPreviousSessions = checkPatientHasPreviousSessions(watchedPatientId);
      // Se paciente nunca teve sessão, muda para "avaliacao"
      if (!hasPreviousSessions) {
        setValue('status', 'avaliacao');
      } else {
        setValue('status', 'agendado');
      }
    }
  }, [watchedPatientId, isOpen, appointment, currentMode, setValue, checkPatientHasPreviousSessions]);

  const watchedDateStr = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');
  const watchPaymentStatus = watch('payment_status');
  const watchPaymentMethod = watch('payment_method');
  const watchPaymentAmount = watch('payment_amount');

  const watchedDate = useMemo(() => {
    if (!watchedDateStr) return null;
    return typeof watchedDateStr === 'string' ? parseISO(watchedDateStr) : watchedDateStr;
  }, [watchedDateStr]);

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

  const { timeSlots: slotInfo, isDayClosed } = useAvailableTimeSlots(watchedDate);

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

  const dataToDuplicate = (apt: AppointmentBase): AppointmentFormData => {
    return {
      patient_id: apt.patientId,
      appointment_date: format(new Date(apt.date), 'yyyy-MM-dd'),
      appointment_time: apt.time || '',
      duration: apt.duration,
      type: apt.type,
      status: apt.status,
      notes: apt.notes,
      therapist_id: apt.therapistId,
      room: apt.room,
      payment_status: apt.payment_status,
      payment_amount: apt.payment_amount,
    };
  };

  const handleSave = async (data: AppointmentFormData) => {
    try {

      // Validar campos obrigatórios ANTES de qualquer processamento
      if (!data.appointment_time || data.appointment_time === '') {

        throw new Error('Horário do agendamento é obrigatório');
      }

      if (!data.patient_id || data.patient_id === '') {
        throw new Error('ID do paciente é obrigatório');
      }
      if (!data.appointment_date || data.appointment_date === '') {

        throw new Error('Data do agendamento é obrigatória');
      }

      const maxCapacity = watchedDate && watchedTime ? getCapacityForTime(watchedDate.getDay(), watchedTime) : 1;
      const currentCount = (conflictCheck?.conflictCount || 0);

      if (currentCount >= maxCapacity) {
        setPendingFormData({
          ...data,
          appointment_date: format(new Date(), 'yyyy-MM-dd')
        });
        setCapacityDialogOpen(true);
        return;
      }

      const appointmentData = data;
      const endTime = new Date(new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`).getTime() + appointmentData.duration * 60000);
      const endTimeString = format(endTime, 'HH:mm');

      const formattedData = {
        patient_id: appointmentData.patient_id,
        therapist_id: appointmentData.therapist_id || '',
        date: appointmentData.appointment_date, // Nova coluna
        start_time: appointmentData.appointment_time, // Nova coluna
        end_time: endTimeString,
        duration: appointmentData.duration,
        status: appointmentData.status as any,
        payment_status: appointmentData.payment_status as any,
        notes: appointmentData.notes || '',
        room: appointmentData.room || '',
        session_type: (appointmentData.type === 'Fisioterapia' ? 'individual' : 'group') as any,
      };



      if (appointment?.id) {
        updateAppointmentMutation({
          appointmentId: appointment.id,
          updates: formattedData
        }, {
          onSuccess: () => {
            if (appointmentData.status === 'avaliacao') {
              const navPath = `/medical-record?patientId=${appointmentData.patient_id}&action=new&appointmentId=${appointment.id}&type=assessment`;
              navigate(navPath);
            }
            onClose();
          }
        });
      } else {
        createAppointmentMutation(formattedData as any, {
          onSuccess: (newAppointment) => {
            if (appointmentData.status === 'avaliacao') {
              const createdId = (newAppointment as any)?.id;
              if (createdId) {
                const navPath = `/medical-record?patientId=${appointmentData.patient_id}&action=new&appointmentId=${createdId}&type=assessment`;
                navigate(navPath);
              }
            }
            onClose();
          },
          onError: (error) => {
            console.error('Erro ao criar agendamento:', error);
          }
        });
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const handleDelete = () => {
    if (appointment?.id) {
      deleteAppointmentMutation(appointment.id, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  const handleDuplicate = (config: DuplicateConfig) => {
    if (appointment) {
      config.dates.forEach(date => {
        createAppointmentMutation({
          ...dataToDuplicate(appointment),
          appointment_date: format(date, 'yyyy-MM-dd'),
          appointment_time: config.newTime || appointment.time,
        });
      });
      setDuplicateDialogOpen(false);
    }
  };

  const handleAddToWaitlistFromCapacity = () => {
    setCapacityDialogOpen(false);
    setWaitlistQuickAddOpen(true);
  };

  const handleChooseAnotherTime = () => {
    setCapacityDialogOpen(false);
    setActiveTab('info');
  };

  const handleScheduleAnyway = () => {
    if (pendingFormData) {
      if (appointment?.id) {
        updateAppointmentMutation({
          appointmentId: appointment.id,
          updates: pendingFormData
        });
      } else {
        createAppointmentMutation(pendingFormData);
      }
      setCapacityDialogOpen(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {currentMode === 'view' ? 'Detalhes do Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 sm:px-6 py-1.5 border-b shrink-0">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="info" className="flex items-center gap-1 sm:gap-2 text-xs">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Informações</span>
                  <span className="xs:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center gap-1 sm:gap-2 text-xs">
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Pagamento</span>
                  <span className="xs:hidden">Pag.</span>
                </TabsTrigger>
                <TabsTrigger value="options" className="flex items-center gap-1 sm:gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Opções</span>
                  <span className="xs:hidden">Opç.</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <form id="appointment-form" onSubmit={handleSubmit((data) => {
                handleSave(data);
              }, (errors) => {
                console.error('Erros de validação:', errors);
              })} className="px-4 sm:px-6 py-3">
                <TabsContent value="info" className="mt-0 space-y-2.5 sm:space-y-3">
                  <PatientSelectionSection
                    patients={activePatients || []}
                    isLoading={patientsLoading}
                    disabled={currentMode === 'view'}
                    onCreateNew={(searchTerm) => {
                      setSuggestedPatientName(searchTerm);
                      setQuickPatientModalOpen(true);
                    }}
                  />

                  <DateTimeSection
                    disabled={currentMode === 'view'}
                    timeSlots={timeSlots}
                    isCalendarOpen={isCalendarOpen}
                    setIsCalendarOpen={setIsCalendarOpen}
                    getCapacityForTime={getCapacityForTime}
                    conflictCount={conflictCheck?.conflictCount || 0}
                  />

                  <TypeAndStatusSection disabled={currentMode === 'view'} />

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Observações</Label>
                    <Textarea
                      {...methods.register('notes')}
                      placeholder="Informações importantes sobre o atendimento..."
                      rows={2}
                      disabled={currentMode === 'view'}
                      className="resize-none text-sm min-h-[60px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0 space-y-2.5 sm:space-y-3">
                  <PaymentTab
                    disabled={currentMode === 'view'}
                    watchPaymentStatus={watchPaymentStatus || 'pending'}
                    watchPaymentMethod={watchPaymentMethod || ''}
                    watchpaymentAmount={watchPaymentAmount || 0}
                  />
                </TabsContent>

                <TabsContent value="options" className="mt-0 space-y-3 sm:space-y-4">
                  <OptionsTab
                    disabled={currentMode === 'view'}
                    currentMode={currentMode}
                    selectedEquipments={selectedEquipments}
                    setSelectedEquipments={setSelectedEquipments}
                    isRecurringCalendarOpen={isRecurringCalendarOpen}
                    setIsRecurringCalendarOpen={setIsRecurringCalendarOpen}
                    reminders={reminders}
                    setReminders={setReminders}
                    onDuplicate={() => setDuplicateDialogOpen(true)}
                  />
                </TabsContent>
              </form>
            </div>
          </Tabs>
        </FormProvider>

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
                className={cn(
                  "min-w-[80px] sm:min-w-[100px]",
                  watch('status') === 'avaliacao' && "bg-violet-600 hover:bg-violet-700 text-white"
                )}
                size="sm"
              >
                {(isCreating || isUpdating) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {watch('status') === 'avaliacao' ? 'Iniciar Avaliação' : (currentMode === 'edit' ? 'Salvar' : 'Criar')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <QuickPatientModal
          open={quickPatientModalOpen}
          onOpenChange={(open) => {
            setQuickPatientModalOpen(open);
            if (!open) {
              setSuggestedPatientName('');
            }
          }}
          onPatientCreated={(patientId) => {
            setValue('patient_id', patientId);
            setQuickPatientModalOpen(false);
            setSuggestedPatientName('');
            queryClient.invalidateQueries({ queryKey: ['patients'] });
          }}
          suggestedName={suggestedPatientName}
        />

        <DuplicateAppointmentDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          appointment={appointment || null}
          onDuplicate={handleDuplicate}
        />

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

        {waitlistQuickAddOpen && pendingFormData && (
          <WaitlistQuickAdd
            open={waitlistQuickAddOpen}
            onOpenChange={(open) => {
              setWaitlistQuickAddOpen(open);
              if (!open) setPendingFormData(null);
            }}
            date={pendingFormData.appointment_date ? parseISO(pendingFormData.appointment_date) : new Date()}
            time={pendingFormData.appointment_time}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
