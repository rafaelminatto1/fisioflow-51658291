import React from 'react';
import { MotionCard } from '../MotionCard';
import { cn } from '../../lib/utils';
import { CheckCircle2 } from 'lucide-react';

export interface AppointmentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  patientName: string;
  time: string;
  endTime?: string;
  type?: string;
  status?: string;
  isDragging?: boolean;
  isSaving?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  statusConfig?: {
    color?: string;
    bgColor?: string;
    borderColor?: string;
    icon?: React.ElementType;
    label?: string;
  };
  compact?: boolean;
}

// Map internal status codes to visual styles if no config provided
const getStatusStyles = (status: string = 'default') => {
  const normalized = status.toLowerCase();
  
  const styles = {
    confirmado: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    agendado: 'bg-sky-50/90 border-sky-200 text-sky-900',
    concluido: 'bg-purple-50/90 border-purple-200 text-purple-900',
    cancelado: 'bg-red-50/90 border-red-200 text-red-900',
    falta: 'bg-rose-50/90 border-rose-200 text-rose-900',
    em_andamento: 'bg-cyan-50/90 border-cyan-200 text-cyan-900',
    default: 'bg-slate-50/90 border-slate-200 text-slate-900'
  };

  return styles[normalized as keyof typeof styles] || styles.default;
};

export const AppointmentCard = React.forwardRef<HTMLDivElement, AppointmentCardProps>(
  ({ 
    patientName, 
    time, 
    endTime, 
    type, 
    status = 'agendado', 
    isDragging, 
    isSaving, 
    isDropTarget, 
    isSelected,
    onClick, 
    statusConfig,
    compact = false,
    className, 
    children,
    ...props 
  }, ref) => {
    
    const statusStyle = getStatusStyles(status);
    const StatusIcon = statusConfig?.icon || CheckCircle2;

    return (
      <MotionCard
        ref={ref}
        variant="glass"
        onClick={onClick}
        className={cn(
          "relative overflow-hidden cursor-pointer flex flex-col justify-center",
          "transition-all duration-200",
          // Status styles
          statusStyle,
          // Dragging states
          isDragging && "opacity-50 scale-95 z-50 ring-2 ring-primary/40 shadow-2xl",
          isSaving && "animate-pulse ring-2 ring-amber-400/50 z-30",
          isDropTarget && "ring-2 ring-primary/60 shadow-2xl scale-105 z-25",
          isSelected && "ring-2 ring-primary shadow-xl z-40",
          // Density
          compact ? "p-1" : "p-2 pl-3.5",
          className
        )}
        {...props}
      >
        {/* Status Border Strip */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 opacity-80",
            statusConfig?.color ? '' : {
              'bg-emerald-500': status === 'confirmado',
              'bg-sky-500': status === 'agendado',
              'bg-purple-500': status === 'concluido',
              'bg-red-500': status === 'cancelado',
              'bg-slate-500': status === 'default'
            }[status] || 'bg-slate-500'
          )}
          style={statusConfig?.color ? { backgroundColor: statusConfig.color } : undefined}
        />

        {/* Content */}
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-center justify-between gap-1 w-full mb-0.5">
            <span className={cn(
              "font-mono font-bold tracking-tight opacity-90",
              compact ? "text-[10px]" : "text-xs"
            )}>
              {time}
              {endTime && !compact && <span className="opacity-60 font-normal"> - {endTime}</span>}
            </span>
            
            {!compact && (
              <div className="opacity-70">
                <StatusIcon className="w-3 h-3" />
              </div>
            )}
          </div>

          <span className={cn(
            "font-bold leading-tight truncate",
            compact ? "text-[11px]" : "text-sm"
          )}>
            {patientName}
          </span>

          {!compact && type && (
            <span className="text-[10px] opacity-70 truncate mt-0.5 font-medium">
              {type}
            </span>
          )}
        </div>

        {/* Hover/Extra Content */}
        {children}
      </MotionCard>
    );
  }
);

AppointmentCard.displayName = 'AppointmentCard';
