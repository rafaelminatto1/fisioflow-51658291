// Gráfico de receita em tempo real
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/errors/logger';

interface RevenueData {
  date: string;
  revenue: number;
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRevenueData = useCallback(async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Últimos 7 dias

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (payments) {
        // Agrupar por dia
        const grouped = (payments as any[]).reduce((acc: Record<string, number>, payment: any) => {
          const date = format(new Date(payment.created_at), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + (payment.amount || 0);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).map(([date, revenue]) => ({
          date: format(new Date(date), 'dd/MM', { locale: ptBR }),
          revenue: Number(revenue),
        }));

        setData(chartData);
      }

      setLoading(false);
    } catch (error) {
      logger.error('Erro ao carregar dados de receita', error, 'RevenueChart');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevenueData();

    // Subscription para mudanças em pagamentos
    const channel = supabase
      .channel('revenue-chart')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: 'status=eq.completed',
        },
        () => {
          loadRevenueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRevenueData]);

  const tooltipFormatter = useMemo(() => (value: number) => [
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    'Receita',
  ], []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita dos Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita dos Últimos 7 Dias</CardTitle>
        <CardDescription>Atualizações em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={tooltipFormatter} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

