import React, { memo } from 'react';
import { Clock, User, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/agenda';

interface AppointmentBlockProps {
  appointment: Appointment;
  onClick?: () => void;
  size?: 'compact' | 'normal' | 'expanded';
  showPatientInfo?: boolean;
  showPaymentStatus?: boolean;
  showTimeInfo?: boolean;
  className?: string;
}

export const AppointmentBlock = memo(function AppointmentBlock({
  appointment,
  onClick,
  size = 'normal',
  showPatientInfo = true,
  showPaymentStatus = true,
  showTimeInfo = true,
  className
}: AppointmentBlockProps) {
  const statusConfig = getStatusConfig(appointment.status);
  const paymentConfig = getPaymentStatusConfig(appointment.payment_status);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <div
      className={cn(
        "relative rounded-md border cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02] hover:z-10",
        statusConfig.bgColor,
        statusConfig.borderColor,
        statusConfig.textColor,
        size === 'compact' && "p-1 text-xs",
        size === 'normal' && "p-2 text-sm",
        size === 'expanded' && "p-3 text-sm",
        className
      )}
      onClick={handleClick}
    >
      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          {statusConfig.icon}
          {size !== 'compact' && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", statusConfig.badgeColor)}
            >
              {statusConfig.label}
            </Badge>
          )}
        </div>
        
        {showPaymentStatus && (
          <div className="flex items-center gap-1">
            {paymentConfig.icon}
            {size === 'expanded' && (
              <span className={cn("text-xs", paymentConfig.textColor)}>
                {paymentConfig.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Patient Information */}
      {showPatientInfo && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium truncate">
              {appointment.patient?.name || 'Paciente não informado'}
            </span>
          </div>
          
          {size !== 'compact' && appointment.patient?.phone && (
            <div className="text-xs opacity-75 truncate">
              {appointment.patient.phone}
            </div>
          )}
        </div>
      )}

      {/* Time Information */}
      {showTimeInfo && (
        <div className="flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs">
            {appointment.start_time} - {appointment.end_time}
          </span>
        </div>
      )}

      {/* Session Type */}
      {size !== 'compact' && (
        <div className="mt-1">
          <Badge 
            variant="outline" 
            className="text-xs"
          >
            {appointment.session_type === 'individual' ? 'Individual' : 'Grupo'}
          </Badge>
        </div>
      )}

      {/* Notes Preview */}
      {size === 'expanded' && appointment.notes && (
        <div className="mt-2 text-xs opacity-75 line-clamp-2">
          {appointment.notes}
        </div>
      )}

      {/* Payment Amount (if available) */}
      {size === 'expanded' && appointment.patient?.session_price && (
        <div className="flex items-center gap-1 mt-1 text-xs">
          <DollarSign className="h-3 w-3" />
          <span>R$ {appointment.patient.session_price.toFixed(2)}</span>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity rounded-md pointer-events-none" />
    </div>
  );
});

// Multi-appointment block for when there are multiple appointments in the same slot
interface MultiAppointmentBlockProps {
  appointments: Appointment[];
  onClick?: (appointmentId: string) => void;
  maxVisible?: number;
  className?: string;
}

export const MultiAppointmentBlock = memo(function MultiAppointmentBlock({
  appointments,
  onClick,
  maxVisible = 2,
  className
}: MultiAppointmentBlockProps) {
  const visibleAppointments = appointments.slice(0, maxVisible);
  const hiddenCount = Math.max(0, appointments.length - maxVisible);

  return (
    <div className={cn("space-y-1", className)}>
      {visibleAppointments.map((appointment, index) => (
        <AppointmentBlock
          key={appointment.id}
          appointment={appointment}
          onClick={() => onClick?.(appointment.id)}
          size="compact"
          showPaymentStatus={false}
          showTimeInfo={index === 0} // Only show time for first appointment
          className={index > 0 ? "opacity-90" : ""}
        />
      ))}
      
      {hiddenCount > 0 && (
        <div className="text-xs text-center text-muted-foreground py-1 bg-muted/30 rounded border-dashed border">
          +{hiddenCount} mais
        </div>
      )}
    </div>
  );
});

// Appointment block for different views
interface AppointmentListItemProps {
  appointment: Appointment;
  onClick?: () => void;
  showDate?: boolean;
  className?: string;
}

export function AppointmentListItem({
  appointment,
  onClick,
  showDate = false,
  className
}: AppointmentListItemProps) {
  const statusConfig = getStatusConfig(appointment.status);
  const paymentConfig = getPaymentStatusConfig(appointment.payment_status);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        "hover:bg-muted/50",
        statusConfig.bgColor,
        statusConfig.borderColor,
        className
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {statusConfig.icon}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">
            {appointment.patient?.name || 'Paciente não informado'}
          </span>
          <Badge variant="secondary" className="text-xs">
            {statusConfig.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {showDate && `${appointment.date} `}
              {appointment.start_time} - {appointment.end_time}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {paymentConfig.icon}
            <span>{paymentConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Session Price */}
      {appointment.patient?.session_price && (
        <div className="flex-shrink-0 text-sm font-medium">
          R$ {appointment.patient.session_price.toFixed(2)}
        </div>
      )}
    </div>
  );
}

// Status configuration
function getStatusConfig(status: Appointment['status']) {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Agendado',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        badgeColor: 'bg-blue-100 text-blue-800',
        icon: <Clock className="h-3 w-3 text-blue-600" />
      };
    case 'completed':
      return {
        label: 'Concluído',
        bgColor: 'bg-green-50 hover:bg-green-100',
        borderColor: 'border-green-200',
        textColor: 'text-green-900',
        badgeColor: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-3 w-3 text-green-600" />
      };
    case 'missed':
      return {
        label: 'Faltou',
        bgColor: 'bg-red-50 hover:bg-red-100',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        badgeColor: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-3 w-3 text-red-600" />
      };
    case 'cancelled':
      return {
        label: 'Cancelado',
        bgColor: 'bg-gray-50 hover:bg-gray-100',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-900',
        badgeColor: 'bg-gray-100 text-gray-800',
        icon: <XCircle className="h-3 w-3 text-gray-600" />
      };
    case 'rescheduled':
      return {
        label: 'Reagendado',
        bgColor: 'bg-yellow-50 hover:bg-yellow-100',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-900',
        badgeColor: 'bg-yellow-100 text-yellow-800',
        icon: <AlertCircle className="h-3 w-3 text-yellow-600" />
      };
    default:
      return {
        label: 'Desconhecido',
        bgColor: 'bg-gray-50 hover:bg-gray-100',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-900',
        badgeColor: 'bg-gray-100 text-gray-800',
        icon: <AlertCircle className="h-3 w-3 text-gray-600" />
      };
  }
}

// Payment status configuration
function getPaymentStatusConfig(paymentStatus: Appointment['payment_status']) {
  switch (paymentStatus) {
    case 'paid':
      return {
        label: 'Pago',
        textColor: 'text-green-600',
        icon: <CheckCircle className="h-3 w-3 text-green-600" />
      };
    case 'partial':
      return {
        label: 'Parcial',
        textColor: 'text-yellow-600',
        icon: <AlertCircle className="h-3 w-3 text-yellow-600" />
      };
    case 'pending':
      return {
        label: 'Pendente',
        textColor: 'text-red-600',
        icon: <DollarSign className="h-3 w-3 text-red-600" />
      };
    default:
      return {
        label: 'Desconhecido',
        textColor: 'text-gray-600',
        icon: <DollarSign className="h-3 w-3 text-gray-600" />
      };
  }
}

// Appointment block with drag and drop support (for future use)
interface DraggableAppointmentBlockProps extends AppointmentBlockProps {
  onDragStart?: (appointment: Appointment) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function DraggableAppointmentBlock({
  appointment,
  onDragStart,
  onDragEnd,
  isDragging,
  ...props
}: DraggableAppointmentBlockProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('appointment', JSON.stringify(appointment));
    onDragStart?.(appointment);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        isDragging && "opacity-50 scale-95",
        "transition-all duration-200"
      )}
    >
      <AppointmentBlock
        {...props}
        appointment={appointment}
        className={cn(
          props.className,
          "select-none" // Prevent text selection during drag
        )}
      />
    </div>
  );
}