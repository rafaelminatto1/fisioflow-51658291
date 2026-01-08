import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      let total = 0;

      data?.forEach((payment) => {
        const method = payment.payment_method || "Outros";
        const amount = Number(payment.amount) || 0;
        paymentMap.set(method, (paymentMap.get(method) || 0) + amount);
        total += amount;
      });

      return Array.from(paymentMap.entries()).map(([metodo, valor]) => ({
        metodo,
        valor: Number(valor.toFixed(2)),
      })).sort((a, b) => b.valor - a.valor);
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal (Últimos 6 meses)</CardTitle>
          <CardDescription>Evolução da receita ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value}`} />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Método de Pagamento</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentMethods}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metodo" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value}`} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
