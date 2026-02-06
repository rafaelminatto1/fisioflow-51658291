import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { parseResponseDate } from '@/utils/dateUtils';
import {

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Edit,
  X,
  MessageCircle,
  Trash2,
  Save,
  AlertTriangle,
  UserCog,
  FileText,
  Play,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { checkAppointmentConflict, formatTimeRange } from '@/utils/appointmentValidation';
import { getAppointmentConflictUserMessage } from '@/utils/appointmentErrors';
import { PatientService } from '@/services/patientService';
import { AppointmentService } from '@/services/appointmentService';
import { getUserOrganizationId } from '@/utils/userHelpers';
import { db, collection, query as firestoreQuery, where, getDocs } from '@/integrations/firebase/app';
import type { Appointment, AppointmentStatus, AppointmentBase } from '@/types/appointment';
import {
  useTherapists,
  formatTherapistLabel,
  THERAPIST_PLACEHOLDER,
} from '@/hooks/useTherapists';
import { normalizeFirestoreData } from '@/utils/firestoreData';

interface AppointmentQuickEditModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

// Status labels e cores - movidos para fora do componente para evitar recriação
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
  agendado: { label: 'Agendado', color: 'bg-blue-500' },
  confirmado: { label: 'Confirmado', color: 'bg-emerald-500' },
  em_andamento: { label: 'Em Andamento', color: 'bg-yellow-500' },
  concluido: { label: 'Concluído', color: 'bg-slate-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' },
  falta: { label: 'Falta', color: 'bg-red-500' },
  faltou: { label: 'Faltou', color: 'bg-red-500' },
  aguardando_confirmacao: { label: 'Aguardando Confirmação', color: 'bg-amber-500' },
  atrasado: { label: 'Atrasado', color: 'bg-rose-500' },
  avaliacao: { label: 'Avaliação', color: 'bg-violet-500' },
  em_espera: { label: 'Em Espera', color: 'bg-cyan-500' },
  remarcado: { label: 'Remarcado', color: 'bg-indigo-500' },
  reagendado: { label: 'Reagendado', color: 'bg-teal-500' },
  atendido: { label: 'Atendido', color: 'bg-emerald-600' },
};

// Status que permitem iniciar atendimento
const STARTABLE_STATUSES: Set<AppointmentStatus> = new Set([
  'confirmado',
  'agendado',
  'avaliacao',
]);

// Opções de duração padronizadas
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface PatientDetails {
  phone?: string;
  birthDate?: string;
}

interface FormData {
  appointment_date: string;
  appointment_time: string;
  duration: number;
  status: AppointmentStatus;
  notes: string;
  therapist_id: string;
}

