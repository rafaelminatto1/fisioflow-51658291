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
    prevProps.appointment.isOverbooked === nextProps.appointment.isOverbooked &&
    prevProps.variant === nextProps.variant
  );
}

export const AppointmentCard: React.FC<AppointmentCardProps> = memo(({
  appointment,
  onClick,
  variant = 'expanded',
  className
}) => {
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden rounded-3xl',
        'bg-white dark:bg-slate-900',
        'border border-slate-100 dark:border-slate-800 transition-all duration-500',
        'hover-lift',
        ongoing ? "ring-2 ring-emerald-500 ring-offset-4 dark:ring-offset-slate-950" : (isOverbooked ? 'ring-2 ring-red-500 ring-offset-4 dark:ring-offset-slate-950' : ''),
        isOverbooked && 'bg-red-50/20 dark:bg-red-950/10 shadow-red-100/30 dark:shadow-red-900/10',
        'shadow-premium-md hover:shadow-premium-lg',
        'cursor-pointer',
        className
      )}
    >
      {/* Top Status Gradient (Refined) */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-2 opacity-40",
        isOverbooked ? "bg-red-600" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner-border">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {appointment.time}
                </span>
              </div>

              {ongoing && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black tracking-widest uppercase animate-pulse shadow-lg shadow-emerald-500/20">
                  AO VIVO
                </span>
              )}
              {isOverbooked && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-red-600/20">
                  <AlertCircle className="w-3 h-3" />
                  CAPACIDADE
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm border border-emerald-100/50 dark:border-emerald-800/30"
              title="Abrir WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-[0.9] mb-2 tracking-tighter group-hover:text-primary transition-colors duration-300">
            {appointment.patientName}
          </h3>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", statusConfig.iconColor.replace('text-', 'bg-'))} />
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              {appointment.type} • {statusConfig.label}
            </p>
          </div>
        </div>

        {/* Dynamic Footer with Progress & Relative Time */}
        <div className="space-y-5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span>{relativeTime}</span>
            </div>
            <div>
              {appointment.duration ? `${formatDuration(appointment.duration)}` : ''}
            </div>
          </div>

          {/* Progress Bar (Enhanced) */}
          <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "absolute top-0 left-0 bottom-0 rounded-full transition-all duration-1000",
                ongoing ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "bg-slate-300 dark:bg-slate-600"
              )}
            />
          </div>
        </div>

        {/* Quick Notes if present */}
        {appointment.notes && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/50 flex items-start gap-3 group/notes">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 group-hover/notes:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed italic">
              {appointment.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}, arePropsEqual);

AppointmentCard.displayName = 'AppointmentCard';
