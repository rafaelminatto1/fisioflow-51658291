import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { 
  MessageSquare, 
  Check, 
  XCircle, 
  Clock, 
  Edit2, 
  Trash2, 
  AlertCircle,
  CalendarOff,
  UserCheck,
  Slash,
  Copy,
  ArrowRight
} from 'lucide-react';
import { APPOINTMENT_STATUS_CONFIG, APPOINTMENT_STATUS_OPTIONS } from './shared/appointment-status';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';

interface AppointmentContextMenuProps {
  children: React.ReactNode;
  appointment: Appointment;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveToToday?: () => void;
}

export const AppointmentContextMenu = ({
  children,
  ref,
  appointment,
  onStatusChange,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToToday,
  ...dataProps
}: AppointmentContextMenuProps & { ref?: React.Ref<HTMLElement>; [key: `data-${string}`]: unknown }) => {
  const handleWhatsApp = () => {
    const phone = appointment.phone?.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  };

  const extraProps = { ...dataProps, ...(ref ? { ref } : {}) };
  const trigger = Object.keys(extraProps).length > 0 && React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, extraProps)
    : children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {trigger}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 rounded-xl border-blue-100 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
        <div className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">
          {appointment.patientName}
        </div>
        
        <ContextMenuItem onClick={onEdit} className="gap-2 focus:bg-blue-50 dark:focus:bg-blue-900/20">
          <Edit2 className="w-4 h-4 text-blue-500" />
          <span>Editar Agendamento</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onDuplicate} className="gap-2 focus:bg-slate-50 dark:focus:bg-slate-800">
          <Copy className="w-4 h-4 text-slate-500" />
          <span>Duplicar Agendamento</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onMoveToToday} className="gap-2 focus:bg-slate-50 dark:focus:bg-slate-800">
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <span>Mover para Hoje</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={handleWhatsApp} className="gap-2 focus:bg-emerald-50 dark:focus:bg-emerald-900/20">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span>Enviar WhatsApp</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Alterar Status</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 rounded-xl shadow-xl border-blue-100 bg-white/95 dark:bg-slate-900/95">
            {APPOINTMENT_STATUS_OPTIONS.map((status) => {
              const config = APPOINTMENT_STATUS_CONFIG[status];
              const Icon = config.icon;
              return (
                <ContextMenuItem 
                  key={status} 
                  onClick={() => onStatusChange(status)}
                  className="gap-2 focus:bg-slate-50 dark:focus:bg-slate-800"
                >
                  <div className={cn("w-2 h-2 rounded-full", config.iconColor.replace('text-', 'bg-'))} />
                  <span>{config.label}</span>
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

        <ContextMenuItem 
          onClick={onDelete} 
          className="gap-2 text-destructive focus:bg-red-50 dark:focus:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
          <span>Excluir Agendamento</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
