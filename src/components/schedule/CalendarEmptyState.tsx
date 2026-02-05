import React from 'react';
import { CalendarPlus, Users, Clock, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReducedMotion } from '@/lib/accessibility/a11y-utils';

interface CalendarEmptyStateProps {
  viewType: 'day' | 'week' | 'month';
  currentDate: Date;
  onCreateAppointment?: () => void;
  className?: string;
}

const getEmptyStateContent = (
  viewType: 'day' | 'week' | 'month',
  currentDate: Date
) => {
  const formattedDate = format(currentDate, "EEEE, d 'de' MMMM", {
    locale: ptBR,
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  switch (viewType) {
    case 'day':
      return {
        icon: CalendarPlus,
        title: 'Nenhum agendamento neste dia',
        description: `${capitalizedDate} está livre. Que tal agendar um atendimento?`,
        action: 'Agendar para este dia',
      };
    case 'week':
      return {
        icon: Users,
        title: 'Semana sem agendamentos',
        description: 'Esta semana ainda não possui atendimentos agendados.',
        action: 'Agendar para esta semana',
      };
    case 'month':
      return {
        icon: Clock,
        title: 'Mês tranquilo',
        description: 'Não há agendamentos visíveis neste mês.',
        action: 'Novo agendamento',
      };
  }
};

export const CalendarEmptyState: React.FC<CalendarEmptyStateProps> = ({
  viewType,
  currentDate,
  onCreateAppointment,
  className
}) => {
  const reducedMotion = useReducedMotion();
  const content = getEmptyStateContent(viewType, currentDate);
  const Icon = content.icon;

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const };
  const iconTransition = reducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.3 };
  const iconAnimate = reducedMotion ? { rotate: 0, scale: 1 } : { rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] };
  const iconTransitionLoop = reducedMotion ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className={cn(
        'flex flex-col items-center justify-center h-full px-8 py-12',
        'text-center',
        className
      )}
    >
      <motion.div
        initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={iconTransition}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl scale-150" aria-hidden />

        <div className="relative">
          <motion.div
            animate={iconAnimate}
            transition={iconTransitionLoop}
            className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-2 border-primary/20"
          >
            <Icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </motion.div>

          {!reducedMotion && (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400/20 dark:bg-amber-400/30"
                aria-hidden
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-blue-400/20 dark:bg-blue-400/30"
                aria-hidden
              />
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.3 }}
        className="mt-8 max-w-md"
      >
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {content.title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-gray-500 mb-6">
          {content.description}
        </p>

        {onCreateAppointment && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.2 }}
          >
            <Button
              onClick={onCreateAppointment}
              size="lg"
              className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all motion-reduce:transition-none"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              {content.action}
            </Button>
          </motion.div>
        )}

        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.4, duration: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-start gap-3 text-left">
            <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Dica
              </p>
              <p className="text-xs text-slate-600 dark:text-gray-500 mt-1">
                {viewType === 'day'
                  ? 'Use as setas do teclado ou clique nos horários para agendar rapidamente.'
                  : viewType === 'week'
                  ? (
                    <>
                      Clique e arraste um agendamento para reagendar.
                      <br />
                      Ou clique no agendamento e use <strong>Editar</strong> para mudar data e horário (sem arrastar).
                    </>
                  )
                  : 'Navegue pelos meses para ver todos os agendamentos futuros.'}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
