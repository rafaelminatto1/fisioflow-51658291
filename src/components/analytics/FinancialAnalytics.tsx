import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, financialApi, type Pagamento } from '@/lib/api/workers-client';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { format, eachMonthOfInterval, startOfMonth, addMonths, subDays, differenceInMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAnalyticsFilters } from '@/contexts/AnalyticsFiltersContext';

const normalizeMethod = (value?: string | null) => value?.trim() || 'Outros';

export function FinancialAnalytics() {
  const { filters } = useAnalyticsFilters();
  const { dateRange, professionalId } = filters;

  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['financial-revenue-analytics', dateRange, professionalId],
    enabled: !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const monthsDiff = differenceInMonths(dateRange.to, dateRange.from);

      if (monthsDiff >= 2) {
        // Mostrar por mês se o período for longo
        const intervalMonths = eachMonthOfInterval({
          start: dateRange.from,
          end: dateRange.to,
        });

        const items = await Promise.all(
          intervalMonths.map(async (month) => {
            const monthStart = startOfMonth(month);
            const monthEnd = startOfMonth(addMonths(month, 1));
            const response = await analyticsApi.financial({
              startDate: format(monthStart, 'yyyy-MM-dd'),
              endDate: format(subDays(monthEnd, 1), 'yyyy-MM-dd'),
              therapistId: professionalId === 'all' ? undefined : professionalId,
            });

            return {
              label: format(month, 'MMM/yy', { locale: ptBR }),
              receita: Number(response?.data?.totalRevenue ?? 0),
            };
          }),
        );
        return items;
      } else {
        // Mostrar por dia se o período for curto
        const intervalDays = eachDayOfInterval({
          start: dateRange.from,
          end: dateRange.to,
        });

        const response = await analyticsApi.financial({
          startDate: format(dateRange.from, 'yyyy-MM-dd'),
          endDate: format(dateRange.to, 'yyyy-MM-dd'),
          therapistId: professionalId === 'all' ? undefined : professionalId,
        });

        // Como o analyticsApi.financial provavelmente retorna apenas o total, 
        // precisaríamos de uma API que retorne por dia. 
        // Por enquanto, vamos simular ou mostrar o total no período.
        return [{
          label: `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`,
          receita: Number(response?.data?.totalRevenue ?? 0),
        }];
      }
    },
  });

  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ['financial-payment-methods', dateRange, professionalId],
    enabled: !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const response = await financialApi.pagamentos.list({
        limit: 3000,
      });

      const payments = ((response?.data ?? []) as Pagamento[]).filter((payment) => {
        if (!payment.created_at) return false;
        const payDate = new Date(payment.created_at);
        return payDate >= dateRange.from! && payDate <= dateRange.to!;
      });

      const paymentMap = new Map<string, number>();
      payments.forEach((payment) => {
        const method = normalizeMethod(payment.forma_pagamento);
        paymentMap.set(method, (paymentMap.get(method) ?? 0) + Number(payment.valor ?? 0));
      });

      return Array.from(paymentMap.entries())
        .map(([metodo, valor]) => ({
          metodo,
          valor: Number(valor.toFixed(2)),
        }))
        .sort((a, b) => b.valor - a.valor);
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Receita no Período</CardTitle>
          <CardDescription>Evolução da receita no intervalo selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {isLoadingRevenue ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value) => `R$ ${value}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Distribuição por Método de Pagamento</CardTitle>
          <CardDescription>Volume financeiro por método no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {isLoadingMethods ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Carregando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="metodo"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    formatter={(value) => `R$ ${value}`}
                    cursor={{ fill: 'rgba(var(--primary-rgb), 0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                  />
                  <Bar
                    dataKey="valor"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
