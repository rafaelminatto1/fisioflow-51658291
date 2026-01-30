import React, { memo, useCallback } from 'react';
import { Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getStatusConfig, getInitials } from '../schedule/shared';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  variant?: 'compact' | 'expanded';
  className?: string;
}

/**
 * Memo comparison function for AppointmentCard
 * Only re-renders when appointment data actually changes
 */
function arePropsEqual(
  prevProps: AppointmentCardProps,
  nextProps: AppointmentCardProps
): boolean {
  return (
    prevProps.appointment.id === nextProps.appointment.id &&
    prevProps.appointment.status === nextProps.appointment.status &&
    prevProps.appointment.time === nextProps.appointment.time &&
    prevProps.appointment.patientName === nextProps.appointment.patientName &&
    prevProps.appointment.type === nextProps.appointment.type &&
    prevProps.appointment.date === nextProps.appointment.date &&
    prevProps.appointment.notes === nextProps.appointment.notes &&
    prevProps.variant === nextProps.variant
  );
}

// Local getStatusConfig and getInitials removed - using shared versions
// import { getStatusConfig, getInitials } from '../schedule/shared';

export const AppointmentCard: React.FC<AppointmentCardProps> = memo(({
  appointment,
  onClick,
  variant = 'expanded',
  className
}) => {
  // Use shared status config
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  // Memoize click handler to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={cn(
          'group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900',
          'border border-slate-200 dark:border-slate-800',
          'shadow-sm hover:shadow-md transition-all duration-300',
          'cursor-pointer',
          className
        )}
      >
        {/* Status Indicator Strip */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", statusConfig.borderColor.replace('border-', 'bg-'))} />

        <div className="p-3 pl-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">
              {appointment.time}
            </span>
            <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {appointment.patientName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {appointment.type}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-800',
        'shadow-sm hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/50',
        'cursor-pointer transition-all duration-300',
        className
      )}
    >
      {/* Background Gradient Effect on Hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        statusConfig.gradient
      )} />

      {/* Left Status Border */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-4 pl-5 relative z-10">
        <div className="flex justify-between items-start mb-3">
          {/* Time and Duration Badge */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-base font-bold text-slate-700 dark:text-slate-200 font-mono">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{appointment.time}</span>
              {appointment.duration && (
                <span className="text-slate-400 font-normal text-sm">
                  ({appointment.duration} min)
                </span>
              )}
            </div>
          </div>

          {/* Status Badge - Enhanced for better readability */}
          <span className={cn(
            "px-3 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide flex items-center gap-2",
            statusConfig.badgeBg,
            statusConfig.badgeText
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
            <AvatarFallback className={cn(
              "text-sm font-bold",
              statusConfig.badgeBg,
              statusConfig.badgeText
            )}>
              {getInitials(appointment.patientName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1.5 truncate group-hover:text-primary transition-colors">
              {appointment.patientName}
            </h3>
            <p className="text-base font-medium text-slate-600 dark:text-slate-400 truncate flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              {appointment.type}
            </p>
          </div>
        </div>

        {/* Footer Area - Notes & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {appointment.notes ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 max-w-[80%]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span className="truncate font-medium">{appointment.notes}</span>
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic font-medium">Sem observações</div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}, arePropsEqual);

AppointmentCard.displayName = 'AppointmentCard';
