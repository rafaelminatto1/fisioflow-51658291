import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, addDays, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PredictiveAnalytics() {
  const { data: predictions } = useQuery({
    queryKey: ["predictive-analytics"],
    queryFn: async () => {
      // Buscar dados dos últimos 30 dias
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const historicalPromises = last30Days.map(async (day) => {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("appointment_date", format(day, "yyyy-MM-dd"));

        return count || 0;
      });

      const historicalCounts = await Promise.all(historicalPromises);

      // Calcular média móvel simples para previsão
      const average = historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length;
      const trend = (historicalCounts[historicalCounts.length - 1] - historicalCounts[0]) / historicalCounts.length;

      // Prever próximos 7 dias
      const predictions = Array.from({ length: 7 }, (_, i) => {
        const predictedValue = Math.max(0, Math.round(average + trend * (30 + i)));
        return {
          date: format(addDays(new Date(), i + 1), "dd/MM", { locale: ptBR }),
          real: null,
          previsto: predictedValue,
        };
      });

      // Adicionar dados históricos dos últimos 7 dias para comparação
      const last7Days = historicalCounts.slice(-7).map((count, i) => ({
        date: format(subDays(new Date(), 6 - i), "dd/MM", { locale: ptBR }),
        real: count,
        previsto: null,
      }));

      return [...last7Days, ...predictions];
    },
  });

  const { data: insights } = useQuery({
    queryKey: ["predictive-insights"],
    queryFn: async () => {
      // Taxa de cancelamento
      const { count: totalAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", format(subDays(new Date(), 30), "yyyy-MM-dd"));

      const { count: canceledAppointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelado")
        .gte("appointment_date", format(subDays(new Date(), 30), "yyyy-MM-dd"));

      const cancellationRate = totalAppointments 
        ? Math.round((canceledAppointments || 0) / totalAppointments * 100)
        : 0;

      // Taxa de comparecimento
      const attendanceRate = 100 - cancellationRate;

      return {
        cancellationRate,
        attendanceRate,
        riskLevel: cancellationRate > 15 ? "high" : cancellationRate > 10 ? "medium" : "low",
      };
    },
  });

  return (
    <div className="space-y-4">
      {insights && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Taxa de Comparecimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{insights.attendanceRate}%</div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Taxa de Cancelamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{insights.cancellationRate}%</div>
                <AlertCircle className={`h-8 w-8 ${
                  insights.riskLevel === "high" ? "text-red-500" :
                  insights.riskLevel === "medium" ? "text-yellow-500" : "text-green-500"
                }`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Nível de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold capitalize">
                  {insights.riskLevel === "high" ? "Alto" : insights.riskLevel === "medium" ? "Médio" : "Baixo"}
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {insights?.riskLevel === "high" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Taxa de cancelamento acima do normal. Considere revisar políticas de confirmação e lembretes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Previsão de Agendamentos (Próximos 7 dias)</CardTitle>
          <CardDescription>
            Baseado em média móvel dos últimos 30 dias com tendência linear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={2} name="Real" />
              <Line type="monotone" dataKey="previsto" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name="Previsto" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
