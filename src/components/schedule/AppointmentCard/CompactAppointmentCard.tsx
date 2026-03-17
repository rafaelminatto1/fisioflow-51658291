import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig } from '../shared';
import type { Appointment } from '@/types/appointment';

interface CompactAppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  className?: string;
  dataAnchor?: string;
}

export const CompactAppointmentCard: React.FC<CompactAppointmentCardProps> = ({
  appointment,
  onClick,
  className,
  dataAnchor
}) => {
  const isOverbooked = !!appointment.isOverbooked;
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-800',
        'shadow-sm hover:shadow-md transition-all duration-300',
        'cursor-pointer select-none',
        isOverbooked && 'border-red-500 bg-red-50/50 dark:bg-red-900/20',
        className
      )}
      data-appointment-popover-anchor={dataAnchor}
    >
      {/* Accent Indicator */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2",
        isOverbooked ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-4 pl-6">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300">
              {appointment.time}
            </span>
          </div>
          
          {isOverbooked ? (
            <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
          ) : (
            <div className={cn("p-1.5 rounded-lg", statusConfig.badgeBg)}>
              <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">
          {appointment.patientName}
        </h3>
        
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
            {appointment.type}
          </p>
          {appointment.duration && (
            <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">
              {appointment.duration}min
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
