import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subMonths, eachMonthOfInterval, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FinancialAnalytics() {
  const { data: monthlyRevenue } = useQuery({
    queryKey: ["financial-monthly-revenue"],
    queryFn: async () => {
      const last6Months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      const promises = last6Months.map(async (month) => {
        const { data } = await supabase
          .from("appointments")
          .select("payment_amount")
          .gte("appointment_date", format(startOfMonth(month), "yyyy-MM-dd"))
          .lt("appointment_date", format(startOfMonth(subMonths(month, -1)), "yyyy-MM-dd"))
          .eq("payment_status", "pago");

        const receita = data?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;

        return {
          mes: format(month, "MMM/yy", { locale: ptBR }),
          receita: Number(receita.toFixed(2)),
        };
      });

      return Promise.all(promises);
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["financial-payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_method")
        .gte("created_at", format(subMonths(new Date(), 1), "yyyy-MM-dd"));

      const paymentMap = new Map<string, number>();
      // let total = 0;

      data?.forEach((payment) => {
        const method = payment.payment_method || "Outros";
        const amount = Number(payment.amount) || 0;
        paymentMap.set(method, (paymentMap.get(method) || 0) + amount);
        // total += amount;
      });

      return Array.from(paymentMap.entries()).map(([metodo, valor]) => ({
        metodo,
        valor: Number(valor.toFixed(2)),
      })).sort((a, b) => b.valor - a.valor);
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Receita Mensal (Últimos 6 meses)</CardTitle>
          <CardDescription>Evolução da receita ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="mes"
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Distribuição por Método de Pagamento</CardTitle>
          <CardDescription>Volume financeiro por método nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
