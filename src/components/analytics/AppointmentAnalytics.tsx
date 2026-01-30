import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getFirebaseDb } from "@/integrations/firebase/app";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
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
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const q = query(
          collection(db, "appointments"),
          where("appointment_date", ">=", dayStart.toISOString()),
          where("appointment_date", "<=", dayEnd.toISOString())
        );

        const snapshot = await getDocs(q);
        const count = snapshot.docs.length;

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          agendamentos: count,
        };
      });

      return Promise.all(promises);
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ["appointment-status-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const statuses = ["agendado", "confirmado", "concluido", "cancelado"];

      const promises = statuses.map(async (status) => {
        const q = query(
          collection(db, "appointments"),
          where("status", "==", status),
          where("appointment_date", ">=", thirtyDaysAgo.toISOString())
        );

        const snapshot = await getDocs(q);
        const count = snapshot.docs.length;

        return {
          status: status.charAt(0).toUpperCase() + status.slice(1),
          total: count,
        };
      });

      return Promise.all(promises);
    },
  });

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Agendamentos por Dia (Últimos 30 dias)</CardTitle>
          <CardDescription>Volume diário de agendamentos no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <defs>
                  <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                />
                <Line
                  type="monotone"
                  dataKey="agendamentos"
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
          <CardTitle>Distribuição por Status</CardTitle>
          <CardDescription>Status dos agendamentos nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="status"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(var(--primary-rgb), 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)' }}
                />
                <Bar
                  dataKey="total"
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
