import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AppointmentAnalytics() {
  const { data: dailyData } = useQuery({
    queryKey: ["appointment-daily-analytics"],
    queryFn: async () => {
      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const promises = last30Days.map(async (day) => {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("appointment_date", format(day, "yyyy-MM-dd"));

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          agendamentos: count || 0,
        };
      });

      return Promise.all(promises);
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ["appointment-status-analytics"],
    queryFn: async () => {
      const statuses = ["agendado", "confirmado", "concluido", "cancelado"];
      const promises = statuses.map(async (status) => {
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("status", status)
          .gte("appointment_date", format(subDays(new Date(), 30), "yyyy-MM-dd"));

        return {
          status: status.charAt(0).toUpperCase() + status.slice(1),
          total: count || 0,
        };
      });

      return Promise.all(promises);
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por Dia (Últimos 30 dias)</CardTitle>
          <CardDescription>Volume diário de agendamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="agendamentos" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
          <CardDescription>Status dos agendamentos nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
