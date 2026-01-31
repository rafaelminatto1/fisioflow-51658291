// Gráfico de receita em tempo real
import { useEffect, useState, useCallback, useMemo } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, Timestamp } from '@/integrations/firebase/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface RevenueData {
  date: string;
  revenue: number;
}

interface PaymentDocument {
  amount: number;
  created_at: Timestamp;
  status: string;
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRevenueData = useCallback(async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Últimos 7 dias

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'paid'),
        where('created_at', '>=', Timestamp.fromDate(startDate)),
        orderBy('created_at', 'asc')
      );

      // Use onSnapshot for realtime updates
      const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
        const payments: PaymentDocument[] = [];
        snapshot.forEach((doc) => {
          payments.push(doc.data() as PaymentDocument);
        });

        // Agrupar por dia
        const grouped = payments.reduce((acc: Record<string, number>, payment: PaymentDocument) => {
          const date = format(payment.created_at.toDate(), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + (payment.amount || 0);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).map(([date, revenue]) => ({
          date: format(new Date(date), 'dd/MM', { locale: ptBR }),
          revenue: Number(revenue),
        }));

        setData(chartData);
        setLoading(false);
      }, (error) => {
        logger.error('Erro ao carregar dados de receita', error, 'RevenueChart');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      logger.error('Erro ao carregar dados de receita', error, 'RevenueChart');
      setLoading(false);
      return () => {};
    }
  }, []);

  useEffect(() => {
    const unsubscribe = loadRevenueData();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
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
