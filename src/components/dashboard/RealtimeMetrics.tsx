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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Agendamentos do dia
      const { data: appointments, count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .gte('appointment_date', today.toISOString().split('T')[0])
        .lt('appointment_date', tomorrow.toISOString().split('T')[0]);

      const confirmed = (appointments as any[])?.filter((apt) => apt.status === 'confirmed').length || 0;
      const cancelled = (appointments as any[])?.filter((apt) => apt.status === 'cancelled').length || 0;

      // Pacientes em sessão
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('patient_id')
        .eq('status', 'in_progress');

      const patientsInSession = new Set(activeSessions?.map((s) => s.patient_id) || []).size;

      // Receita do dia
      const { data: payments } = await (supabase as any)
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const todayRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Taxa de ocupação (simplificada)
      const totalSlots = 20; // Assumindo 20 slots disponíveis por dia
      const occupancyRate = appointmentsCount ? (appointmentsCount / totalSlots) * 100 : 0;

      setMetrics({
        totalAppointments: appointmentsCount || 0,
        confirmedAppointments: confirmed,
        cancelledAppointments: cancelled,
        patientsInSession,
        todayRevenue,
        occupancyRate: Math.min(occupancyRate, 100),
      });

      setLoading(false);
    } catch (error) {
      logger.error('Erro ao carregar métricas', error, 'RealtimeMetrics');
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

