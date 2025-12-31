import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logger } from '@/lib/errors/logger';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeTherapists: number;
  remainingAppointments: number;
  newPatients: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    activeTherapists: 0,
    remainingAppointments: 0,
    newPatients: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Total patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // New patients this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: newPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Today's appointments
      const today = format(new Date(), 'yyyy-MM-dd');
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today);

      // Completed appointments today
      const { count: completedToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .eq('status', 'concluido');

      // Active therapists
      const { count: activeTherapists } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        monthlyRevenue: 18500, // Mock - implement when financial table exists
        activeTherapists: activeTherapists || 0,
        remainingAppointments: (todayAppointments || 0) - (completedToday || 0),
        newPatients: newPatients || 0
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Erro ao carregar estatísticas do dashboard', error, 'useDashboardStats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    // Real-time subscriptions
    const subscription = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          loadStats().catch((err) => {
            logger.error('Erro ao recarregar estatísticas após mudança em appointments', err, 'useDashboardStats');
          });
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          loadStats().catch((err) => {
            logger.error('Erro ao recarregar estatísticas após mudança em patients', err, 'useDashboardStats');
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
};
