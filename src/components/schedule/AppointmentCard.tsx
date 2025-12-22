import React from 'react';
import { Clock, MapPin, MessageCircle, AlertCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppointmentAvatar } from './AppointmentAvatar';
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
      gradient: 'from-emerald-500 to-emerald-600',
      border: 'border-emerald-400',
      shadow: 'shadow-emerald-500/30',
      label: 'Confirmado',
      icon: '✓'
    },
    agendado: {
      gradient: 'from-blue-500 to-blue-600',
      border: 'border-blue-400',
      shadow: 'shadow-blue-500/30',
      label: 'Agendado',
      icon: '📅'
    },
    aguardando_confirmacao: {
      gradient: 'from-amber-500 to-amber-600',
      border: 'border-amber-400',
      shadow: 'shadow-amber-500/30',
      label: 'Aguardando',
      icon: '⏱️'
    },
    em_andamento: {
      gradient: 'from-cyan-500 to-cyan-600',
      border: 'border-cyan-400',
      shadow: 'shadow-cyan-500/30',
      label: 'Em Andamento',
      icon: '▶️'
    },
    em_espera: {
      gradient: 'from-indigo-500 to-indigo-600',
      border: 'border-indigo-400',
      shadow: 'shadow-indigo-500/30',
      label: 'Em Espera',
      icon: '⏰'
    },
    atrasado: {
      gradient: 'from-yellow-500 to-yellow-600',
      border: 'border-yellow-400',
      shadow: 'shadow-yellow-500/30',
      label: 'Atrasado',
      icon: '⚠️'
    },
    concluido: {
      gradient: 'from-purple-500 to-purple-600',
      border: 'border-purple-400',
      shadow: 'shadow-purple-500/30',
      label: 'Concluído',
      icon: '✔️'
    },
    remarcado: {
      gradient: 'from-orange-500 to-orange-600',
      border: 'border-orange-400',
      shadow: 'shadow-orange-500/30',
      label: 'Remarcado',
      icon: '🔄'
    },
    cancelado: {
      gradient: 'from-red-500 to-red-600',
      border: 'border-red-400',
      shadow: 'shadow-red-500/30',
      label: 'Cancelado',
      icon: '❌'
    },
    falta: {
      gradient: 'from-rose-500 to-rose-600',
      border: 'border-rose-400',
      shadow: 'shadow-rose-500/30',
      label: 'Falta',
      icon: '🚫'
    },
  };
  
  return configs[status as keyof typeof configs] || configs.agendado;
};

const getServiceIcon = (type: string) => {
  const typeMap: { [key: string]: string } = {
    'Fisioterapia': '🏃',
    'Consulta Inicial': '📋',
    'Reavaliação': '🔍',
    'Pilates Clínico': '🧘',
    'RPG': '🦴',
    'Terapia Manual': '👐',
    'Dry Needling': '💉',
  };
  return typeMap[type] || '📅';
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  variant = 'expanded',
  className
}) => {
  const statusConfig = getStatusConfig(appointment.status);
  const serviceIcon = getServiceIcon(appointment.type);
  
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer animate-slide-up-fade',
          'bg-gradient-to-br',
          statusConfig.gradient,
          'border-l-[6px]',
          statusConfig.border,
          'shadow-lg',
          statusConfig.shadow,
          'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1',
          'transition-all duration-300 hover-lift',
          'active:scale-95',
          'p-3',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <AppointmentAvatar
            patientName={appointment.patientName}
            status={appointment.status}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-white drop-shadow-md truncate">
                {appointment.patientName}
              </span>
              {(appointment as any).priority === 'Alta' && (
                <Star className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300 animate-pulse" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span className="drop-shadow-sm">{appointment.time}</span>
              <span className="mx-1">•</span>
              <span className="drop-shadow-sm">{appointment.type}</span>
            </div>
          </div>
          
          <div className="text-xl">{serviceIcon}</div>
        </div>
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    );
  }
  
  // Expanded variant
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer animate-slide-up-fade',
        'bg-gradient-to-br',
        statusConfig.gradient,
        'border-l-[6px]',
        statusConfig.border,
        'shadow-lg',
        statusConfig.shadow,
        'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1',
        'transition-all duration-300 hover-lift',
        'active:scale-95',
        'p-4',
        'group',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <AppointmentAvatar
            patientName={appointment.patientName}
            status={appointment.status}
            size="lg"
          />
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white drop-shadow-md">
                {appointment.patientName}
              </h3>
              {(appointment as any).priority === 'Alta' && (
                <Star className="h-4 w-4 text-yellow-300 fill-yellow-300 animate-pulse" />
              )}
            </div>
            
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white border-white/30 text-xs font-medium backdrop-blur-sm"
            >
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        <div className="text-2xl opacity-80">
          {serviceIcon}
        </div>
      </div>
      
      {/* Info Grid */}
      <div className="space-y-2 text-white/95">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          <span className="drop-shadow-sm">{appointment.time}</span>
          {appointment.duration && (
            <>
              <span className="mx-1">•</span>
              <span className="drop-shadow-sm">{appointment.duration} min</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4" />
          <span className="drop-shadow-sm">{appointment.type}</span>
        </div>
        
        {appointment.notes && (
          <div className="flex items-start gap-2 text-xs bg-black/10 rounded-lg p-2 mt-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="drop-shadow-sm line-clamp-2">{appointment.notes}</span>
          </div>
        )}
      </div>
      
      {/* Quick Actions - WhatsApp only */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/20">
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs font-medium transition-all duration-200 hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            // Abrir WhatsApp
            const phone = (appointment as any).patientPhone?.replace(/\D/g, '');
            if (phone) {
              window.open(`https://wa.me/55${phone}`, '_blank');
            }
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </button>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    </div>
  );
};
