/**
 * Dashboard Widgets Hook - Firebase Compatible
 *
 * This hook is already compatible with Firebase as it:
 * - Uses useAuth() from '@/contexts/AuthContext' (not supabase.auth)
 * - Stores widget preferences in localStorage
 * - No database queries required
 *
 * No migration needed.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/errors/logger';

export type WidgetType =
  | 'appointments-today'
  | 'revenue-month'
  | 'patients-active'
  | 'ocupancy-rate'
  | 'pending-payments'
  | 'waitlist-count'
  | 'upcoming-appointments'
  | 'recent-patients';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: number;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  config?: Record<string, unknown>;
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'appointments-today',
    type: 'appointments-today',
    title: 'Agendamentos Hoje',
    position: 0,
    size: 'small',
    visible: true,
  },
  {
    id: 'revenue-month',
    type: 'revenue-month',
    title: 'Receita do Mês',
    position: 1,
    size: 'small',
    visible: true,
  },
  {
    id: 'patients-active',
    type: 'patients-active',
    title: 'Pacientes Ativos',
    position: 2,
    size: 'small',
    visible: true,
  },
  {
    id: 'ocupancy-rate',
    type: 'ocupancy-rate',
    title: 'Taxa de Ocupação',
    position: 3,
    size: 'small',
    visible: true,
  },
];

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadWidgets();
  }, [user]);

  const loadWidgets = async () => {
    try {
      if (!user) return;

      const saved = localStorage.getItem(`dashboard-widgets-${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validar estrutura dos widgets
          if (Array.isArray(parsed) && parsed.every(w =>
            w.id && w.type && w.title && typeof w.position === 'number'
          )) {
            setWidgets(parsed);
          } else {
            logger.warn('Invalid widget structure, using defaults', undefined, 'useDashboardWidgets');
          }
        } catch (parseError) {
          logger.error('Failed to parse widgets, using defaults', parseError, 'useDashboardWidgets');
        }
      }
    } catch (error) {
      logger.error('Error loading widgets', error, 'useDashboardWidgets');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWidgets = async (newWidgets: DashboardWidget[]) => {
    try {
      if (!user) return;

      localStorage.setItem(`dashboard-widgets-${user.uid}`, JSON.stringify(newWidgets));
      setWidgets(newWidgets);
    } catch (error) {
      logger.error('Error saving widgets', error, 'useDashboardWidgets');
    }
  };

  const toggleWidget = (widgetId: string) => {
    const newWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    saveWidgets(newWidgets);
  };

  const reorderWidgets = (startIndex: number, endIndex: number) => {
    const result = Array.from(widgets);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    const reordered = result.map((w, idx) => ({ ...w, position: idx }));
    saveWidgets(reordered);
  };

  const updateWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    const newWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, size } : w
    );
    saveWidgets(newWidgets);
  };

  const resetToDefault = () => {
    saveWidgets(defaultWidgets);
  };

  return {
    widgets,
    isLoading,
    toggleWidget,
    reorderWidgets,
    updateWidgetSize,
    resetToDefault,
  };
}
