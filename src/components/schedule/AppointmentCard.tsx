import { memo } from "react";
import { CloudOff } from "lucide-react";
import type { Appointment } from "@/types/appointment";
import { CompactAppointmentCard } from "./AppointmentCard/CompactAppointmentCard";
import { ExpandedAppointmentCard } from "./AppointmentCard/ExpandedAppointmentCard";
import { usePendingSyncIds } from "@/hooks/usePendingSyncIds";
import { cn } from "@/lib/utils";

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
    const pendingIds = usePendingSyncIds("appointments");
    const isPending =
      pendingIds.has(appointment.id) ||
      (typeof appointment.id === "string" && appointment.id.startsWith("offline-"));

    const inner =
      variant === "compact" ? (
        <CompactAppointmentCard
          appointment={appointment}
          onClick={onClick}
          className={className}
          dataAnchor={dataAnchor}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
        />
      ) : (
        <ExpandedAppointmentCard
          appointment={appointment}
          onClick={onClick}
          className={className}
          dataAnchor={dataAnchor}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
        />
      );

    if (!isPending) return inner;

    return (
      <div className={cn("relative", isPending && "opacity-95")}>
        {inner}
        <span
          className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow"
          title="Aguardando sincronização — será enviado ao servidor quando a rede voltar."
        >
          <CloudOff className="h-2.5 w-2.5" />
          Pendente
        </span>
      </div>
    );
  },
  arePropsEqual,
);

AppointmentCard.displayName = "AppointmentCard";
