import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { db, collection, getDocs, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subMonths, eachMonthOfInterval, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeFirestoreData } from '@/utils/firestoreData';

interface AppointmentData {
  payment_amount?: number;
}

interface PaymentData {
  payment_method?: string;
  amount?: string | number;
}

export function FinancialAnalytics() {
  const { data: monthlyRevenue } = useQuery({
    queryKey: ["financial-monthly-revenue"],
    queryFn: async () => {
      const last6Months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      const promises = last6Months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = startOfMonth(addMonths(month, 1));

        const q = firestoreQuery(
          collection(db, "appointments"),
          where("appointment_date", ">=", monthStart.toISOString()),
          where("appointment_date", "<", monthEnd.toISOString()),
          where("payment_status", "==", "pago")
        );

        const snapshot = await getDocs(q);
        const appointments = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()));

        const receita = appointments.reduce((sum, appt: AppointmentData) => sum + (appt.payment_amount || 0), 0);

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
      const oneMonthAgo = subMonths(new Date(), 1);

      const q = firestoreQuery(
        collection(db, "payments"),
        where("created_at", ">=", oneMonthAgo.toISOString())
      );

      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => normalizeFirestoreData(doc.data()));

      const paymentMap = new Map<string, number>();

      payments.forEach((payment: PaymentData) => {
        const method = payment.payment_method || "Outros";
        const amount = Number(payment.amount) || 0;
        paymentMap.set(method, (paymentMap.get(method) || 0) + amount);
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