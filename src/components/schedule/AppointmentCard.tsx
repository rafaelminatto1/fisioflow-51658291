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
  'data-appointment-popover-anchor'?: string;
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
    prevProps.appointment.isOverbooked === nextProps.appointment.isOverbooked &&
    prevProps.variant === nextProps.variant
  );
}

export const AppointmentCard = memo(React.forwardRef<HTMLDivElement, AppointmentCardProps>(({
  appointment,
  onClick,
  variant = 'expanded',
  className,
  'data-appointment-popover-anchor': dataAnchor
}, ref) => {
  const isOverbooked = !!appointment.isOverbooked;
  // Use shared status config
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  // Normalize date to string for utility functions
  const dateStr = useMemo(() => {
    if (!appointment.date) return '';
    if (appointment.date instanceof Date) return appointment.date.toISOString().split('T')[0];
    return appointment.date;
  }, [appointment.date]);

  // Calculate dynamic states
  const ongoing = useMemo(() =>
    isAppointmentOngoing(dateStr, appointment.time, appointment.duration || 60),
    [dateStr, appointment.time, appointment.duration]
  );

  const progress = useMemo(() =>
    getAppointmentProgress(dateStr, appointment.time, appointment.duration || 60),
    [dateStr, appointment.time, appointment.duration]
  );

  const relativeTime = useMemo(() =>
    getRelativeTime(dateStr, appointment.time),
    [dateStr, appointment.time]
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
        ref={ref}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={cn(
          'group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900',
          'border border-slate-200 dark:border-slate-800',
          'shadow-sm hover:shadow-md transition-all duration-300',
          'cursor-pointer',
          isOverbooked && 'border-red-500 bg-red-50/50 dark:bg-red-900/20',
          className
        )}
        data-appointment-popover-anchor={dataAnchor}
      >
        {/* Status Indicator Strip */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isOverbooked ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" : statusConfig.borderColor.replace('border-', 'bg-')
        )} />

        <div className="p-3 pl-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
            </span>
            {isOverbooked ? (
              <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
            ) : (
              <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
            )}
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
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden rounded-[2rem]',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
        'border border-slate-200/60 dark:border-slate-800/60 transition-all duration-500',
        ongoing ? "ring-2 ring-blue-500 ring-offset-4 dark:ring-offset-slate-950 shadow-2xl shadow-blue-500/20" : "shadow-premium-md hover:shadow-premium-xl",
        isOverbooked && 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900/50',
        'cursor-pointer',
        className
      )}
      data-appointment-popover-anchor={dataAnchor}
    >
      {/* Top Status Glow */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1.5 opacity-60",
        isOverbooked ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-7 relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white rounded-2xl shadow-xl">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-black text-white dark:text-slate-900 font-mono tracking-tighter">
                {appointment.time}
              </span>
            </div>

            {ongoing && (
              <span className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-2xl text-[9px] font-black tracking-[0.2em] uppercase animate-pulse shadow-lg shadow-blue-500/40">
                EM ANDAMENTO
              </span>
            )}

            {(appointment as any).highNoShowRisk && (
              <span className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-2xl text-[9px] font-black tracking-[0.2em] uppercase shadow-lg shadow-red-500/40">
                <AlertCircle className="w-3 h-3" />
                RISCO DE FALTA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="p-2.5 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 transition-all shadow-lg shadow-emerald-500/20"
              title="Abrir WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-[0.85] mb-3 tracking-tightest group-hover:text-blue-600 transition-colors duration-300">
            {appointment.patientName}
          </h3>
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", statusConfig.iconColor.replace('text-', 'bg-'))} />
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">
              {appointment.type} • {statusConfig.label}
            </p>
          </div>
        </div>

        {/* Dynamic Footer with Progress */}
        <div className="space-y-6">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{relativeTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-300 dark:text-slate-600">DURAÇÃO</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono">
                {appointment.duration ? `${formatDuration(appointment.duration)}` : '60 min'}
              </span>
            </div>
          </div>

          {/* Premium Progress Bar */}
          <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "absolute top-0.5 left-0.5 bottom-0.5 rounded-full transition-all duration-1000",
                ongoing ? "bg-gradient-to-r from-blue-400 to-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-slate-300 dark:bg-slate-600"
              )}
            />
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-8 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 flex items-start gap-4 group/notes relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400/50" />
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 group-hover/notes:rotate-12 transition-transform" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic pr-2">
              {appointment.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}), arePropsEqual);

AppointmentCard.displayName = 'AppointmentCard';
