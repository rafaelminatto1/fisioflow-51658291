// Componente de métricas em tempo real usando Supabase Realtime
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, DollarSign, Calendar } from 'lucide-react';
import { logger } from '@/lib/errors/logger';

interface RealtimeMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  patientsInSession: number;
  todayRevenue: number;
  occupancyRate: number;
}

export function RealtimeMetrics() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    totalAppointments: 0,
    confirmedAppointments: 0,
    cancelledAppointments: 0,
    patientsInSession: 0,
    todayRevenue: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Função auxiliar para timeout
      const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          Promise.resolve(promise),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      };

      // Carregar dados em paralelo com timeout
      const [appointmentsResult, sessionsResult, paymentsResult] = await Promise.allSettled([
        withTimeout(
          supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .gte('appointment_date', todayStr)
            .lt('appointment_date', tomorrowStr),
          8000
        ),
        withTimeout(
          supabase
            .from('sessions')
            .select('patient_id')
            .eq('status', 'in_progress'),
          8000
        ),
        withTimeout(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('payments')
            .select('amount')
            .eq('status', 'completed')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString()),
          8000
        ).catch(() => ({ data: null })),
      ]);

      // Processar resultados com fallback
      let appointmentsCount = 0;
      let confirmed = 0;
      let cancelled = 0;

      if (appointmentsResult.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const appointments = appointmentsResult.value.data as any[];
        appointmentsCount = appointmentsResult.value.count || 0;
        confirmed = appointments?.filter((apt) => apt.status === 'confirmed' || apt.status === 'confirmado').length || 0;
        cancelled = appointments?.filter((apt) => apt.status === 'cancelled' || apt.status === 'cancelado').length || 0;
      }

      const patientsInSession = sessionsResult.status === 'fulfilled'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new Set((sessionsResult.value as any).data?.map((s: any) => s.patient_id) || []).size
        : 0;

      const todayRevenue = paymentsResult.status === 'fulfilled' && (paymentsResult.value as any).data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? ((paymentsResult.value as any).data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        : 0;

      // Taxa de ocupação (simplificada)
      const totalSlots = 20; // Assumindo 20 slots disponíveis por dia
      const occupancyRate = appointmentsCount ? (appointmentsCount / totalSlots) * 100 : 0;

      setMetrics({
        totalAppointments: appointmentsCount,
        confirmedAppointments: confirmed,
        cancelledAppointments: cancelled,
        patientsInSession,
        todayRevenue,
        occupancyRate: Math.min(occupancyRate, 100),
      });
    } catch (error) {
      logger.error('Erro ao carregar métricas', error, 'RealtimeMetrics');
      // Manter valores padrão em caso de erro
      setMetrics({
        totalAppointments: 0,
        confirmedAppointments: 0,
        cancelledAppointments: 0,
        patientsInSession: 0,
        todayRevenue: 0,
        occupancyRate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carregar métricas iniciais
    loadMetrics();

    // Configurar subscription para mudanças em tempo real
    const channel = supabase
      .channel('dashboard-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          loadMetrics(); // Recarregar métricas quando houver mudança
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          loadMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          loadMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMetrics]);

  const formattedRevenue = useMemo(() =>
    metrics.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    [metrics.todayRevenue]
  );

  const occupancyRateFormatted = useMemo(() =>
    metrics.occupancyRate.toFixed(1),
    [metrics.occupancyRate]
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
          <CardDescription className="text-xs">
            {metrics.confirmedAppointments} confirmados, {metrics.cancelledAppointments} cancelados
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Atendimento</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.patientsInSession}</div>
          <CardDescription className="text-xs">Pacientes em sessão agora</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {formattedRevenue}
          </div>
          <CardDescription className="text-xs">Receita do dia</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{occupancyRateFormatted}%</div>
          <CardDescription className="text-xs">Ocupação do dia</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

