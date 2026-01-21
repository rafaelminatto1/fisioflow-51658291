import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserMinus, CreditCard, UserPlus, TrendingUp, Clock } from "lucide-react";
import { format, subDays, subMonths, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { PatientHelpers } from '@/types';

export function InternalDashboard() {
  // Pacientes ativos (com consulta nos últimos 30 dias)
  const { data: activePatients, isLoading: loadingActive } = useQuery({
    queryKey: ["active-patients-dashboard"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data: appointments } = await supabase
        .from("appointments")
        .select("patient_id")
        .gte("appointment_date", thirtyDaysAgo);

      const uniquePatientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      return uniquePatientIds.length;
    },
  });

  // Pacientes inativos (sem consulta há mais de 30 dias)
  const { data: inactivePatients, isLoading: loadingInactive } = useQuery({
    queryKey: ["inactive-patients-list"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

      // Buscar todos os pacientes
      const { data: allPatients } = await supabase
        .from("patients")
        .select("id, full_name, phone, email, created_at");

      // Buscar pacientes com agendamentos recentes
      const { data: recentAppointments } = await supabase
        .from("appointments")
        .select("patient_id")
        .gte("appointment_date", thirtyDaysAgo);

      const activePatientIds = new Set(recentAppointments?.map(a => a.patient_id) || []);

      // Filtrar inativos
      const inactive = allPatients?.filter(p => !activePatientIds.has(p.id)) || [];

      // Buscar última consulta de cada paciente inativo
      const inactiveWithLastAppointment = await Promise.all(
        inactive.slice(0, 20).map(async (patient) => {
          const { data: lastAppt } = await supabase
            .from("appointments")
            .select("appointment_date")
            .eq("patient_id", patient.id)
            .order("appointment_date", { ascending: false })
            .limit(1)
            .single();

          return {
            ...patient,
            lastAppointment: lastAppt?.appointment_date || null,
          };
        })
      );

      return {
        total: inactive.length,
        list: inactiveWithLastAppointment,
      };
    },
  });

  // Pacientes com sessões pagas disponíveis
  const { data: patientsWithSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["patients-with-sessions"],
    queryFn: async () => {
      const { data: packages } = await supabase
        .from("session_packages")
        .select(`
          id,
          patient_id,
          total_sessions,
          used_sessions,
          remaining_sessions,
          status,
          patients (
            id,
            full_name,
            phone
          )
        `)
        .eq("status", "ativo")
        .gt("remaining_sessions", 0);

      return packages?.map(pkg => ({
        id: pkg.id,
        patientId: pkg.patient_id,
        patientName: (pkg.patients as { full_name?: string } | null)?.full_name || "N/A",
        patientPhone: (pkg.patients as { phone?: string } | null)?.phone || null,
        totalSessions: pkg.total_sessions,
        usedSessions: pkg.used_sessions,
        remainingSessions: pkg.remaining_sessions,
      })) || [];
    },
  });

  // Novos pacientes por período
  const { data: newPatientsData } = useQuery({
    queryKey: ["new-patients-by-period"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = format(startOfDay(now), "yyyy-MM-dd");
      const weekStart = format(startOfWeek(now, { locale: ptBR }), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");

      // Hoje
      const { count: todayCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${todayStart}T00:00:00`);

      // Semana
      const { count: weekCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${weekStart}T00:00:00`);

      // Mês
      const { count: monthCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${monthStart}T00:00:00`);

      // Últimos 6 meses para gráfico
      const sixMonthsData = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const monthDate = subMonths(now, 5 - i);
          const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
          const end = format(subDays(startOfMonth(subMonths(monthDate, -1)), 1), "yyyy-MM-dd");
          return supabase
            .from("patients")
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${start}T00:00:00`)
            .lte("created_at", `${end}T23:59:59`)
            .then(({ count }) => ({
              month: format(monthDate, "MMM", { locale: ptBR }),
              count: count || 0,
            }));
        })
      );

      return {
        today: todayCount || 0,
        thisWeek: weekCount || 0,
        thisMonth: monthCount || 0,
        byMonth: sixMonthsData,
      };
    },
  });

  // Total de pacientes
  const { data: totalPatients } = useQuery({
    queryKey: ["total-patients-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Total de Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900 dark:to-green-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="h-12 w-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pacientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 tracking-tight">
              {loadingActive ? "..." : activePatients}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Consulta nos últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-900 dark:to-orange-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <UserMinus className="h-12 w-12 text-orange-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <UserMinus className="h-4 w-4 text-orange-500" />
              Pacientes Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 tracking-tight">
              {loadingInactive ? "..." : inactivePatients?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Sem consulta há +30 dias</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <CreditCard className="h-12 w-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Sessões Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 tracking-tight">
              {loadingSessions ? "..." : patientsWithSessions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Pacotes ativos para uso</p>
          </CardContent>
        </Card>
      </div>

      {/* Novos Pacientes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              Crescimento de Pacientes
            </CardTitle>
            <CardDescription>Acompanhamento de novos cadastros</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="text-3xl font-bold text-primary">{newPatientsData?.today || 0}</div>
                <p className="text-xs font-semibold text-primary/70 mt-1 uppercase tracking-wider">Hoje</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="text-3xl font-bold text-blue-600">{newPatientsData?.thisWeek || 0}</div>
                <p className="text-xs font-semibold text-blue-600/70 mt-1 uppercase tracking-wider">Esta Semana</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <div className="text-3xl font-bold text-indigo-600">{newPatientsData?.thisMonth || 0}</div>
                <p className="text-xs font-semibold text-indigo-600/70 mt-1 uppercase tracking-wider">Este Mês</p>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newPatientsData?.byMonth || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
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
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Novos Pacientes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Sessões Reutilizáveis
            </CardTitle>
            <CardDescription>Pacotes ativos de sessões pré-pagas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {loadingSessions ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : patientsWithSessions?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum paciente com sessões disponíveis
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="text-right">Restantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsWithSessions?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.patientName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {item.remainingSessions} de {item.totalSessions}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pacientes Inativos */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-orange-500" />
            Pacientes Inativos
          </CardTitle>
          <CardDescription>
            Pacientes sem consulta há mais de 30 dias - considere uma estratégia de reativação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {loadingInactive ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : inactivePatients?.list?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum paciente inativo encontrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Última Consulta</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactivePatients?.list?.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{PatientHelpers.getName(patient)}</TableCell>
                      <TableCell>{patient.phone || "-"}</TableCell>
                      <TableCell>
                        {patient.lastAppointment
                          ? format(new Date(patient.lastAppointment), "dd/MM/yyyy", { locale: ptBR })
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Inativo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
