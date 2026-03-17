import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, MessageSquare, Check, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig } from '../shared';
import type { Appointment } from '@/types/appointment';
import { Button } from '@/components/ui/button';

interface CompactAppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  className?: string;
  dataAnchor?: string;
  onStatusChange?: (status: string) => void;
  onEdit?: () => void;
}

export const CompactAppointmentCard: React.FC<CompactAppointmentCardProps> = ({
  appointment,
  onClick,
  className,
  dataAnchor,
  onStatusChange,
  onEdit
}) => {
  const isOverbooked = !!appointment.isOverbooked;
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = appointment.phone?.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  };

  const handleQuickCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.('atendido');
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover="hover"
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
        "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2 z-20",
        isOverbooked ? "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" : statusConfig.accent
      )} />

      {/* Quick Actions Overlay (Padrão 2026) */}
      <motion.div 
        variants={{
          hover: { opacity: 1, x: 0 },
          initial: { opacity: 0, x: 10 }
        }}
        initial="initial"
        className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-30 pointer-events-none group-hover:pointer-events-auto"
      >
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow-lg bg-emerald-500 hover:bg-emerald-600 text-white border-none"
          onClick={handleWhatsApp}
          title="WhatsApp"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
        {appointment.status !== 'atendido' && (
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-none"
            onClick={handleQuickCheckIn}
            title="Finalizar"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 rounded-full shadow-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none"
          onClick={handleEditClick}
          title="Editar"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      </motion.div>

      <div className="p-4 pl-6">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
            <Clock className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
            <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">
              {appointment.time}
            </span>
          </div>
          
          {isOverbooked ? (
            <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
          ) : (
            <div className={cn("p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-90 group-hover:-translate-x-8", statusConfig.badgeBg)}>
              <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors pr-8">
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
