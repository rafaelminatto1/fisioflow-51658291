import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, FileText, User as UserIcon, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  variant?: 'compact' | 'expanded';
  className?: string;
}

const getStatusConfig = (status: string) => {
  const configs = {
    confirmado: {
      borderColor: 'border-emerald-500',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      label: 'Confirmado',
      icon: CheckCircle,
      gradient: 'from-emerald-500/10 via-emerald-500/15 to-emerald-500/20'
    },
    agendado: {
      borderColor: 'border-blue-500',
      badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
      badgeText: 'text-blue-700 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400',
      label: 'Agendado',
      icon: Clock,
      gradient: 'from-blue-500/10 via-blue-500/15 to-blue-500/20'
    },
    avaliacao: {
      borderColor: 'border-violet-500',
      badgeBg: 'bg-violet-100 dark:bg-violet-500/20',
      badgeText: 'text-violet-700 dark:text-violet-300',
      iconColor: 'text-violet-600 dark:text-violet-400',
      label: 'Avaliação',
      icon: FileText,
      gradient: 'from-violet-500/10 via-violet-500/15 to-violet-500/20'
    },
    aguardando_confirmacao: {
      borderColor: 'border-amber-500',
      badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
      badgeText: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Aguardando',
      icon: Clock,
      gradient: 'from-amber-500/10 via-amber-500/15 to-amber-500/20'
    },
    em_andamento: {
      borderColor: 'border-yellow-500',
      badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      iconColor: 'text-yellow-700 dark:text-yellow-400',
      label: 'Em Andamento',
      icon: Clock,
      gradient: 'from-yellow-500/10 via-yellow-500/15 to-yellow-500/20'
    },
    em_espera: {
      borderColor: 'border-indigo-500',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      label: 'Em Espera',
      icon: Clock,
      gradient: 'from-indigo-500/10 via-indigo-500/15 to-indigo-500/20'
    },
    atrasado: {
      borderColor: 'border-orange-500',
      badgeBg: 'bg-orange-100 dark:bg-orange-500/20',
      badgeText: 'text-orange-700 dark:text-orange-300',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: 'Atrasado',
      icon: AlertCircle,
      gradient: 'from-orange-500/10 via-orange-500/15 to-orange-500/20'
    },
    concluido: {
      borderColor: 'border-slate-500',
      badgeBg: 'bg-slate-100 dark:bg-slate-500/20',
      badgeText: 'text-slate-700 dark:text-slate-300',
      iconColor: 'text-slate-600 dark:text-slate-400',
      label: 'Concluído',
      icon: CheckCircle,
      gradient: 'from-slate-500/10 via-slate-500/15 to-slate-500/20'
    },
    remarcado: {
      borderColor: 'border-cyan-500',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-500/20',
      badgeText: 'text-cyan-700 dark:text-cyan-300',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      label: 'Remarcado',
      icon: Clock,
      gradient: 'from-cyan-500/10 via-cyan-500/15 to-cyan-500/20'
    },
    cancelado: {
      borderColor: 'border-red-600',
      badgeBg: 'bg-red-100 dark:bg-red-500/20',
      badgeText: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Cancelado',
      icon: XCircle,
      gradient: 'from-red-600/10 via-red-600/15 to-red-600/20'
    },
    falta: {
      borderColor: 'border-red-600',
      badgeBg: 'bg-red-100 dark:bg-red-500/20',
      badgeText: 'text-red-700 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Falta',
      icon: XCircle,
      gradient: 'from-red-600/10 via-red-600/15 to-red-600/20'
    },
  };

  return configs[status as keyof typeof configs] || configs.agendado;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  variant = 'expanded',
  className
}) => {
  const statusConfig = getStatusConfig(appointment.status);
  const StatusIcon = statusConfig.icon;

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
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
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
              {appointment.time}
            </span>
            <StatusIcon className={cn("w-3.5 h-3.5", statusConfig.iconColor)} />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {appointment.patientName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
      onClick={onClick}
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
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{appointment.time}</span>
              {appointment.duration && (
                <span className="text-slate-400 font-normal text-xs">
                  ({appointment.duration} min)
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5",
            statusConfig.badgeBg,
            statusConfig.badgeText
          )}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
            <AvatarFallback className={cn(
              "text-xs font-bold",
              statusConfig.badgeBg,
              statusConfig.badgeText
            )}>
              {getInitials(appointment.patientName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 truncate group-hover:text-primary transition-colors">
              {appointment.patientName}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              {appointment.type}
            </p>
          </div>
        </div>

        {/* Footer Area - Notes & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {appointment.notes ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-[80%]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
              <span className="truncate">{appointment.notes}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">Sem observações</div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
