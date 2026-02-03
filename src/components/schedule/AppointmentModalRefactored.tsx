import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  User, CreditCard, FileText, Check, X, UserCog
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle
} from '@/components/ui/custom-modal';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useTherapists,
  formatTherapistLabel,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
} from '@/hooks/useTherapists';

import { useAuth } from '@/contexts/AuthContext';
import { useActivePatients } from '@/hooks/usePatients';
import type { Patient } from '@/types';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment
} from '@/hooks/useAppointments';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';
import { useUsePackageSession } from '@/hooks/usePackages';
import {
  type AppointmentBase,
  type AppointmentFormData
} from '@/types/appointment';
import { appointmentFormSchema } from '@/lib/validations/agenda';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { APPOINTMENT_CONFLICT_MESSAGE, isAppointmentConflictError } from '@/utils/appointmentErrors';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRecurringCalendarOpen, setIsRecurringCalendarOpen] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<{ hasConflict: boolean; conflictingAppointment?: AppointmentBase; conflictCount?: number } | null>(null);
  const queryClient = useQueryClient();
  const [quickPatientModalOpen, setQuickPatientModalOpen] = useState(false);
  const [suggestedPatientName, setSuggestedPatientName] = useState('');
  /** Paciente recém-criado no cadastro rápido: exibir no combobox até a lista atualizar */
  const [lastCreatedPatient, setLastCreatedPatient] = useState<{ id: string; name: string } | null>(null);
  const [currentMode, setCurrentMode] = useState<'create' | 'edit' | 'view'>(initialMode);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedEquipments, setSelectedEquipments] = useState<SelectedEquipment[]>([]);
  const [reminders, setReminders] = useState<AppointmentReminderData[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<AppointmentFormData | null>(null);
  const [waitlistQuickAddOpen, setWaitlistQuickAddOpen] = useState(false);

  const { user } = useAuth();
  const { therapists, isLoading: therapistsLoading } = useTherapists();
  const { mutateAsync: createAppointmentAsync, isPending: isCreating } = useCreateAppointment();
  const { mutateAsync: updateAppointmentAsync, isPending: isUpdating } = useUpdateAppointment();
  const { mutate: deleteAppointmentMutation } = useDeleteAppointment();
  const { data: activePatients, isLoading: patientsLoading } = useActivePatients() as { data: Patient[] | undefined; isLoading: boolean };
  const { data: appointments = [] } = useAppointments();
  const { getCapacityForTime } = useScheduleCapacity();
  const { mutateAsync: consumeSession } = useUsePackageSession();

  // Verifica se o paciente já teve sessões/evoluções anteriores
  const checkPatientHasPreviousSessions = useCallback((patientId: string): boolean => {
    const previousAppointments = appointments.filter(
      apt => apt.patientId === patientId &&
        ['concluido', 'atendido', 'em_andamento', 'completado'].includes(apt.status)
    );
    return previousAppointments.length > 0;
  }, [appointments]);

  // Armazena referência estável para checkPatientHasPreviousSessions
  // evita que mudanças no array de appointments causem re-renderização infinita
  const checkPatientHasPreviousSessionsRef = useRef(checkPatientHasPreviousSessions);
  checkPatientHasPreviousSessionsRef.current = checkPatientHasPreviousSessions;

  // Armazena referência estável para appointments
  // evita que mudanças no array causem re-renderização infinita no useEffect de conflito
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  // Armazena o último patientId para o qual o status foi definido
  // evita definir o status múltiplas vezes para o mesmo paciente
  const lastStatusPatientIdRef = useRef<string | null>(null);

  // Quando true, salva o agendamento sem navegar para a tela de avaliação (botão "Agendar")
  const scheduleOnlyRef = useRef(false);

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
      recurring_until: appointment?.recurring_until ? format(new Date(appointment?.recurring_until || ''), 'yyyy-MM-dd') : '',
    },
  });

  const { handleSubmit, setValue, watch, reset } = methods;

  // Armazena referência estável para setValue
  // setValue não é estável e mudanças no array de dependências causam re-renderização infinita
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;

  // Helper to normalize appointment data for form
  const getInitialFormData = useCallback((apt: AppointmentBase | null | undefined, defaults: { date?: Date, time?: string, patientId?: string }): AppointmentFormData => {
    // 1. Determine Date
    let formattedDate = format(new Date(), 'yyyy-MM-dd');
    if (apt?.date) {
      if (typeof apt.date === 'string') {
        // Handle ISO strings vs YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(apt.date)) {
          formattedDate = apt.date;
        } else {
          formattedDate = format(parseISO(apt.date), 'yyyy-MM-dd');
        }
      } else if (apt.date instanceof Date) {
        formattedDate = format(apt.date, 'yyyy-MM-dd');
      }
    } else if (defaults.date) {
      formattedDate = format(defaults.date, 'yyyy-MM-dd');
    }

    // 2. Return complete form data
    if (apt) {
      return {
        patient_id: apt.patientId || defaults.patientId || '',
        appointment_date: formattedDate,
        appointment_time: apt.time || defaults.time || '00:00',
        duration: apt.duration || 60,
        type: apt.type || 'Fisioterapia',
        status: apt.status || 'agendado',
        notes: apt.notes || '',
        therapist_id: apt.therapistId || '',
        room: apt.room || '',
        payment_status: apt.payment_status || 'pending',
        payment_amount: apt.payment_amount || 170,
        payment_method: apt.payment_method || '',
        installments: apt.installments || 1,
        is_recurring: apt.is_recurring || false,
        recurring_until: apt.recurring_until ? format(new Date(apt.recurring_until), 'yyyy-MM-dd') : '',
        session_package_id: apt.session_package_id || ''
      };
    }

    // 3. Defaults for new appointment
    return {
      patient_id: defaults.patientId || '',
      appointment_date: formattedDate,
      appointment_time: defaults.time || '',
      duration: 60,
      type: 'Fisioterapia',
      status: 'agendado',
      notes: '',
      therapist_id: '',
      payment_status: 'pending',
      payment_amount: 170,
      payment_method: '',
      installments: 1,
      is_recurring: false,
      recurring_until: '',
      session_package_id: ''
    };
  }, []);

  const watchedPatientId = watch('patient_id');

  useEffect(() => {
    if (!isOpen) {
      // Reset the ref when modal closes
      lastStatusPatientIdRef.current = null;
      return;
    }

    try {
      const formData = getInitialFormData(appointment, {
        date: defaultDate,
        time: defaultTime,
        patientId: defaultPatientId
      });

      reset(formData);
      setCurrentMode(appointment ? 'edit' : initialMode);
      setActiveTab('info');
    } catch (err) {
      logger.error('Error resetting form', err, 'AppointmentModalRefactored');
      // Fail-safe reset
      reset({
        appointment_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'agendado',
        duration: 60
      });
    }
  }, [appointment, isOpen, defaultDate, defaultTime, defaultPatientId, initialMode, reset, getInitialFormData]);

  // Limpar paciente recém-criado ao fechar o modal
  useEffect(() => {
    if (!isOpen) setLastCreatedPatient(null);
  }, [isOpen]);

  // Quando a lista de pacientes atualizar e contiver o recém-criado, remover o fallback
  useEffect(() => {
    if (lastCreatedPatient && activePatients?.some((p) => p.id === lastCreatedPatient.id)) {
      setLastCreatedPatient(null);
    }
  }, [lastCreatedPatient, activePatients]);

  // Monitora mudanças no paciente selecionado para ajustar o status automaticamente
  useEffect(() => {
    // Só aplica lógica automática para novos agendamentos (sem appointment definido)
    if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
      // Evita definir o status múltiplas vezes para o mesmo paciente
      if (lastStatusPatientIdRef.current === watchedPatientId) {
        return;
      }
      lastStatusPatientIdRef.current = watchedPatientId;

      const hasPreviousSessions = checkPatientHasPreviousSessionsRef.current(watchedPatientId);
      // Se paciente nunca teve sessão, muda para "avaliacao"
      if (!hasPreviousSessions) {
        setValueRef.current('status', 'avaliacao');
      } else {
        setValueRef.current('status', 'agendado');
      }
    }
  }, [watchedPatientId, isOpen, appointment, currentMode]);

  // Watch form values for reactive updates
  const watchedDateStr = watch('appointment_date');
  const watchedTime = watch('appointment_time');
  const watchedDuration = watch('duration');
  const watchPaymentStatus = watch('payment_status');
  const watchPaymentMethod = watch('payment_method');
  const watchPaymentAmount = watch('payment_amount');
  const watchedStatus = watch('status');

  const watchedDate = useMemo(() => {
    if (!watchedDateStr) return null;
    return typeof watchedDateStr === 'string' ? parseISO(watchedDateStr) : watchedDateStr;
  }, [watchedDateStr]);

  const watchedTherapistId = watch('therapist_id');
  const effectiveTherapistId = (watchedTherapistId && String(watchedTherapistId).trim()) || user?.uid || '';

  useEffect(() => {
    if (watchedDate && watchedTime && watchedDuration) {
      const result = checkAppointmentConflict({
        date: watchedDate,
        time: watchedTime,
        duration: watchedDuration,
        excludeId: appointment?.id,
        therapistId: effectiveTherapistId,
        appointments: appointmentsRef.current
      });
      setConflictCheck(result);
    }
  }, [watchedDate, watchedTime, watchedDuration, appointment?.id, effectiveTherapistId]);

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

  const handleSave = async (data: AppointmentFormData) => {
    // Validar campos obrigatórios que podem ter passado pelo hook-form se a schema for muito permissiva
    if (!data.appointment_time || data.appointment_time === '') {
      toast.error('Horário do agendamento é obrigatório');
      return;
    }

    if (!data.patient_id || data.patient_id === '') {
      toast.error('ID do paciente é obrigatório');
      return;
    }

    if (!data.appointment_date || data.appointment_date === '') {
      toast.error('Data do agendamento é obrigatória');
      return;
    }

    if (!appointment && (!data.therapist_id || String(data.therapist_id).trim() === '')) {
      toast.error('Escolha um fisioterapeuta no formulário.');
      return;
    }

    const maxCapacity = watchedDate && watchedTime ? getCapacityForTime(watchedDate.getDay(), watchedTime) : 1;
    const currentCount = (conflictCheck?.conflictCount || 0);

    if (currentCount >= maxCapacity) {
      setPendingFormData({
        ...data,
        // appointment_date: format(new Date(), 'yyyy-MM-dd') // Don't reset date to today
      });
      setCapacityDialogOpen(true);
      return;
    }

    const appointmentData = data;
    const endTime = new Date(new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`).getTime() + appointmentData.duration * 60000);
    const endTimeString = format(endTime, 'HH:mm');

    // Map internal payment status (paid_single/paid_package) to DB enum
    let dbPaymentStatus: 'pending' | 'paid' | 'partial' | 'overdue' = 'pending';
    if (appointmentData.payment_status === 'paid_single' || appointmentData.payment_status === 'paid_package') {
      dbPaymentStatus = 'paid';
    } else if (appointmentData.payment_status === 'pending' || appointmentData.payment_status === 'partial' || appointmentData.payment_status === 'overdue') {
      dbPaymentStatus = appointmentData.payment_status;
    }

    const formattedData = {
      patient_id: appointmentData.patient_id,
      therapist_id: appointmentData.therapist_id || null,
      date: appointmentData.appointment_date,
      start_time: appointmentData.appointment_time,
      end_time: endTimeString,
      status: appointmentData.status as 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'avaliacao',
      payment_status: dbPaymentStatus,
      notes: appointmentData.notes || '',
      session_type: (appointmentData.type === 'Fisioterapia' ? 'individual' : 'group') as 'individual' | 'group',
      session_package_id: appointmentData.session_package_id || null, // Ensure this is passed
      payment_method: appointmentData.payment_status === 'paid_package' ? 'package' : appointmentData.payment_method, // Set method to package if applicable
    };

    try {
      let appointmentId = appointment?.id;

      if (appointmentId) {
        await updateAppointmentAsync({
          appointmentId: appointmentId,
          updates: formattedData
        });
      } else {
        const newAppointment = await createAppointmentAsync(formattedData as unknown as AppointmentFormData);
        appointmentId = (newAppointment as { id?: string })?.id;
      }

      // Handle Package Consumption
      // Logic: If status is confirmed/attended AND it's a package payment AND package ID is present
      // We check if it wasn't already consumed (this check is basic here, assuming UI prevents double charge or hook handles it)
      if (
        appointmentData.session_package_id &&
        (appointmentData.payment_status === 'paid_package') &&
        (appointmentData.status === 'confirmado' || appointmentData.status === 'atendido' || appointmentData.status === 'concluido')
      ) {
        try {
          // Verify if we should consume:
          // For edits: Only if status changed to verified status? 
          // For now, simpler: Try to consume. The hook logs usage. 
          // Ideally we check if usage exists for this appointmentId to avoid double consumption.
          // But useUsePackageSession doesn't enforce unique constraint on appointment_id in the hook itself, 
          // though the DB table might.
          // Let's assume we consume.

          // Check if we are transitioning to confirmed/attended?
          // If we are editing and it was ALREADY confirmed, we might re-consume?
          // Safe guard: Only consume if we are saving. 
          // Better: The user explicitly selected "Pacote".

          // TODO: Implement better check for existing usage in future.
          if (appointmentId) {
            await consumeSession({
              patientPackageId: appointmentData.session_package_id,
              appointmentId: appointmentId
            });
          }
        } catch (err) {
          logger.error("Error consuming session", err, 'AppointmentModalRefactored');
          toast.error("Erro ao debitar sessão do pacote. Verifique o saldo.");
        }
      }

      if (appointmentData.status === 'avaliacao' && appointmentId && !scheduleOnlyRef.current) {
        const navPath = `/patients/${appointmentData.patient_id}/evaluations/new?appointmentId=${appointmentId}`;
        navigate(navPath);
      }
      scheduleOnlyRef.current = false;

      onClose();

    } catch (error: unknown) {
      if (isAppointmentConflictError(error)) {
        toast.error(APPOINTMENT_CONFLICT_MESSAGE);
        ErrorHandler.handle(error, 'AppointmentModalRefactored:handleSave', { showNotification: false });
      } else {
        ErrorHandler.handle(error, 'AppointmentModalRefactored:handleSave');
      }
    }
  };

  const handleDelete = () => {
    if (appointment?.id) {
      deleteAppointmentMutation(appointment.id, {
        onSuccess: () => {
          toast.success('Agendamento excluído com sucesso');
          onClose();
        },
        onError: () => {
          toast.error('Erro ao excluir agendamento');
        }
      });
    }
  };

  const handleDuplicate = async (config: DuplicateConfig) => {
    if (appointment && config.dates.length > 0) {
      let successCount = 0;
      let errorCount = 0;

      // Simples implementação "fire and forget" com loop
      config.dates.forEach(date => {
        const newTime = config.newTime || appointment.time;
        const newDate = format(date, 'yyyy-MM-dd');
        const duration = appointment.duration || 60;
        const endTime = new Date(new Date(`${newDate}T${newTime}`).getTime() + duration * 60000);
        const endTimeString = format(endTime, 'HH:mm');

        createAppointmentAsync({
          patient_id: appointment.patientId,
          therapist_id: appointment.therapistId || null,
          date: newDate,
          start_time: newTime,
          end_time: endTimeString,
          status: appointment.status,
          payment_status: appointment.payment_status || 'pending',
          notes: appointment.notes || '',
          session_type: (appointment.type === 'Fisioterapia' ? 'individual' : 'group') as 'individual' | 'group',
        } as unknown as AppointmentFormData, {
          onSuccess: () => {
            successCount++;
            if (successCount + errorCount === config.dates.length) {
              if (errorCount === 0) toast.success(`${successCount} agendamentos duplicados com sucesso!`);
              else toast.warning(`${successCount} duplicados, ${errorCount} falharam.`);
            }
          },
          onError: () => {
            errorCount++;
            if (successCount + errorCount === config.dates.length) {
              toast.warning(`${successCount} duplicados, ${errorCount} falharam.`);
            }
          }
        });
      });

      // Fechamos o diálogo imediatamente, feedbacks virão via Toast
      setDuplicateDialogOpen(false);
      toast.info('Iniciando duplicação de agendamentos...');
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
      const endTime = new Date(new Date(`${pendingFormData.appointment_date}T${pendingFormData.appointment_time}`).getTime() + pendingFormData.duration * 60000);
      const endTimeString = format(endTime, 'HH:mm');

      const formattedData = {
        patient_id: pendingFormData.patient_id,
        therapist_id: pendingFormData.therapist_id || null,
        date: pendingFormData.appointment_date,
        start_time: pendingFormData.appointment_time,
        end_time: endTimeString,
        status: pendingFormData.status,
        payment_status: pendingFormData.payment_status || 'pending',
        notes: pendingFormData.notes || '',
        session_type: (pendingFormData.type === 'Fisioterapia' ? 'individual' : 'group') as 'individual' | 'group',
      };

      createAppointmentAsync(formattedData as unknown as AppointmentFormData, {
        onSuccess: () => {
          // Toast já exibido pelo hook
          setCapacityDialogOpen(false);
          setPendingFormData(null);
          onClose();
        }
      });
    }
 };

  // Use CustomModal instead of Dialog/Sheet to avoid React Error #185
  return (
    <CustomModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isMobile={isMobile}
    >
      <CustomModalHeader onClose={onClose}>
        <CustomModalTitle>
          {currentMode === 'view' ? 'Detalhes do Agendamento' : currentMode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}
        </CustomModalTitle>
      </CustomModalHeader>

        <FormProvider {...methods}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-5 sm:px-6 py-3 border-b shrink-0">
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger value="info" className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden xs:inline">Informações</span>
                  <span className="xs:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center gap-2 text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden xs:inline">Pagamento</span>
                  <span className="xs:hidden">Pag.</span>
                </TabsTrigger>
                <TabsTrigger value="options" className="flex items-center gap-2 text-xs sm:text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="hidden xs:inline">Opções</span>
                  <span className="xs:hidden">Opç.</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <form id="appointment-form" onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(handleSave, (errors) => {
                  logger.error('Form validation errors', { errors }, 'AppointmentModalRefactored');
                  toast.error('Verifique os campos obrigatórios do formulário');
                })(e);
              }} className="px-5 sm:px-6 py-4">
                <TabsContent value="info" className="mt-0 space-y-4 sm:space-y-4">
                  <PatientSelectionSection
                    patients={activePatients || []}
                    isLoading={patientsLoading}
                    disabled={currentMode === 'view'}
                    onCreateNew={(searchTerm) => {
                      setSuggestedPatientName(searchTerm);
                      setQuickPatientModalOpen(true);
                    }}
                    fallbackPatientName={
                      lastCreatedPatient?.id === watchedPatientId ? lastCreatedPatient.name : undefined
                    }
                  />

                  <DateTimeSection
                    disabled={currentMode === 'view'}
                    timeSlots={timeSlots}
                    isCalendarOpen={isCalendarOpen}
                    setIsCalendarOpen={setIsCalendarOpen}
                    getCapacityForTime={getCapacityForTime}
                    conflictCount={conflictCheck?.conflictCount || 0}
                    watchedDateStr={watchedDateStr}
                    watchedTime={watchedTime}
                    watchedDuration={watchedDuration}
                    onAutoSchedule={() => {
                      if (!watchedDate) {
                        toast.error('Selecione uma data primeiro');
                        return;
                      }

                      // 1. Analyze Patient History
                      let preferredPeriod: 'morning' | 'afternoon' | 'evening' | null = null;

                      if (watchedPatientId) {
                        const patientHistory = appointments.filter(a =>
                          a.patientId === watchedPatientId &&
                          a.status !== 'cancelado'
                        );

                        if (patientHistory.length > 0) {
                          let morning = 0;
                          let afternoon = 0;
                          let evening = 0;

                          patientHistory.forEach(apt => {
                            const hour = parseInt(apt.time.split(':')[0]);
                            if (hour < 12) morning++;
                            else if (hour < 18) afternoon++;
                            else evening++;
                          });

                          if (morning > afternoon && morning > evening) preferredPeriod = 'morning';
                          else if (afternoon > morning && afternoon > evening) preferredPeriod = 'afternoon';
                          else if (evening > morning && evening > afternoon) preferredPeriod = 'evening';
                        }
                      }

                      // 2. Sort slots based on preference
                      const sortedSlots = [...slotInfo].sort((a, b) => {
                        if (!preferredPeriod) return 0; // Keep original order (chronological)

                        const getPeriod = (time: string) => {
                          const h = parseInt(time.split(':')[0]);
                          if (h < 12) return 'morning';
                          if (h < 18) return 'afternoon';
                          return 'evening';
                        };

                        const periodA = getPeriod(a.time);
                        const periodB = getPeriod(b.time);

                        if (periodA === preferredPeriod && periodB !== preferredPeriod) return -1;
                        if (periodA !== preferredPeriod && periodB === preferredPeriod) return 1;
                        return 0; // Maintain chronological order within same period
                      });

                      const day = watchedDate.getDay();
                      const bestSlot = sortedSlots.find(slot => {
                        if (!slot.isAvailable) return false;
                        // const capacity = getCapacityForTime(day, slot.time);
                        return true;
                      });

                      if (bestSlot) {
                        setValue('appointment_time', bestSlot.time);

                        let reason = "";
                        if (preferredPeriod === 'morning') reason = " (Preferência: Manhã)";
                        else if (preferredPeriod === 'afternoon') reason = " (Preferência: Tarde)";
                        else if (preferredPeriod === 'evening') reason = " (Preferência: Noite)";

                        toast.success(`Horário sugerido: ${bestSlot.time}${reason}`);
                      } else {
                        toast.error('Nenhum horário livre encontrado para esta data');
                      }
                    }}
                  />

                  <TypeAndStatusSection disabled={currentMode === 'view'} />

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                      <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                      Fisioterapeuta
                    </Label>
                    <Select
                      value={watch('therapist_id') || THERAPIST_SELECT_NONE}
                      onValueChange={(value) => setValue('therapist_id', value === THERAPIST_SELECT_NONE ? '' : value)}
                      disabled={currentMode === 'view' || therapistsLoading}
                      aria-label={THERAPIST_PLACEHOLDER}
                    >
                      <SelectTrigger className="h-10 text-xs sm:text-sm">
                        <SelectValue
                          placeholder={therapistsLoading ? 'Carregando...' : THERAPIST_PLACEHOLDER}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={THERAPIST_SELECT_NONE}>
                          {THERAPIST_PLACEHOLDER}
                        </SelectItem>
                        {therapists.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {formatTherapistLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Observações
                    </Label>
                    <Textarea
                      {...methods.register('notes')}
                      placeholder="Informações importantes sobre o atendimento..."
                      rows={2}
                      disabled={currentMode === 'view'}
                      className="resize-none text-sm min-h-[70px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0 space-y-2.5 sm:space-y-3">
                  <PaymentTab
                    disabled={currentMode === 'view'}
                    watchPaymentStatus={watchPaymentStatus || 'pending'}
                    watchPaymentMethod={watchPaymentMethod || ''}
                    watchPaymentAmount={watchPaymentAmount || 0}
                    patientId={watchedPatientId}
                  />
                </TabsContent>

                <TabsContent value="options" className="mt-0 space-y-3 sm:space-y-4">
                  <OptionsTab
                    disabled={currentMode === 'view'}
                    currentMode={currentMode}
                    selectedEquipments={selectedEquipments}
                    setSelectedEquipments={setSelectedEquipments}
                    _isRecurringCalendarOpen={isRecurringCalendarOpen}
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t bg-background shrink-0">
          <div className="flex justify-center sm:justify-start">
            {currentMode === 'edit' && appointment && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                size="default"
              >
                <X className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>

          <div className="flex gap-2 justify-end flex-wrap">
            {currentMode === 'view' && appointment && (
              <Button
                type="button"
                variant="default"
                onClick={() => setCurrentMode('edit')}
                size="default"
              >
                Editar
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating || isUpdating}
              size="default"
            >
              {currentMode === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>

            {currentMode !== 'view' && watchedStatus === 'avaliacao' && (
              <Button
                type="button"
                variant="outline"
                disabled={isCreating || isUpdating}
                size="default"
                className="min-w-[100px]"
                onClick={() => {
                  scheduleOnlyRef.current = true;
                  handleSubmit(handleSave)();
                }}
              >
                {(isCreating || isUpdating) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Agendar
                  </>
                )}
              </Button>
            )}
            {currentMode !== 'view' && (
              <Button
                type="submit"
                form="appointment-form"
                disabled={isCreating || isUpdating}
                onClick={() => { scheduleOnlyRef.current = false; }}
                className={cn(
                  "min-w-[100px]",
                  watchedStatus === 'avaliacao' && "bg-violet-600 hover:bg-violet-700 text-white"
                )}
                size="default"
              >
                {(isCreating || isUpdating) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {watchedStatus === 'avaliacao' ? 'Iniciar Avaliação' : (currentMode === 'edit' ? 'Salvar' : 'Criar')}
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
          onPatientCreated={(patientId, patientName) => {
            setValue('patient_id', patientId);
            setLastCreatedPatient({ id: patientId, name: patientName });
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

        {
          waitlistQuickAddOpen && pendingFormData && (
            <WaitlistQuickAdd
              open={waitlistQuickAddOpen}
              onOpenChange={(open) => {
                setWaitlistQuickAddOpen(open);
                if (!open) setPendingFormData(null);
              }}
              date={pendingFormData.appointment_date ? parseISO(pendingFormData.appointment_date) : new Date()}
              time={pendingFormData.appointment_time}
              defaultPatientId={pendingFormData.patient_id}
            />
          )
        }
    </CustomModal>
  );
};