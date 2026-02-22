/**
 * Empty State Enhanced - Componente de estado vazio melhorado
 *
 * Variantes específicas para diferentes contextos:
 * - Agenda vazia (sem agendamentos)
 * - Pesquisa sem resultados
 * - Lista de espera vazia
 * - Filtros sem correspondências
 * - Modo offline
 */

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type EmptyStateVariant = 'agenda' | 'search' | 'waitlist' | 'filters' | 'offline' | 'no-results';

interface EmptyStateEnhancedProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
  className?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// Ícones e mensagens específicos para cada variante
const VARIANT_CONFIGS: Record<EmptyStateVariant, {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
}> = {
  agenda: {
    title: 'Nenhum agendamento',
    description: 'Não há agendamentos para o período selecionado. Clique em um horário disponível para criar um novo agendamento.',
    icon: 'Calendar' as any,
    actionLabel: 'Novo Agendamento',
  },
  search: {
    title: 'Nenhum resultado encontrado',
    description: 'Tente ajustar os filtros ou buscar por outro termo.',
    icon: 'Search' as any,
    actionLabel: 'Limpar Filtros',
  },
  waitlist: {
    title: 'Lista de espera vazia',
    description: 'Não há pacientes na lista de espera no momento.',
    icon: 'Users' as any,
    actionLabel: 'Adicionar à Lista',
  },
  filters: {
    title: 'Nenhum resultado para os filtros',
    description: 'Ajuste os filtros para ver mais agendamentos.',
    icon: 'Filter' as any,
    actionLabel: 'Limpar Filtros',
  },
  offline: {
    title: 'Modo offline',
    description: 'Você está offline. As alterações serão sincronizadas quando a conexão for restabelecida.',
    icon: 'WifiOff' as any,
    actionLabel: 'Tentar Reconectar',
  },
  'no-results': {
    title: 'Nenhum resultado',
    description: 'Não encontramos o que você está procurando.',
    icon: 'SearchX' as any,
  },
};

const EmptyStateEnhanced = memo(({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'agenda',
  className,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateEnhancedProps) => {
  // Usar configuração específica se não fornece a variante
  const config = VARIANT_CONFIGS[variant] || {
    title,
    description,
    icon: Icon,
    actionLabel,
  };

  const hasActions = actionLabel || secondaryActionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="mx-auto mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={cn(
            "h-20 w-20 rounded-full flex items-center justify-center",
            variant === 'agenda' && "bg-gradient-to-br from-primary/20 to-primary/10",
            variant === 'offline' && "bg-slate-100 dark:bg-slate-800",
            "bg-slate-50 dark:bg-slate-900"
          )}
        >
          <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        </motion.div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-3">
        {config.title}
      </h3>

      <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        {config.description}
      </p>

      <AnimatePresence mode="wait">
        {hasActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            {actionLabel && onAction && (
              <Button
                onClick={onAction}
                className="rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                {actionLabel}
              </Button>
            )}

            {secondaryActionLabel && onSecondaryAction && (
              <Button
                variant="outline"
                onClick={onSecondaryAction}
                className="rounded-xl font-medium hover:scale-105 transition-all"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dica adicional para agenda vazia */}
      {variant === 'agenda' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-6 p-4 bg-muted/30 rounded-xl border border-muted"
        >
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="font-medium mb-1">Dica rápida:</p>
              <p className="text-muted-foreground/80">
                {config.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

EmptyStateEnhanced.displayName = 'EmptyStateEnhanced';

export { EmptyStateEnhanced };
