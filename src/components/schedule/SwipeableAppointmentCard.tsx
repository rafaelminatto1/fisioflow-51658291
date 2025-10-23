import React, { useRef, useState } from 'react';
import { Phone, MessageCircle, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment } from '@/types/appointment';

interface SwipeableAppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCall?: (id: string) => void;
  onWhatsApp?: (id: string) => void;
}

export const SwipeableAppointmentCard: React.FC<SwipeableAppointmentCardProps> = ({
  appointment,
  onClick,
  onConfirm,
  onCancel,
  onCall,
  onWhatsApp
}) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limita o swipe
    const maxSwipe = 200;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setSwipeX(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    // Se swipou mais de 60px, executa ação
    if (swipeX > 60) {
      // Swipe direita - confirmar
      if (onConfirm) onConfirm(appointment.id);
    } else if (swipeX < -60) {
      // Swipe esquerda - cancelar
      if (onCancel) onCancel(appointment.id);
    }
    
    // Volta para posição original
    setSwipeX(0);
  };

  const handleClick = () => {
    if (Math.abs(swipeX) < 10) {
      onClick();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Actions background - esquerda (cancelar) */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-end gap-2 pr-4',
          'bg-gradient-to-l from-red-500 to-red-600',
          'transition-opacity duration-200',
          swipeX < -20 ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: Math.abs(Math.min(swipeX, 0)) }}
      >
        <X className="h-6 w-6 text-white" />
        <span className="text-white font-bold text-sm">Cancelar</span>
      </div>

      {/* Actions background - direita (confirmar) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 flex items-center justify-start gap-2 pl-4',
          'bg-gradient-to-r from-emerald-500 to-emerald-600',
          'transition-opacity duration-200',
          swipeX > 20 ? 'opacity-100' : 'opacity-0'
        )}
        style={{ width: Math.max(swipeX, 0) }}
      >
        <Check className="h-6 w-6 text-white" />
        <span className="text-white font-bold text-sm">Confirmar</span>
      </div>

      {/* Card principal */}
      <div
        className={cn(
          'transition-transform duration-200',
          isSwiping ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <AppointmentCard
          appointment={appointment}
          onClick={() => {}}
          variant="compact"
        />
      </div>

      {/* Quick actions - sempre visíveis no bottom */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {onCall && (
          <button
            className="p-1.5 rounded-full bg-blue-500 text-white shadow-lg pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onCall(appointment.id);
            }}
          >
            <Phone className="h-3 w-3" />
          </button>
        )}
        {onWhatsApp && (
          <button
            className="p-1.5 rounded-full bg-green-500 text-white shadow-lg pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(appointment.id);
            }}
          >
            <MessageCircle className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};
