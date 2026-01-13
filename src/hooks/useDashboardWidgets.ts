import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const saved = localStorage.getItem(`dashboard-widgets-${user.id}`);
      if (saved) {
        setWidgets(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading widgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWidgets = async (newWidgets: DashboardWidget[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      localStorage.setItem(`dashboard-widgets-${user.id}`, JSON.stringify(newWidgets));
      setWidgets(newWidgets);
    } catch (error) {
      console.error('Error saving widgets:', error);
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
