import React, { memo, useCallback, useMemo } from 'react';
import { AlertCircle, MoreHorizontal, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getStatusConfig } from '../schedule/shared';
import {
  getRelativeTime,
  isAppointmentOngoing,
  getAppointmentProgress,
  formatDuration
} from '../schedule/shared/utils';

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
    prevProps.appointment.duration === nextProps.appointment.duration &&
    prevProps.variant === nextProps.variant
  );
}

export const AppointmentCard: React.FC<AppointmentCardProps> = memo(({
  appointment,
  onClick,
  variant = 'expanded',
  className
}) => {
  // Use shared status config
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  // Calculate dynamic states
  const ongoing = useMemo(() =>
    isAppointmentOngoing(appointment.date, appointment.time, appointment.duration || 60),
    [appointment.date, appointment.time, appointment.duration]
  );

  const progress = useMemo(() =>
    getAppointmentProgress(appointment.date, appointment.time, appointment.duration || 60),
    [appointment.date, appointment.time, appointment.duration]
  );

  const relativeTime = useMemo(() =>
    getRelativeTime(appointment.date, appointment.time),
    [appointment.date, appointment.time]
  );

  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // WhatsApp logic would go here
    console.log('Opening WhatsApp for', appointment.patientName);
  }, [appointment.patientName]);

  if (variant === 'compact') {
    return (
      <motion.div
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
            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
              {appointment.time}
            </span>
            <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {appointment.patientName}
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate mt-0.5">
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
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-white dark:bg-slate-900',
        'border-2 transition-all duration-300',
        ongoing ? statusConfig.borderColor : 'border-slate-100 dark:border-slate-800',
        'shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50',
        'cursor-pointer',
        className
      )}
    >
      {/* Top Status Gradient (Subtle) */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 opacity-20",
        statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-5 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {appointment.time} — {appointment.duration ?
                  (new Date(new Date(`2000-01-01T${appointment.time}`).getTime() + appointment.duration * 60000)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>

              {ongoing && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black tracking-widest uppercase animate-pulse">
                  AGORA
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors">
            {appointment.patientName}
          </h3>
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
            {appointment.type}
          </p>
        </div>

        {/* Dynamic Footer with Progress & Relative Time */}
        <div className="space-y-4">
          <div className="flex justify-between items-end text-sm font-bold">
            <div className="flex items-center gap-2 text-slate-400 uppercase tracking-tighter text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{relativeTime}</span>
            </div>
            <div className="text-slate-400 uppercase tracking-tighter text-xs">
              {appointment.duration ? `${formatDuration(appointment.duration)} duração` : ''}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "absolute top-0 left-0 bottom-0 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] transition-all duration-1000",
                ongoing ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              )}
            />
          </div>
        </div>

        {/* Quick Notes if present */}
        {appointment.notes && (
          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
              {appointment.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}, arePropsEqual);

AppointmentCard.displayName = 'AppointmentCard';
