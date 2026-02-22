/**
 * LazyAppointmentModal - Modal de agendamento com lazy loading
 *
 * Performance: Carrega formulário apenas quando necessário
 * - React.lazy para code splitting
 * - Suspense com fallback otimizado
 * - Preloading na hover
 * - Cache de componentes
 */

import React, { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';

// Lazy load do modal completo
const AppointmentModalContent = lazy(() =>
  import('./AppointmentModalRefactored').then(m => ({
    default: m.AppointmentModalRefactored
  }))
);

// Skeleton loading otimizado
const ModalSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted/20 rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-muted/10 rounded animate-pulse" />
      </div>
      <div className="h-8 w-8 bg-muted/20 rounded-full animate-pulse" />
    </div>

    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-muted/10 rounded animate-pulse" />
          <div className="h-10 w-full bg-muted/20 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>

    <div className="flex gap-3 pt-4 border-t">
      <div className="h-10 flex-1 bg-muted/20 rounded-lg animate-pulse" />
      <div className="h-10 flex-1 bg-muted/20 rounded-lg animate-pulse" />
    </div>
  </div>
);

interface LazyAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  onSave?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  className?: string;
  preloadOnHover?: boolean;
}

export const LazyAppointmentModal = memo(({
  isOpen,
  onClose,
  appointment,
  onSave,
  onDelete,
  className,
  preloadOnHover = true,
}: LazyAppointmentModalProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);

  // Preload do componente
  const preload = useCallback(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    // Trigger lazy load
    import('./AppointmentModalRefactored');
    setIsLoaded(true);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Preload quando modal está quase aberto (hover no trigger button)
  useEffect(() => {
    if (preloadOnHover && shouldLoad) {
      preload();
    }
  }, [shouldLoad, preloadOnHover, preload]);

  // Expor método de preload
  useEffect(() => {
    const element = modalRef.current;
    if (!element || !preloadOnHover) return;

    const handleMouseEnter = () => setShouldLoad(true);
    element.addEventListener('mouseenter', handleMouseEnter);

    return () => element?.removeEventListener('mouseenter', handleMouseEnter);
  }, [preloadOnHover]);

  // Carregar quando modal abre
  useEffect(() => {
    if (isOpen) {
      preload();
    }
  }, [isOpen, preload]);

  if (!isOpen) return null;

  const title = appointment ? 'Editar Agendamento' : 'Novo Agendamento';
  const subtitle = appointment
    ? `Paciente: ${appointment.patientName || appointment.patient?.name}`
    : 'Preencha os dados para criar um novo agendamento';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative w-full max-w-2xl bg-background rounded-2xl shadow-2xl overflow-hidden',
            className
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content with Suspense */}
          <div className="max-h-[70vh] overflow-y-auto">
            <Suspense fallback={<ModalSkeleton />}>
              <AppointmentModalContent
                isOpen={isOpen}
                onClose={onClose}
                appointment={appointment}
                onSave={onSave}
                onDelete={onDelete}
              />
            </Suspense>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

LazyAppointmentModal.displayName = 'LazyAppointmentModal';

// Hook para preloading do modal
export const useAppointmentModalPreload = () => {
  const preload = useCallback(() => {
    import('./AppointmentModalRefactored');
  }, []);

  return { preload };
};
