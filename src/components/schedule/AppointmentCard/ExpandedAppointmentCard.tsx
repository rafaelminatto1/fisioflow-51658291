import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MessageSquare } from 'lucide-react';
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
    console.log('Opening WhatsApp for', appointment.patientName);
  }, [appointment.patientName]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
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
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1.5 opacity-60",
        isOverbooked ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-7 relative z-10">
        <div className="flex justify-between items-start mb-6">
          <AppointmentCardTime 
            time={appointment.time} 
            ongoing={ongoing} 
          />

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
};
