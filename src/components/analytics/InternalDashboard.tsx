import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserMinus, CreditCard, UserPlus, TrendingUp, Clock } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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
        .select("id, name, phone, email, created_at");

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
            name,
            phone
          )
        `)
        .eq("status", "ativo")
        .gt("remaining_sessions", 0);

      return packages?.map(pkg => ({
        id: pkg.id,
        patientId: pkg.patient_id,
        patientName: (pkg.patients as any)?.name || "N/A",
        patientPhone: (pkg.patients as any)?.phone || null,
        totalSessions: pkg.total_sessions,
        usedSessions: pkg.used_sessions,
        remainingSessions: pkg.remaining_sessions,
      })) || [];
    },
  });

  // Novos pacientes por período
  const { data: newPatientsData, isLoading: loadingNewPatients } = useQuery({
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
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total de Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pacientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loadingActive ? "..." : activePatients}
            </div>
            <p className="text-xs text-muted-foreground">Consulta nos últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-orange-500" />
              Pacientes Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loadingInactive ? "..." : inactivePatients?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">Sem consulta há +30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Com Sessões Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loadingSessions ? "..." : patientsWithSessions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pacotes ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Novos Pacientes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Novos Pacientes
            </CardTitle>
            <CardDescription>Cadastros por período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{newPatientsData?.today || 0}</div>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{newPatientsData?.thisWeek || 0}</div>
                <p className="text-xs text-muted-foreground">Esta Semana</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{newPatientsData?.thisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">Este Mês</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={newPatientsData?.byMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Novos Pacientes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pacientes com Sessões Pagas
            </CardTitle>
            <CardDescription>Pacotes ativos disponíveis para uso</CardDescription>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pacientes Inativos
          </CardTitle>
          <CardDescription>
            Pacientes sem consulta há mais de 30 dias - considere reativação
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
                      <TableCell className="font-medium">{patient.name}</TableCell>
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
