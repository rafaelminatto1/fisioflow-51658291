import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Target,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { useEvolutionDashboardData } from "@/hooks/evolution/useEvolutionDashboardData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EvolutionDashboardProps {
  patientId: string;
  useMocks?: boolean;
}

export const EvolutionDashboard: React.FC<EvolutionDashboardProps> = ({
  patientId,
  useMocks = false,
}) => {
  const { data, isLoading } = useEvolutionDashboardData(patientId, useMocks);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Analisando dados de evolução...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-3xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Sem dados de evolução</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Inicie as sessões de reabilitação e registre medições clínicas para gerar insights de
          progresso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Adesão ao Plano"
          value={`${data.adherence.rate}%`}
          subtext={`${data.adherence.completedSessions} de ${data.adherence.totalSessions} sessões`}
          icon={Calendar}
          trend={data.adherence.trend}
          color="blue"
        />
        <MetricCard
          title="Intensidade Média"
          value={data.intensity.avgRpe.toString()}
          subtext="Escala de Borg (0-10)"
          icon={Activity}
          trend="stable"
          color="orange"
        />
        <MetricCard
          title="Progresso Clínico"
          value={`${data.clinical.overallProgress}%`}
          subtext="Baseado em metas e testes"
          icon={Target}
          trend="up"
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intensity & Pain Chart */}
        <DashboardCard title="Tendência de Intensidade e Dor">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.intensity.history}>
                <defs>
                  <linearGradient id="colorRpe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "dd/MM", { locale: ptBR })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  labelFormatter={(date) =>
                    format(new Date(date), "dd 'de' MMMM", { locale: ptBR })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="rpe"
                  name="Intensidade (RPE)"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRpe)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="pain"
                  name="Nível de Dor"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorPain)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Clinical Performance */}
        <DashboardCard title="Progresso em Testes Clínicos">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.clinical.metricsHistory.slice(-8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), "dd/MM", { locale: ptBR })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelFormatter={(date) => format(new Date(date), "dd/MM", { locale: ptBR })}
                />
                <Bar
                  dataKey="value"
                  name="Valor"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(new Set(data.clinical.metricsHistory.map((m) => m.name))).map((name) => (
              <span
                key={name}
                className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider"
              >
                {name}
              </span>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

// --- Subcomponentes ---

interface MetricCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  trend: "up" | "down" | "stable";
  color: "blue" | "orange" | "emerald";
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  color,
}) => {
  const colors = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/20",
    orange: "from-orange-500/10 to-orange-500/5 text-orange-600 border-orange-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-card/40 backdrop-blur-md p-6 transition-all hover:shadow-xl hover:bg-card/60 group ${colors[color]}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold opacity-70 uppercase tracking-widest">{title}</p>
          <h3 className="text-4xl font-black mt-1 tracking-tighter">{value}</h3>
          <p className="text-xs text-muted-foreground mt-2 font-medium">{subtext}</p>
        </div>
        <div
          className={`p-3 rounded-2xl bg-white/20 shadow-inner group-hover:scale-110 transition-transform`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1">
        {trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
        {trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-500" />}
        {trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
        <span className="text-[10px] font-bold uppercase opacity-60">
          Tendência {trend === "up" ? "Positiva" : trend === "down" ? "Negativa" : "Estável"}
        </span>
      </div>
    </div>
  );
};

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children }) => (
  <div className="rounded-3xl border bg-card/40 backdrop-blur-md p-6 shadow-sm border-border/50">
    <div className="flex items-center gap-2 mb-2">
      <TrendingUp className="w-4 h-4 text-primary" />
      <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{title}</h4>
    </div>
    {children}
  </div>
);
