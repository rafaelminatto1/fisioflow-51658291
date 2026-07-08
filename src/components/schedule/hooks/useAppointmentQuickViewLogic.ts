import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import { useWaitlistMatch } from "@/hooks/useWaitlistMatch";
import { usePatientPackages } from "@/hooks/usePackages";
import { useUpdateAppointment } from "@/hooks/useAppointments";
import { APP_ROUTES, patientRoutes } from "@/lib/routing/appRoutes";
import { prefetchRoute, RouteKeys } from "@/lib/routing/routePrefetch";
import { appointmentsApi } from "@/api/v2";
import { normalizeStatus } from "../shared/appointment-status";
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
  const { mutateAsync: updateAppointment, isPending: isUpdatingAppointment } = useUpdateAppointment();

  const [showWaitlistNotification, setShowWaitlistNotification] = useState(false);
  const [showWaitlistQuickAdd, setShowWaitlistQuickAdd] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoShowConfirmDialog, setShowNoShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [pendingAppointmentField, setPendingAppointmentField] = useState<
    "therapist" | "payment" | null
  >(null);

  // Local state for optimistic updates
  const [localStatus, setLocalStatus] = useState(() => normalizeStatus(appointment.status));
  const [localPaymentStatus, setLocalPaymentStatus] = useState(() =>
    ((appointment.payment_status ?? "pending") as string).toLowerCase(),
  );
  const [localTherapistId, setLocalTherapistId] = useState(appointment.therapistId ?? "");

  // Track whether the user initiated a local status, payment or therapist change
  // that hasn't been confirmed by the server yet. While these are set, we block
  // the useEffect from reverting the local state to the stale server values.
  const pendingStatusChangeRef = useRef<string | null>(null);
  const pendingPaymentStatusChangeRef = useRef<string | null>(null);
  const pendingTherapistChangeRef = useRef<string | null>(null);

  // When the status mutation finishes (success or error), clear the status lock.
  useEffect(() => {
    if (!isUpdatingStatus) {
      pendingStatusChangeRef.current = null;
    }
  }, [isUpdatingStatus]);

  // When the general appointment update mutation finishes, clear the general locks.
  useEffect(() => {
    if (!isUpdatingAppointment) {
      pendingPaymentStatusChangeRef.current = null;
      pendingTherapistChangeRef.current = null;
    }
  }, [isUpdatingAppointment]);

  useEffect(() => {
    const serverStatus = normalizeStatus(appointment.status);
    const serverPaymentStatus = ((appointment.payment_status ?? "pending") as string).toLowerCase();
    const serverTherapistId = appointment.therapistId ?? "";

    // Only sync from server when we're not in the middle of an optimistic update.
    if (pendingStatusChangeRef.current === null) {
      setLocalStatus(serverStatus);
    }
    if (pendingPaymentStatusChangeRef.current === null) {
      setLocalPaymentStatus(serverPaymentStatus);
    }
    if (pendingTherapistChangeRef.current === null) {
      setLocalTherapistId(serverTherapistId);
    }
  }, [appointment.status, appointment.payment_status, appointment.therapistId]);

  const appointmentDate = useMemo((): Date => {
    const d = appointment.date;
    if (d instanceof Date && !isNaN(d.getTime())) return d;
    if (typeof d === "string" && String(d).trim()) {
      const parts = String(d).split("-").map(Number);
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

  const prefetchEvolution = useCallback(() => {
    prefetchRoute(() => import("../../../pages/PatientEvolution"), RouteKeys.PATIENT_EVOLUTION);
    void queryClient.prefetchQuery({
      queryKey: ["appointment", appointment.id],
      queryFn: () => appointmentsApi.get(appointment.id),
      staleTime: 1000 * 60 * 2,
    });
  }, [appointment.id, queryClient]);

  const handleOpenProfile = useCallback(() => {
    navigate(patientRoutes.profile(appointment.patientId));
    onOpenChange?.(false);
  }, [appointment.patientId, navigate, onOpenChange]);

  const handleOpenEvolution = useCallback(() => {
    prefetchEvolution();
    navigate(`/patient-evolution/${appointment.id}`, {
      state: {
        patientId: appointment.patientId,
        patientName: appointment.patientName,
      },
    });
    onOpenChange?.(false);
  }, [appointment, navigate, onOpenChange, prefetchEvolution]);

  const handleOpenEvaluation = useCallback(() => {
    prefetchRoute(() => import("../../../pages/patients/NewEvaluationPage"), "evaluation-new");
    navigate(`/patients/${appointment.patientId}/evaluations/new?appointmentId=${appointment.id}`);
    onOpenChange?.(false);
  }, [appointment.id, appointment.patientId, navigate, onOpenChange]);

  const handleOpenPrescription = useCallback(() => {
    navigate(`${APP_ROUTES.EXERCISES}?patientId=${appointment.patientId}`);
    onOpenChange?.(false);
  }, [appointment.patientId, navigate, onOpenChange]);

  const handleStartAttendance = useCallback(() => {
    if (localStatus === "avaliacao") {
      handleOpenEvaluation();
      toast.success("Iniciando avaliação", {
        description: `Avaliação de ${appointment.patientName}`,
      });
    } else {
      handleOpenEvolution();
      toast.success("Iniciando atendimento", {
        description: `Atendimento de ${appointment.patientName}`,
      });
    }
  }, [localStatus, appointment.patientName, handleOpenEvaluation, handleOpenEvolution]);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const normalized = normalizeStatus(newStatus);
      if (normalized === normalizeStatus(appointment.status) && normalized === localStatus) return;
      if (newStatus === "falta") {
        setPendingStatus(newStatus);
        setShowNoShowConfirmDialog(true);
        return;
      }
      // Lock out the useEffect sync until the mutation finishes (isUpdatingStatus → false)
      pendingStatusChangeRef.current = normalized;
      setLocalStatus(normalized as AppointmentStatus);
      updateStatus({ appointmentId: appointment.id, status: newStatus });
      onOpenChange?.(false);
      if ((newStatus === "cancelado" || newStatus === "falta") && hasWaitlistInterest) {
        setTimeout(() => setShowWaitlistNotification(true), 500);
      }
    },
    [appointment, localStatus, updateStatus, onOpenChange, hasWaitlistInterest],
  );

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

  const handleTherapistChange = useCallback(
    async (therapistId: string) => {
      if (therapistId === localTherapistId) return;
      pendingTherapistChangeRef.current = therapistId;
      setPendingAppointmentField("therapist");
      setLocalTherapistId(therapistId);
      try {
        await updateAppointment({
          appointmentId: appointment.id,
          updates: { therapist_id: therapistId || null },
        });
      } catch {
        setLocalTherapistId(appointment.therapistId ?? "");
        toast.error("Não foi possível atualizar o fisioterapeuta", {
          description: "A alteração foi desfeita. Tente novamente.",
        });
      } finally {
        setPendingAppointmentField(null);
      }
    },
    [localTherapistId, appointment, updateAppointment],
  );

  const handlePaymentStatusChange = useCallback(
    async (value: string) => {
      const newStatus = value === "paid" ? "paid" : "pending";
      if (newStatus === "paid" && localPaymentStatus !== "paid") {
        setShowPaymentModal(true);
        return;
      }
      if (newStatus === localPaymentStatus) return;
      pendingPaymentStatusChangeRef.current = newStatus;
      setPendingAppointmentField("payment");
      setLocalPaymentStatus(newStatus);
      try {
        await updateAppointment({
          appointmentId: appointment.id,
          updates: { payment_status: newStatus },
        });
      } catch {
        setLocalPaymentStatus(((appointment.payment_status ?? "pending") as string).toLowerCase());
        toast.error("Não foi possível atualizar o financeiro", {
          description: "A alteração foi desfeita. Tente novamente.",
        });
      } finally {
        setPendingAppointmentField(null);
      }
    },
    [localPaymentStatus, appointment, updateAppointment],
  );

  const handlePaymentSuccess = useCallback(() => {
    setLocalPaymentStatus("paid");
  }, []);

  return {
    localStatus,
    localPaymentStatus,
    localTherapistId,
    appointmentDate,
    interestCount,
    hasWaitlistInterest,
    showWaitlistNotification,
    setShowWaitlistNotification,
    showWaitlistQuickAdd,
    setShowWaitlistQuickAdd,
    showPaymentModal,
    setShowPaymentModal,
    showNoShowConfirmDialog,
    setShowNoShowConfirmDialog,
    handleStartAttendance,
    handleOpenProfile,
    handleOpenEvolution,
    handleOpenEvaluation,
    handleOpenPrescription,
    handleStatusChange,
    handleNoShowConfirm,
    handleNoShowReschedule,
    handleTherapistChange,
    handlePaymentStatusChange,
    handlePaymentSuccess,
    patientPackages,
    isUpdatingStatus,
    isUpdatingAppointment,
    pendingAppointmentField,
  };
};
