import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  TrendingUp,
  Users,
  Wallet,
  RefreshCcw,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { rpc } from "@/lib/api/rpc-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyStateEnhanced } from "@/components/ui/EmptyStateEnhanced";

// Gradientes Vibrantes
const COLORS = {
  primary: "hsl(var(--brand-blue) / 1)",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function FisioBrainAnalyticsDashboard() {
  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ["fisiobrain", "kpis"],
    queryFn: async () => {
      const res = await rpc.api["clinic-metrics"].kpis.$get();
      if (!res.ok) throw new Error("Falha ao buscar KPIs");
      return (await res.json()).data;
    },
    refetchInterval: 1000 * 60 * 5, // Atualiza a cada 5 minutos
  });

  const {
    data: teamPerformance,
    isLoading: teamLoading,
    isError: teamError,
    refetch: refetchTeam,
  } = useQuery({
    queryKey: ["fisiobrain", "team-performance"],
    queryFn: async () => {
      const res = await rpc.api["clinic-metrics"]["team-performance"].$get();
      if (!res.ok) throw new Error("Falha ao buscar performance do time");
      return (await res.json()).data;
    },
  });

  const {
    data: churnData,
    isLoading: churnLoading,
    isError: churnError,
    refetch: refetchChurn,
  } = useQuery({
    queryKey: ["fisiobrain", "churn"],
    queryFn: async () => {
      const res = await rpc.api["clinic-metrics"].churn.$get();
      if (!res.ok) throw new Error("Falha ao buscar churn");
      return (await res.json()).data;
    },
  });

  const loading = kpisLoading || teamLoading || churnLoading;
  const error = kpisError || teamError || churnError;

  const handleRetry = () => {
    refetchKpis();
    refetchTeam();
    refetchChurn();
  };

  const kpisData = kpis || {
    occupancy: { booked: 0, capacity: 1 },
    noShow: { count: 0, total: 1 },
    financial: { totalRevenue: 0, avgTicket: 0 },
    clinical: { avgSessions: 0 },
  };

  const occupancyRate =
    (kpisData.occupancy.booked / Math.max(1, kpisData.occupancy.capacity)) * 100;
  const noShowRate = (kpisData.noShow.count / Math.max(1, kpisData.noShow.total)) * 100;

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <BrainCircuit className="h-7 w-7 text-brand-blue drop-shadow-md" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-br from-brand-blue via-cyan-600 to-emerald-500 bg-clip-text text-transparent">
              FisioBrain Analytics
            </h2>
          </div>
          <p className="text-sm font-medium text-muted-foreground ml-9">
            Inteligência de dados em tempo real da sua clínica.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Badge
            variant="outline"
            className="border-brand-blue/30 bg-brand-blue/10 text-brand-blue px-3 py-1 font-semibold rounded-full shadow-sm backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 mr-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
            </span>
            Em Tempo Real
          </Badge>
        </motion.div>
      </div>

      {error && !loading ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center justify-center text-center space-y-3"
        >
          <AlertTriangle className="h-8 w-8 text-rose-500 mb-2" />
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
            Falha na Sincronização
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Não foi possível carregar os dados atualizados de inteligência. Verifique sua conexão
            com o servidor.
          </p>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="mt-4 gap-2 rounded-full border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </motion.div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-[2rem] w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={itemVariants}>
            <GlassStatCard
              title="Taxa de Ocupação"
              value={`${occupancyRate.toFixed(1)}%`}
              subtitle={`${kpisData.occupancy.booked} agendamentos no mês`}
              icon={CalendarDays}
              gradient="from-blue-500/20 to-cyan-500/5"
              iconColor="text-blue-500"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <GlassStatCard
              title="Receita (Mês Atual)"
              value={`R$ ${(kpisData.financial.totalRevenue || 0).toLocaleString("pt-BR")}`}
              subtitle={`Ticket Médio: R$ ${(kpisData.financial.avgTicket || 0).toLocaleString("pt-BR")}`}
              icon={Wallet}
              gradient="from-emerald-500/20 to-teal-500/5"
              iconColor="text-emerald-500"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <GlassStatCard
              title="Sessões por Paciente"
              value={kpisData.clinical.avgSessions.toFixed(1)}
              subtitle="LTV Médio (Histórico)"
              icon={Activity}
              gradient="from-purple-500/20 to-fuchsia-500/5"
              iconColor="text-purple-500"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <GlassStatCard
              title="Taxa de No-Show"
              value={`${noShowRate.toFixed(1)}%`}
              subtitle={`${kpisData.noShow.count} faltas recentes`}
              icon={AlertTriangle}
              gradient="from-rose-500/20 to-orange-500/5"
              iconColor="text-rose-500"
              alert={noShowRate > 15}
            />
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid gap-6 lg:grid-cols-[2fr_1fr]"
          >
            <Card className="rounded-[2rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 pointer-events-none" />
              <CardHeader className="border-b border-border/30 pb-4 bg-background/30 backdrop-blur-sm z-10 relative">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Desempenho da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 relative z-10">
                {!teamPerformance || teamPerformance.length === 0 ? (
                  <EmptyStateEnhanced
                    icon={Users}
                    title="Dados Insuficientes"
                    description="Sem histórico de atendimentos para gerar gráficos da equipe neste mês."
                    className="py-12"
                  />
                ) : (
                  <div className="h-[300px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={teamPerformance}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border)/0.5)"
                        />
                        <XAxis
                          dataKey="full_name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(val) =>
                            `R$ ${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val}`
                          }
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="bg-popover/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-xl"
                                >
                                  <p className="font-bold text-sm mb-2 text-foreground">{label}</p>
                                  <div className="space-y-1.5">
                                    <p className="text-emerald-500 font-bold flex items-center gap-2 text-sm">
                                      <Wallet className="h-3.5 w-3.5" />
                                      R$ {payload[0].value?.toLocaleString("pt-BR")}
                                    </p>
                                    <p className="text-muted-foreground font-medium flex items-center gap-2 text-xs">
                                      <Users className="h-3.5 w-3.5" />
                                      {payload[0].payload.completed_count} atendimentos
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="monthly_revenue"
                          radius={[8, 8, 0, 0]}
                          fill="url(#barGradient)"
                          barSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/40 bg-card/60 backdrop-blur-xl shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5 pointer-events-none" />
              <CardHeader className="border-b border-border/30 pb-4 bg-background/30 backdrop-blur-sm z-10 relative">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                  Radar de Churn (Inativos)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 relative z-10">
                {!churnData || churnData.length === 0 ? (
                  <EmptyStateEnhanced
                    icon={Users}
                    title="Sem Risco Imediato"
                    description="Não detectamos pacientes inativos ou em risco de churn."
                    className="py-12"
                  />
                ) : (
                  <div className="space-y-3">
                    {churnData.slice(0, 5).map((patient: any, idx: number) => (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        key={patient.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-background/60 border border-border/40 hover:border-rose-500/40 transition-all hover:bg-rose-500/5 hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-rose-500 transition-colors">
                            {patient.full_name}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">
                            Última sessão:{" "}
                            <span className="text-foreground/70">
                              {new Date(patient.last_session_date).toLocaleDateString("pt-BR")}
                            </span>
                          </p>
                        </div>
                        <Badge
                          variant="destructive"
                          className="px-2.5 py-1 text-[10px] font-bold shadow-sm bg-rose-500/90 hover:bg-rose-600"
                        >
                          {patient.days_inactive} dias sumido
                        </Badge>
                      </motion.div>
                    ))}
                    {churnData.length > 5 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-center pt-2"
                      >
                        <p className="text-xs text-muted-foreground font-semibold bg-muted/50 inline-block px-3 py-1 rounded-full">
                          + {churnData.length - 5} pacientes identificados
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlassStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconColor,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  alert?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-[2rem] border-border/40 bg-card/60 backdrop-blur-xl transition-all hover:shadow-xl group",
        alert
          ? "border-rose-500/30 ring-1 ring-rose-500/20 hover:border-rose-500/50 hover:shadow-rose-500/10"
          : "hover:border-border/60",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-[0.15] group-hover:opacity-30 transition-opacity duration-500",
          gradient,
        )}
      />
      <CardContent className="relative p-6 z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div
            className={cn(
              "p-3.5 rounded-2xl bg-background/90 shadow-sm backdrop-blur-md group-hover:scale-110 transition-transform duration-300",
              iconColor,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {alert && (
            <span className="flex h-3 w-3 relative mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            </span>
          )}
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 group-hover:text-foreground/90 transition-colors">
          {title}
        </h3>
        <p className="text-3xl font-black tracking-tighter text-foreground mb-1.5">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground/80 leading-tight">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
