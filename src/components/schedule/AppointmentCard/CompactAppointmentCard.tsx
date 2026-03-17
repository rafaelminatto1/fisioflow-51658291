import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
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
      onClick={onClick}
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
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1.5",
        isOverbooked ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" : statusConfig.borderColor.replace('border-', 'bg-')
      )} />

      <div className="p-3 pl-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
            {appointment.time}
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
};
