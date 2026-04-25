import { memo } from "react";
import type { Appointment } from "@/types/appointment";
import { CompactAppointmentCard } from "./AppointmentCard/CompactAppointmentCard";
import { ExpandedAppointmentCard } from "./AppointmentCard/ExpandedAppointmentCard";

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  variant?: "compact" | "expanded";
  className?: string;
  "data-appointment-popover-anchor"?: string;
  onStatusChange?: (status: string) => void;
  onEdit?: () => void;
}

/**
 * Memo comparison function for AppointmentCard
 * Only re-renders when appointment data actually changes
 */
function arePropsEqual(prevProps: AppointmentCardProps, nextProps: AppointmentCardProps): boolean {
  return (
    prevProps.appointment.id === nextProps.appointment.id &&
    prevProps.appointment.status === nextProps.appointment.status &&
    prevProps.appointment.time === nextProps.appointment.time &&
    prevProps.appointment.patientName === nextProps.appointment.patientName &&
    prevProps.appointment.type === nextProps.appointment.type &&
    prevProps.appointment.date === nextProps.appointment.date &&
    prevProps.appointment.notes === nextProps.appointment.notes &&
    prevProps.appointment.duration === nextProps.appointment.duration &&
    prevProps.appointment.isOverbooked === nextProps.appointment.isOverbooked &&
    prevProps.variant === nextProps.variant
  );
}

/**
 * AppointmentCard - Orchestrator for compact and expanded variants
 */
export const AppointmentCard = memo(
  ({
    appointment,
    onClick,
    variant = "expanded",
    className,
    "data-appointment-popover-anchor": dataAnchor,
    onStatusChange,
    onEdit,
  }: AppointmentCardProps) => {
    if (variant === "compact") {
      return (
        <CompactAppointmentCard
          appointment={appointment}
          onClick={onClick}
          className={className}
          dataAnchor={dataAnchor}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
        />
      );
    }

    return (
      <ExpandedAppointmentCard
        appointment={appointment}
        onClick={onClick}
        className={className}
        dataAnchor={dataAnchor}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
      />
    );
  },
  arePropsEqual,
);

AppointmentCard.displayName = "AppointmentCard";
