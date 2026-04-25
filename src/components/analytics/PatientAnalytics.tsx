import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  patientsApi,
  appointmentsApi,
  financialApi,
  type PatientRow,
  type AppointmentRow,
  type PatientPackageRow,
} from "@/api/v2";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  format,
  subDays,
  startOfDay,
  startOfMonth,
  subMonths,
  eachMonthOfInterval,
  differenceInMonths,
  eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, TrendingUp, UserMinus, UserPlus, CreditCard, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";
import { PatientHelpers } from "@/types";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted))",
];

const getPatientAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Date().getFullYear() - date.getFullYear();
};

const listAllPatients = async () => {
  const all: PatientRow[] = [];
  let offset = 0;
  const limit = 1000;
  while (offset < 10000) {
    const response = await patientsApi.list({ limit, offset, sortBy: "name_asc", minimal: true });
    const chunk = response?.data ?? [];
    all.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return all;
};

const listAppointments = async (dateFrom?: string, dateTo?: string, therapistId?: string) => {
  const items: AppointmentRow[] = [];
  let offset = 0;
  const limit = 1000;
  while (offset < 10000) {
    const response = await appointmentsApi.list({
      dateFrom,
      dateTo,
      limit,
      offset,
      therapistId: therapistId === "all" ? undefined : therapistId,
    });
    const chunk = response?.data ?? [];
    items.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return items;
};

export function PatientAnalytics() {
  const { filters } = useAnalyticsFilters();
  const { dateRange, professionalId } = filters;

  // ── Distribuição por status ──────────────────────────────────────────────────
  const { data: statusData, isLoading: loadingStatus } = useQuery({
    queryKey: ["patient-status-analytics", professionalId],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [allPatients, therapistAppointments] = await Promise.all([
        listAllPatients(),
        professionalId !== "all"
          ? listAppointments(undefined, undefined, professionalId)
          : Promise.resolve(null),
      ]);

      let activeCount = 0;
      let inactiveCount = 0;
      if (professionalId === "all") {
        activeCount = allPatients.filter(
          (p) => p.status === "ativo" || p.is_active === true,
        ).length;
        inactiveCount = allPatients.length - activeCount;
      } else {
        const ids = new Set(therapistAppointments?.map((a) => a.patient_id).filter(Boolean));
        const pts = allPatients.filter((p) => ids.has(p.id));
        activeCount = pts.filter((p) => p.status === "ativo" || p.is_active === true).length;
        inactiveCount = pts.length - activeCount;
      }
      return [
        { name: "Ativos", value: activeCount },
        { name: "Inativos", value: inactiveCount },
      ];
    },
  });

  // ── Distribuição por faixa etária ────────────────────────────────────────────
  const { data: ageData, isLoading: loadingAge } = useQuery({
    queryKey: ["patient-age-analytics", professionalId],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [allPatients, therapistAppointments] = await Promise.all([
        listAllPatients(),
        professionalId !== "all"
          ? listAppointments(undefined, undefined, professionalId)
          : Promise.resolve(null),
      ]);

      let pts = allPatients;
      if (professionalId !== "all") {
        const ids = new Set(therapistAppointments?.map((a) => a.patient_id).filter(Boolean));
        pts = allPatients.filter((p) => ids.has(p.id));
      }

      const ranges = { "0-17": 0, "18-30": 0, "31-50": 0, "51-70": 0, "70+": 0 };
      pts.forEach((p) => {
        const age = getPatientAge(p.birth_date);
        if (age == null) return;
        if (age < 18) ranges["0-17"]++;
        else if (age <= 30) ranges["18-30"]++;
        else if (age <= 50) ranges["31-50"]++;
        else if (age <= 70) ranges["51-70"]++;
        else ranges["70+"]++;
      });
      return Object.entries(ranges).map(([faixa, total]) => ({ faixa, total }));
    },
  });

  // ── Pacientes ativos no período (filtro global) ──────────────────────────────
  const { data: activePatientsCount, isLoading: loadingActive } = useQuery({
    queryKey: ["active-patients-period", dateRange, professionalId],
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const from = format(dateRange!.from!, "yyyy-MM-dd");
      const to = format(dateRange!.to!, "yyyy-MM-dd");
      const snapshot = await listAppointments(from, to, professionalId);
      return new Set(snapshot.map((a) => a.patient_id).filter(Boolean)).size;
    },
  });

  // ── Total de pacientes ────────────────────────────────────────────────────────
  const { data: totalPatients } = useQuery({
    queryKey: ["total-patients-count"],
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => (await listAllPatients()).length,
  });

  // ── Pacientes inativos (sem consulta há +30 dias) ────────────────────────────
  const { data: inactiveData, isLoading: loadingInactive } = useQuery({
    queryKey: ["inactive-patients-list", professionalId],
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const [allPatients, recentAppointments] = await Promise.all([
        listAllPatients(),
        listAppointments(format(thirtyDaysAgo, "yyyy-MM-dd"), undefined, professionalId),
      ]);

      const activeIds = new Set(recentAppointments.map((a) => a.patient_id).filter(Boolean));
      const inactive = allPatients.filter((p) => !activeIds.has(p.id));

      const allApts = await listAppointments(undefined, undefined, professionalId);
      const lastVisitMap = new Map<string, string>();
      allApts.forEach((a) => {
        if (!a.patient_id || !a.date) return;
        const cur = lastVisitMap.get(a.patient_id);
        if (!cur || new Date(a.date) > new Date(cur)) lastVisitMap.set(a.patient_id, a.date);
      });

      return {
        total: inactive.length,
        list: inactive
          .slice(0, 20)
          .map((p) => ({ ...p, lastAppointment: lastVisitMap.get(p.id) || null })),
      };
    },
  });

  // ── Novos pacientes por período ──────────────────────────────────────────────
  const { data: newPatientsData } = useQuery({
    queryKey: ["new-patients-by-period", dateRange],
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const from = dateRange!.from!;
      const to = dateRange!.to!;
      const patients = await listAllPatients();

      const periodTotal = patients.filter((p) => {
        const c = new Date(p.created_at);
        return c >= from && c <= to;
      }).length;

      const monthsDiff = differenceInMonths(to, from);
      let chartData;
      if (monthsDiff >= 2) {
        chartData = eachMonthOfInterval({ start: from, end: to }).map((month) => {
          const start = startOfMonth(month);
          const end = startOfMonth(subMonths(month, -1));
          return {
            label: format(month, "MMM/yy", { locale: ptBR }),
            count: patients.filter((p) => {
              const c = new Date(p.created_at);
              return c >= start && c < end;
            }).length,
          };
        });
      } else {
        const days = eachDayOfInterval({ start: from, end: to });
        chartData = days
          .filter((_, i) => days.length <= 15 || i % 2 === 0)
          .map((day) => {
            const dStart = startOfDay(day);
            const dEnd = startOfDay(subDays(day, -1));
            return {
              label: format(day, "dd/MM", { locale: ptBR }),
              count: patients.filter((p) => {
                const c = new Date(p.created_at);
                return c >= dStart && c < dEnd;
              }).length,
            };
          });
      }
      return { periodTotal, chartData };
    },
  });

  // ── Sessões disponíveis (pacotes com saldo) ──────────────────────────────────
  const { data: patientsWithSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["patients-with-sessions"],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const response = await financialApi.patientPackages.list({ status: "active", limit: 500 });
      return ((response?.data ?? []) as PatientPackageRow[])
        .filter((pkg) => Number(pkg.remaining_sessions ?? 0) > 0)
        .map((pkg) => ({
          id: pkg.id,
          patientId: pkg.patient_id,
          patientName: pkg.patient_name || "N/A",
          totalSessions: pkg.total_sessions,
          usedSessions: pkg.used_sessions,
          remainingSessions: pkg.remaining_sessions,
        }));
    },
  });

  return (
    <div className="space-y-8">
      {/* ── KPI resumo ── */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
            <Users className="h-16 w-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total de Pacientes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black tracking-tighter">{totalPatients || 0}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="bg-primary/5 text-primary text-[10px] font-bold border-none"
              >
                Base total
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">Cadastrados</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/20" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
            <TrendingUp className="h-16 w-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pacientes Ativos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black tracking-tighter text-emerald-600">
              {loadingActive ? "..." : activePatientsCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="bg-emerald-500/5 text-emerald-600 text-[10px] font-bold border-none"
              >
                No período
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">Com consulta</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500/20" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
            <UserMinus className="h-16 w-16 text-orange-500" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <UserMinus className="h-4 w-4 text-orange-500" />
              </div>
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pacientes Inativos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black tracking-tighter text-orange-600">
              {loadingInactive ? "..." : inactiveData?.total || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="bg-orange-500/5 text-orange-600 text-[10px] font-bold border-none"
              >
                Risco
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                Sem consulta +30d
              </span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-orange-500/20" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
            <CreditCard className="h-16 w-16 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sessões em Aberto
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black tracking-tighter text-blue-600">
              {loadingSessions ? "..." : patientsWithSessions?.length || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="bg-blue-500/5 text-blue-600 text-[10px] font-bold border-none"
              >
                Créditos
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                Pacotes com saldo
              </span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-blue-500/20" />
        </Card>
      </div>

      {/* ── Distribuição status + faixa etária ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>
              {professionalId === "all"
                ? "Status de todos os pacientes"
                : "Status dos pacientes do profissional"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {loadingStatus ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <SafeResponsiveContainer className="h-full" minHeight={260}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
                      }}
                    />
                  </PieChart>
                </SafeResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusData?.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-muted-foreground">{entry.name}</span>
                  <span className="text-sm font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader>
            <CardTitle>Distribuição por Faixa Etária</CardTitle>
            <CardDescription>Perfil de idade dos pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loadingAge ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <SafeResponsiveContainer className="h-full" minHeight={300}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="faixa"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748B", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </SafeResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Novos Pacientes + Sessões disponíveis ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Novos Pacientes
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Crescimento da base no período
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary leading-tight">
                  {newPatientsData?.periodTotal || 0}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase">
                  Total Novos
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[260px] w-full">
              <SafeResponsiveContainer className="h-full" minHeight={260}>
                <LineChart data={newPatientsData?.chartData || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                    dy={15}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Novos Pacientes"
                  />
                </LineChart>
              </SafeResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border/50 bg-background flex flex-col">
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Sessões Disponíveis
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Pacientes com saldo de sessões pré-pagas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[340px]">
              {loadingSessions ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">
                  Carregando...
                </div>
              ) : patientsWithSessions?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[340px] text-center px-6">
                  <CreditCard className="h-6 w-6 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm font-medium">
                    Nenhum paciente com saldo
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-bold uppercase h-9">
                        Paciente
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase h-9 px-6">
                        Saldo
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsWithSessions?.map((item) => (
                      <TableRow key={item.id} className="border-border/40">
                        <TableCell className="font-bold text-sm py-3 px-4">
                          {item.patientName}
                        </TableCell>
                        <TableCell className="text-right py-3 px-6">
                          <Badge
                            variant="outline"
                            className="bg-blue-500/5 text-blue-600 border-blue-500/20 font-bold"
                          >
                            {item.remainingSessions} / {item.totalSessions}
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

      {/* ── Reativação de Pacientes ── */}
      <Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Clock className="h-5 w-5 text-orange-500" />
                Reativação de Pacientes
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Pacientes sem consulta há mais de 30 dias
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-orange-500/30 text-orange-600 bg-orange-500/5"
            >
              Ação Necessária
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[280px]">
            {loadingInactive ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Analisando base...
              </div>
            ) : inactiveData?.list?.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Excelente! Todos os pacientes estão ativos.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-bold uppercase h-10 px-6">
                      Nome
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase h-10">Contato</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase h-10">
                      Última Visita
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase h-10 text-right px-6">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveData?.list?.map((patient: any) => (
                    <TableRow
                      key={patient.id}
                      className="border-border/40 hover:bg-muted/10 transition-colors"
                    >
                      <TableCell className="font-bold text-sm py-4 px-6">
                        {PatientHelpers.getName(patient)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-medium">
                        {patient.phone || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {patient.lastAppointment
                          ? format(new Date(patient.lastAppointment), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "Sem registro"}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/5 text-orange-600 border-orange-500/20 font-bold"
                        >
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
