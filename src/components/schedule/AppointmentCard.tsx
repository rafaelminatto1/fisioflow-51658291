import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  variant?: 'compact' | 'expanded';
  className?: string;
}

const getStatusConfig = (status: string) => {
  const configs = {
    confirmado: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Confirmado',
      icon: CheckCircle
    },
    agendado: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-primary',
      text: 'text-primary',
      label: 'Agendado',
      icon: Clock
    },
    avaliacao: {
      bg: 'bg-violet-50 dark:bg-violet-950/20',
      border: 'border-violet-500',
      text: 'text-violet-700 dark:text-violet-400',
      label: 'Avaliação',
      icon: FileText
    },
    aguardando_confirmacao: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Aguardando',
      icon: Clock
    },
    em_andamento: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Em Andamento',
      icon: CheckCircle
    },
    em_espera: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      border: 'border-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-400',
      label: 'Em Espera',
      icon: Clock
    },
    atrasado: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      label: 'Atrasado',
      icon: AlertCircle
    },
    concluido: {
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      border: 'border-slate-400',
      text: 'text-slate-700 dark:text-slate-400',
      label: 'Concluído',
      icon: CheckCircle
    },
    remarcado: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-500',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Remarcado',
      icon: Clock
    },
    cancelado: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-500',
      text: 'text-red-700 dark:text-red-400',
      label: 'Cancelado',
      icon: XCircle
    },
    falta: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-500',
      text: 'text-red-700 dark:text-red-400',
      label: 'Falta',
      icon: XCircle
    },
  };

  return configs[status as keyof typeof configs] || configs.agendado;
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
      <div
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-lg cursor-pointer',
          statusConfig.bg,
          'border-l-[4px]',
          statusConfig.border,
          'shadow-sm',
          'hover:shadow-md transition-all duration-200',
          'active:scale-[0.98]',
          'p-3',
          className
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <div className={cn("flex items-center gap-2 text-sm font-semibold", statusConfig.text)}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{appointment.time}</span>
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          {appointment.patientName}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          {appointment.type}
        </p>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{appointment.duration || 45} min duração</span>
        </div>
      </div>
    );
  }

  // Expanded variant
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-lg cursor-pointer',
        statusConfig.bg,
        'border-l-[4px]',
        statusConfig.border,
        'shadow-sm',
        'hover:shadow-md transition-all duration-200',
        'active:scale-[0.98]',
        'p-3',
        'group',
        className
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <div className={cn("flex items-center gap-2 text-sm font-semibold", statusConfig.text)}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{appointment.time}</span>
          {appointment.duration && (
            <>
              <span className="mx-1">-</span>
              <span>{appointment.duration} min</span>
            </>
          )}
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/10",
          statusConfig.text
        )}>
          {statusConfig.label}
        </span>
      </div>
      {/* Changed to allow full name display with wrapping */}
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1 leading-tight break-words">
        {appointment.patientName}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
        {appointment.type}
      </p>
      {appointment.notes && (
        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-white/5 rounded-lg p-2 mt-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{appointment.notes}</span>
        </div>
      )}
    </div>
  );
};
