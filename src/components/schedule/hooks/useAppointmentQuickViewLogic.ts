import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useWaitlistMatch } from '@/hooks/useWaitlistMatch';
import { usePatientPackages } from '@/hooks/usePackages';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import { prefetchRoute, RouteKeys } from '@/lib/routing/routePrefetch';
import { appointmentsApi } from '@/lib/api/workers-client';
import { normalizeStatus } from '../shared/appointment-status';
import { type Appointment, type AppointmentStatus } from "@/types/appointment";

interface UseAppointmentQuickViewLogicProps {
  appointment: Appointment;
  onEdit?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export const useAppointmentQuickViewLogic = ({
  appointment,
  onEdit,
  onOpenChange,
}: UseAppointmentQuickViewLogicProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateStatus, isUpdatingStatus } = useAppointmentActions();
  const { getInterestCount } = useWaitlistMatch();
  const { data: patientPackages = [] } = usePatientPackages(appointment.patientId);
  const { mutateAsync: updateAppointment } = useUpdateAppointment();

  const [showWaitlistNotification, setShowWaitlistNotification] = useState(false);
  const [showWaitlistQuickAdd, setShowWaitlistQuickAdd] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoShowConfirmDialog, setShowNoShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Local state for optimistic updates
  const [localStatus, setLocalStatus] = useState(appointment.status);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(() =>
    ((appointment.payment_status ?? 'pending') as string).toLowerCase()
  );
  const [localTherapistId, setLocalTherapistId] = useState(appointment.therapistId ?? '');

  useEffect(() => {
    setLocalStatus(normalizeStatus(appointment.status));
    setLocalPaymentStatus(((appointment.payment_status ?? 'pending') as string).toLowerCase());
    setLocalTherapistId(appointment.therapistId ?? '');
  }, [appointment.status, appointment.payment_status, appointment.therapistId]);

  const appointmentDate = useMemo((): Date => {
    const d = appointment.date;
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    if (typeof d === 'string' && String(d).trim()) {
      const parts = String(d).split('-').map(Number);
      if (parts.length === 3) {
        const [y, m, day] = parts;
        const parsed = new Date(y, m - 1, day, 12, 0, 0);
        if (Number.isFinite(parsed.getTime())) return parsed;
      }
    }
    return new Date();
  }, [appointment.date]);

  const interestCount = getInterestCount(appointmentDate, appointment.time);
  const hasWaitlistInterest = interestCount > 0;

  const handleStartAttendance = useCallback(() => {
    if (localStatus === 'avaliacao') {
      prefetchRoute(() => import('../../../pages/patients/NewEvaluationPage'), 'evaluation-new');
      navigate(`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`);
      toast.success('Iniciando avaliação', { description: `Avaliação de ${appointment.patientName}` });
    } else {
      prefetchRoute(() => import('../../../pages/PatientEvolution'), RouteKeys.PATIENT_EVOLUTION);
      queryClient.prefetchQuery({
        queryKey: ['appointment', appointment.id],
        queryFn: () => appointmentsApi.get(appointment.id),
        staleTime: 1000 * 60 * 2,
      });
      navigate(`/patient-evolution/${appointment.id}`, {
        state: { patientId: appointment.patientId, patientName: appointment.patientName }
      });
      toast.success('Iniciando atendimento', { description: `Atendimento de ${appointment.patientName}` });
    }
    onOpenChange?.(false);
  }, [localStatus, appointment, navigate, queryClient, onOpenChange]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (newStatus === appointment.status) return;
    if (newStatus === 'falta') {
      setPendingStatus(newStatus);
      setShowNoShowConfirmDialog(true);
      return;
    }
    setLocalStatus(newStatus as AppointmentStatus);
    updateStatus({ appointmentId: appointment.id, status: newStatus });
    onOpenChange?.(false);
    if ((newStatus === 'cancelado' || newStatus === 'falta') && hasWaitlistInterest) {
      setTimeout(() => setShowWaitlistNotification(true), 500);
    }
  }, [appointment, updateStatus, onOpenChange, hasWaitlistInterest]);

  const handleNoShowConfirm = useCallback(() => {
    if (pendingStatus) {
      setLocalStatus(pendingStatus as AppointmentStatus);
      updateStatus({ appointmentId: appointment.id, status: pendingStatus });
      setShowNoShowConfirmDialog(false);
      setPendingStatus(null);
      onOpenChange?.(false);
    }
  }, [pendingStatus, updateStatus, onOpenChange]);

  const handleNoShowReschedule = useCallback(() => {
    if (pendingStatus) {
      setLocalStatus(pendingStatus as AppointmentStatus);
      updateStatus({ appointmentId: appointment.id, status: pendingStatus });
      setShowNoShowConfirmDialog(false);
      setPendingStatus(null);
      onOpenChange?.(false);
      setTimeout(() => onEdit?.(), 100);
    }
  }, [pendingStatus, updateStatus, onOpenChange, onEdit]);

  const handleTherapistChange = useCallback(async (therapistId: string) => {
    if (therapistId === localTherapistId) return;
    setLocalTherapistId(therapistId);
    try {
      await updateAppointment({
        appointmentId: appointment.id,
        updates: { therapist_id: therapistId || null },
      });
    } catch {
      setLocalTherapistId(appointment.therapistId ?? '');
    }
  }, [localTherapistId, appointment, updateAppointment]);

  const handlePaymentStatusChange = useCallback(async (value: string) => {
    const newStatus = value === 'paid' ? 'paid' : 'pending';
    if (newStatus === 'paid' && localPaymentStatus !== 'paid') {
      setShowPaymentModal(true);
      return;
    }
    if (newStatus === localPaymentStatus) return;
    setLocalPaymentStatus(newStatus);
    try {
      await updateAppointment({
        appointmentId: appointment.id,
        updates: { payment_status: newStatus },
      });
    } catch {
      setLocalPaymentStatus(((appointment.payment_status ?? 'pending') as string).toLowerCase());
    }
  }, [localPaymentStatus, appointment, updateAppointment]);

  const handlePaymentSuccess = useCallback(() => {
    setLocalPaymentStatus('paid');
  }, []);

  return {
    localStatus,
    localPaymentStatus,
    localTherapistId,
    appointmentDate,
    interestCount,
    hasWaitlistInterest,
    showWaitlistNotification, setShowWaitlistNotification,
    showWaitlistQuickAdd, setShowWaitlistQuickAdd,
    showPaymentModal, setShowPaymentModal,
    showNoShowConfirmDialog, setShowNoShowConfirmDialog,
    handleStartAttendance,
    handleStatusChange,
    handleNoShowConfirm,
    handleNoShowReschedule,
    handleTherapistChange,
    handlePaymentStatusChange,
    handlePaymentSuccess,
    patientPackages,
    isUpdatingStatus,
  };
};
