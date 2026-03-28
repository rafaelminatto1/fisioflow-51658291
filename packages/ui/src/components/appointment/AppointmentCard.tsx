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
    icon?: React.ElementType;
  };
  compact?: boolean;
}

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
    style,
    className,
    children,
    ...props
  }, ref) => {
    const StatusIcon = statusConfig?.icon || CheckCircle2;
    const numericHeight =
      typeof style?.height === 'number'
        ? style.height
        : typeof style?.height === 'string' && style.height.endsWith('px')
          ? Number.parseFloat(style.height)
          : undefined;
    const isVeryCompact = compact && typeof numericHeight === 'number' && numericHeight <= 44;

    return (
      <MotionCard
        ref={ref}
        variant={className?.includes('calendar-card-') ? 'none' : "glass"}
        onClick={onClick}
        style={{
          ...style,
          background: className?.includes('calendar-card-') ? undefined : style?.background,
          backgroundColor: className?.includes('calendar-card-') ? 'transparent' : style?.backgroundColor,
        }}
        className={cn(
          "relative overflow-hidden cursor-pointer flex flex-col",
          "transition-all duration-200",
          isDragging && "opacity-50 scale-95 z-50 ring-2 ring-primary/40 shadow-2xl",
          isSaving && "animate-pulse-twice ring-2 ring-amber-400/50 z-30",
          isDropTarget && "ring-2 ring-primary/60 shadow-2xl scale-105 z-25",
          isSelected && "ring-2 ring-primary shadow-xl z-40",
          compact && "calendar-card-weekly",
          compact ? "justify-start px-2 py-1 pl-3" : "justify-center p-2 pl-3.5",
          className
        )}
        {...(props as any)}
      >
        {/* Status accent strip — color comes from statusConfig.color (hex) */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 opacity-80",
            compact ? "w-[3px]" : "w-1"
          )}
          style={statusConfig?.color ? { backgroundColor: statusConfig.color } : { backgroundColor: '#94a3b8' }}
        />

        {/* Content */}
        <div className={cn("flex flex-col w-full min-w-0", compact ? "gap-0.5" : "")}>
          <div className={cn("flex items-center justify-between gap-1 w-full", compact ? "mb-0" : "mb-0.5")}>
            <span className={cn(
              "font-mono font-bold tracking-tight opacity-90 leading-none",
              compact ? "text-[9px]" : "text-xs"
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
            "font-bold min-w-0",
            compact
              ? isVeryCompact
                ? "text-[10px] leading-none truncate"
                : "text-[11px] leading-tight line-clamp-2"
              : "text-sm leading-tight truncate"
          )}>
            {patientName}
          </span>

          {!compact && type && (
            <span className="text-[10px] opacity-70 truncate mt-0.5 font-medium">
              {type}
            </span>
          )}
        </div>

        {children}
      </MotionCard>
    );
  }
);

AppointmentCard.displayName = 'AppointmentCard';
