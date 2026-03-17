import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentCardTime } from './AppointmentCardTime';
import { getStatusConfig } from '../shared';
import { 
  getRelativeTime, 
  isAppointmentOngoing, 
  getAppointmentProgress, 
  formatDuration 
} from '../shared/utils';
import type { Appointment } from '@/types/appointment';

interface ExpandedAppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  className?: string;
  dataAnchor?: string;
}

export const ExpandedAppointmentCard: React.FC<ExpandedAppointmentCardProps> = ({
  appointment,
  onClick,
  className,
  dataAnchor
}) => {
  const isOverbooked = !!appointment.isOverbooked;
  const statusConfig = getStatusConfig(appointment.status);

  const dateStr = useMemo(() => {
    if (!appointment.date) return '';
    if (appointment.date instanceof Date) return appointment.date.toISOString().split('T')[0];
    return appointment.date;
  }, [appointment.date]);

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

  const handleWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementation for WhatsApp would go here, 
    // for now we just log it or use a centralized helper if available
    console.log('Opening WhatsApp for', appointment.patientName);
  }, [appointment.patientName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ 
        y: -4, 
        transition: { duration: 0.2, ease: "easeOut" } 
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-[2.5rem]',
        'bg-white dark:bg-slate-900',
        'border border-slate-200/60 dark:border-slate-800/60',
        'transition-all duration-500',
        ongoing 
          ? "ring-2 ring-blue-500 ring-offset-4 dark:ring-offset-slate-950 shadow-2xl shadow-blue-500/20" 
          : "shadow-premium-md hover:shadow-premium-xl dark:shadow-none dark:hover:bg-slate-800/50",
        isOverbooked && 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900/50',
        'cursor-pointer',
        className
      )}
      data-appointment-popover-anchor={dataAnchor}
    >
      {/* Dynamic Status Border */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-2 opacity-80",
        isOverbooked ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      {/* Decorative Glow */}
      <div className={cn(
        "absolute -right-20 -top-20 w-40 h-40 rounded-full blur-[100px] opacity-20 transition-opacity duration-500 group-hover:opacity-40",
        isOverbooked ? "bg-red-500" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-8 relative z-10">
        <div className="flex justify-between items-start mb-8">
          <AppointmentCardTime 
            time={appointment.time} 
            ongoing={ongoing} 
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleWhatsApp}
              className="p-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-110 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              title="Abrir WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[0.85] mb-4 tracking-tightest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
            {appointment.patientName}
          </h3>
          <div className="flex items-center gap-2.5">
            <div className={cn("w-3 h-3 rounded-full shadow-sm animate-pulse", statusConfig.iconColor.replace('text-', 'bg-'))} />
            <p className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
              {appointment.type} <span className="mx-1 opacity-30">•</span> {statusConfig.label}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                {relativeTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-300 dark:text-slate-600">DURAÇÃO</span>
              <span className="text-slate-700 dark:text-slate-200 font-mono text-xs">
                {appointment.duration ? `${formatDuration(appointment.duration)}` : '60 min'}
              </span>
            </div>
          </div>

          <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden p-1 border border-slate-200/50 dark:border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className={cn(
                "absolute top-1 left-1 bottom-1 rounded-full transition-all duration-1000",
                ongoing 
                  ? "bg-gradient-to-r from-blue-400 to-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                  : "bg-slate-300 dark:bg-slate-600"
              )}
            />
          </div>
        </div>

        {appointment.notes && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 flex items-start gap-4 group/notes relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-400/40" />
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 group-hover/notes:rotate-12 transition-transform shrink-0" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic pr-2">
              {appointment.notes}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