export const AppointmentQuickEditModal: React.FC<AppointmentQuickEditModalProps> = ({
  appointment,
  open,
  onOpenChange,
  onDeleted: _onDeleted,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cancelAppointment, isCanceling } = useAppointmentActions();

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const { therapists } = useTherapists();
  const [formData, setFormData] = useState<FormData>({
    appointment_date: '',
    appointment_time: '',
    duration: 60,
    status: 'agendado',
    notes: '',
    therapist_id: '',
  });

  // Query para buscar agendamentos (verificação de conflitos)
  const { data: appointments = [] } = useQuery<AppointmentBase[]>({
    queryKey: ['appointments-for-conflict', open, appointment?.date],
    queryFn: async () => {
      if (!appointment?.date) return [];
      const appointmentDate = appointment.date.toISOString().split('T')[0];

      const q = firestoreQuery(
        collection(db, 'appointments'),
        where('appointment_date', '==', appointmentDate),
        where('status', 'in', ['agendado', 'confirmado', 'em_andamento'])
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          patientId: data.patient_id,
          patientName: data.patient_name || 'Desconhecido',
          date: data.appointment_date ? new Date(data.appointment_date) : new Date(),
          time: data.appointment_time || '00:00',
          duration: data.duration || 60,
          status: data.status || 'agendado',
          therapistId: data.therapist_id,
        } as AppointmentBase;
      });
    },
    staleTime: 30000,
    enabled: open && !!appointment?.date,
  });

  // Mutation para atualizar agendamento com atualização otimista completa
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, updates }: {
      appointmentId: string;
      updates: {
        appointment_date: string;
        appointment_time: string;
        duration: number;
        status: AppointmentStatus;
        notes: string;
        therapist_id: string | null;
      };
    }) => {
      const organizationId = await getUserOrganizationId();
      return await AppointmentService.updateAppointment(appointmentId, updates, organizationId);
    },
    onMutate: async ({ appointmentId, updates }) => {
      // Cancela qualquer refetch em andamento para evitar sobrescrever nossa atualização otimista
      await queryClient.cancelQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'appointments'
      });

      // Snapshot dos valores anteriores - coletar todas as queries de appointments
      const previousQueries = queryClient.getQueriesData({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'appointments'
      });

      // Atualização otimista: atualiza localmente todos os campos modificados
      queryClient.setQueriesData(
        { predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'appointments' },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;

          const oldData = old as { data?: AppointmentBase[]; isFromCache?: boolean; cacheTimestamp?: string | null };

          if (!oldData.data || !Array.isArray(oldData.data)) return old;

          return {
            ...oldData,
            data: oldData.data.map((apt) =>
              apt.id === appointmentId
                ? {
                  ...apt,
                  // Atualiza todos os campos que podem mudar visualmente
                  ...(updates.appointment_date && {
                    date: new Date(updates.appointment_date + 'T12:00:00')
                  }),
                  ...(updates.appointment_time && { time: updates.appointment_time }),
                  ...(updates.duration && { duration: updates.duration }),
                  ...(updates.status && { status: updates.status }),
                  ...(updates.notes !== undefined && { notes: updates.notes }),
                  updatedAt: new Date(),
                }
                : apt
            )
          };
        }
      );

      return { previousQueries, appointmentId };
    },
    onSuccess: () => {
      // Invalida queries para garantir sincronia com o servidor
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'appointments'
      });
      queryClient.invalidateQueries({ queryKey: ['appointments-for-conflict'] });

      toast.success('Agendamento atualizado com sucesso');
      setIsEditing(false);
    },
    onError: (error: Error, _variables, context) => {
      // Reverte para o estado anterior em caso de erro
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }

      // Mensagem de erro mais descritiva (inclui 409 do backend)
      const errorMessage =
        getAppointmentConflictUserMessage(error) ??
        (error.message.includes('duplicate')
          ? 'Já existe um agendamento neste horário.'
          : error.message.includes('permission')
            ? 'Você não tem permissão para alterar este agendamento.'
            : 'Erro ao atualizar agendamento. Tente novamente.');

      toast.error(errorMessage);
    },
  });

  // Carregar detalhes do paciente
  useEffect(() => {
    if (appointment?.patientId && open) {
      PatientService.getPatientById(appointment.patientId)
        .then(({ data }) => {
          if (data) {
            setPatientDetails({
              phone: (data as { phone?: string | null }).phone || undefined,
              birthDate: (data as { birth_date?: string | null }).birth_date || undefined,
            });
          }
        })
        .catch(() => {
          setPatientDetails(null);
        });
    }
  }, [appointment?.patientId, open]);

  // Inicializar formulário quando o agendamento mudar
  useEffect(() => {
    if (appointment) {
      const dateStr = appointment.date instanceof Date
        ? format(appointment.date, 'yyyy-MM-dd')
        : String(appointment.date);

      const aptWithTherapist = appointment as Appointment & { therapist_id?: string };

      setFormData({
        appointment_date: dateStr,
        appointment_time: appointment.time,
        duration: appointment.duration || 60,
        status: appointment.status as AppointmentStatus,
        notes: appointment.notes || '',
        therapist_id: aptWithTherapist.therapist_id || '',
      });
      setIsEditing(false);
      setConflictError(null);
    }
  }, [appointment]);

  // Verificar conflitos durante edição
  useEffect(() => {
    if (isEditing && formData.appointment_date && formData.appointment_time) {
      const result = checkAppointmentConflict({
        date: new Date(formData.appointment_date + 'T00:00:00'),
        time: formData.appointment_time,
        duration: formData.duration,
        excludeId: appointment?.id,
        appointments: appointments,
      });

      setConflictError(
        result.hasConflict
          ? `Conflito com agendamento de ${result.conflictingAppointment?.patientName || 'outro paciente'}`
          : null
      );
    }
  }, [formData.appointment_date, formData.appointment_time, formData.duration, isEditing, appointment?.id, appointments]);

  // Calculos memoizados
  const patientAge = useMemo(() => {
    if (patientDetails?.birthDate) {
      try {
        return differenceInYears(new Date(), parseISO(patientDetails.birthDate));
      } catch {
        return null;
      }
    }
    return null;
  }, [patientDetails?.birthDate]);

  const canStartAttendance = useMemo(
    () => STARTABLE_STATUSES.has(formData.status),
    [formData.status]
  );

  const dateFormatted = useMemo(
    () => formData.appointment_date
      ? format(parseResponseDate(formData.appointment_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
      : '',
    [formData.appointment_date]
  );

  const statusConfig = STATUS_CONFIG[formData.status];

  // Handlers
  const handleSave = useCallback(() => {
    if (!appointment) return;

    if (conflictError) {
      toast.error('Resolva o conflito de horário antes de salvar');
      return;
    }

    updateAppointmentMutation.mutate({
      appointmentId: appointment.id,
      updates: {
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        duration: formData.duration,
        status: formData.status,
        notes: formData.notes,
        therapist_id: formData.therapist_id || null,
      },
    });
  }, [appointment, formData, conflictError, updateAppointmentMutation]);

  const handleCancel = useCallback(() => {
    if (!appointment) return;

    cancelAppointment(appointment.id, {
      onSuccess: () => {
        toast.success('Agendamento cancelado');
        setShowCancelConfirm(false);
        onOpenChange(false);
        _onDeleted?.();
      },
      onError: (error: Error) => {
        toast.error('Erro ao cancelar: ' + error.message);
      },
    });
  }, [appointment, cancelAppointment, onOpenChange, _onDeleted]);

  const handleWhatsAppConfirm = useCallback(() => {
    if (!appointment) return;

    const phone = patientDetails?.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Paciente não possui telefone cadastrado');
      return;
    }

    const dateShort = formData.appointment_date
      ? format(parseResponseDate(formData.appointment_date), "dd 'de' MMMM", { locale: ptBR })
      : '';

    const message = encodeURIComponent(
      `Olá ${appointment.patientName}! 👋\n\n` +
      `Confirmamos sua consulta para o dia *${dateShort}* às *${formData.appointment_time}*.\n\n` +
      `Por favor, confirme sua presença respondendo esta mensagem.\n\n` +
      `Activity Fisioterapia 💙`
    );

    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    toast.success('WhatsApp aberto para confirmação');
  }, [appointment, patientDetails?.phone, formData.appointment_date, formData.appointment_time]);

  const handleStartAttendance = useCallback(() => {
    if (!appointment) return;

    if (formData.status === 'avaliacao') {
      navigate(`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`);
      toast.success('Iniciando avaliação', {
        description: `Avaliação de ${appointment.patientName}`,
      });
    } else {
      navigate(`/patient-evolution/${appointment.id}`);
      toast.success('Iniciando atendimento', {
        description: `Atendimento de ${appointment.patientName}`,
      });
    }
    onOpenChange(false);
  }, [appointment, formData.status, navigate, onOpenChange]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setConflictError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleResetForm = useCallback(() => {
    if (!appointment) return;

    const dateStr = appointment.date instanceof Date
      ? format(appointment.date, 'yyyy-MM-dd')
      : String(appointment.date);
    const aptWithTherapist = appointment as Appointment & { therapist_id?: string };

    setFormData({
      appointment_date: dateStr,
      appointment_time: appointment.time,
      duration: appointment.duration || 60,
      status: appointment.status as AppointmentStatus,
      notes: appointment.notes || '',
      therapist_id: aptWithTherapist.therapist_id || '',
    });
    setConflictError(null);
    setIsEditing(false);
  }, [appointment]);

  const updateFormField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!appointment) return null;

  const isSaving = updateAppointmentMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-semibold truncate">
                    {isEditing ? 'Editar Agendamento' : 'Detalhes do Agendamento'}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5 truncate">
                    {formatTimeRange(formData.appointment_time, formData.duration)}
                  </DialogDescription>
                </div>
              </div>
              <Badge className={cn("text-white text-xs shrink-0", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Patient Info Card */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{appointment.patientName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {patientDetails?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {patientDetails.phone}
                      </span>
                    )}
                    {patientAge !== null && (
                      <span>• {patientAge} anos</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conflict Alert */}
            {conflictError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">{conflictError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid gap-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Data
                  </Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => updateFormField('appointment_date', e.target.value)}
                      className="h-9"
                      aria-label="Data do agendamento"
                    />
                  ) : (
                    <p className="text-sm font-medium py-2 capitalize">
                      {dateFormatted}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Horário
                  </Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => updateFormField('appointment_time', e.target.value)}
                      className="h-9"
                      aria-label="Horário do agendamento"
                    />
                  ) : (
                    <p className="text-sm font-medium py-2">{formData.appointment_time}</p>
                  )}
                </div>
              </div>

              {/* Duration & Therapist */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Duração (min)</Label>
                  {isEditing ? (
                    <Select
                      value={String(formData.duration)}
                      onValueChange={(value) => updateFormField('duration', parseInt(value))}
                    >
                      <SelectTrigger className="h-9" aria-label="Duração do agendamento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((duration) => (
                          <SelectItem key={duration} value={String(duration)}>
                            {duration} minutos
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium py-2">{formData.duration} minutos</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <UserCog className="h-3.5 w-3.5" />
                    Fisioterapeuta
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.therapist_id}
                      onValueChange={(value) => updateFormField('therapist_id', value)}
                    >
                      <SelectTrigger className="h-9" aria-label={THERAPIST_PLACEHOLDER}>
                        <SelectValue placeholder={THERAPIST_PLACEHOLDER} />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {formatTherapistLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium py-2">
                      {formData.therapist_id
                        ? (() => {
                            const t = therapists.find(t => t.id === formData.therapist_id);
                            return t ? formatTherapistLabel(t) : 'Não atribuído';
                          })()
                        : THERAPIST_PLACEHOLDER}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateFormField('status', value as AppointmentStatus)}
                  >
                    <SelectTrigger className="h-9" aria-label="Status do agendamento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", config.color)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusConfig.color)} />
                    <span className="text-sm font-medium">{statusConfig.label}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Observações
                </Label>
                {isEditing ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => updateFormField('notes', e.target.value)}
                    placeholder="Observações do agendamento..."
                    className="min-h-[80px] resize-none"
                    aria-label="Observações do agendamento"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    {formData.notes || 'Nenhuma observação'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer Actions */}
          <DialogFooter className="px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleResetForm}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !!conflictError}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2 w-full sm:w-auto">
                  {canStartAttendance && (
                    <Button
                      onClick={handleStartAttendance}
                      className={cn(
                        "flex-1 sm:flex-none text-white",
                        formData.status === 'avaliacao'
                          ? "bg-violet-600 hover:bg-violet-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                      aria-label={
                        formData.status === 'avaliacao'
                          ? 'Iniciar avaliação do paciente'
                          : 'Iniciar atendimento do paciente'
                      }
                    >
                      {formData.status === 'avaliacao' ? (
                        <>
                          <FileText className="h-4 w-4 mr-1.5" />
                          Iniciar Avaliação
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1.5" />
                          Iniciar Atendimento
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                    aria-label="Cancelar agendamento"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppConfirm}
                    className="flex-1 sm:flex-none text-green-600 hover:text-green-700"
                    aria-label="Enviar confirmação via WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    WhatsApp
                  </Button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 sm:flex-none"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 sm:flex-none"
                    aria-label="Editar agendamento"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Agendamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o agendamento de{' '}
              <strong>{appointment.patientName}</strong> para{' '}
              <strong>{dateFormatted}</strong> às <strong>{formData.appointment_time}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, Cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
