import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  Target,
  Activity,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useClinicHealthKPIs } from "@/hooks/useClinicHealthKPIs";

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type TrafficLight = "green" | "yellow" | "red";

function semaphore(value: number, good: number, warn: number, inverted = false): TrafficLight {
  if (!inverted) {
    if (value >= good) return "green";
    if (value >= warn) return "yellow";
    return "red";
  }
  if (value <= good) return "green";
  if (value <= warn) return "yellow";
  return "red";
}

const lightClass: Record<TrafficLight, string> = {
  green: "text-emerald-500",
  yellow: "text-amber-500",
  red: "text-red-500",
};

const lightBg: Record<TrafficLight, string> = {
  green: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  yellow: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};

interface KPICardProps {
  label: string;
  value: string;
  light?: TrafficLight;
  icon: React.ReactNode;
  hint?: string;
  sub?: string;
}

function KPICard({ label, value, light = "green", icon, hint, sub }: KPICardProps) {
  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-2 transition-all", lightBg[light])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {hint && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {hint}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center", lightClass[light])}>
            {icon}
          </div>
        </div>
      </div>
      <p className={cn("text-2xl font-black tracking-tight font-display", lightClass[light])}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground font-medium">{sub}</p>}
    </div>
  );
}

const CAC_STORAGE_KEY = "fisioflow_cac_manual";

export function ClinicHealthKPIs() {
  const { data: kpis, isLoading } = useClinicHealthKPIs();
  const [cacInput, setCacInput] = useState<string>(() => {
    return localStorage.getItem(CAC_STORAGE_KEY) ?? "";
  });

  const cac = parseFloat(cacInput.replace(",", ".")) || 0;

  const handleCacChange = (val: string) => {
    setCacInput(val);
    if (val) localStorage.setItem(CAC_STORAGE_KEY, val);
    else localStorage.removeItem(CAC_STORAGE_KEY);
  };

  const ltv = kpis?.ltv_estimate ?? 0;
  const ltvcac = cac > 0 && ltv > 0 ? Math.round((ltv / cac) * 10) / 10 : null;
  const payback = cac > 0 && (kpis?.avg_ticket ?? 0) > 0
    ? Math.round((cac / (kpis!.avg_ticket * (kpis!.avg_sessions_per_patient_6m / 6))) * 10) / 10
    : null;

  const ltvcacLight: TrafficLight = ltvcac === null ? "yellow"
    : ltvcac >= 3 ? "green"
    : ltvcac >= 1 ? "yellow"
    : "red";

  if (isLoading) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3 px-0">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  const occupancyLight = semaphore(kpis.occupancy_rate, 75, 50);
  const noShowLight = semaphore(kpis.no_show_rate, 10, 20, true);
  const ticketLight = semaphore(kpis.avg_ticket, 150, 80);

  return (
    <Card className="border border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Saúde do Negócio
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-medium">
            {new Date(kpis.period.start + "T12:00:00").toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <KPICard
            label="Ocupação"
            value={`${fmt(kpis.occupancy_rate, 1)}%`}
            light={occupancyLight}
            icon={<Calendar className="h-4 w-4" />}
            hint="Agendamentos realizados ÷ (realizados + faltas + cancelados). Meta: ≥75%"
            sub={`${kpis.appointments.completed} de ${kpis.appointments.completed + kpis.appointments.no_show + kpis.appointments.cancelled} slots`}
          />
          <KPICard
            label="No-show"
            value={`${fmt(kpis.no_show_rate, 1)}%`}
            light={noShowLight}
            icon={<AlertTriangle className="h-4 w-4" />}
            hint="Taxa de faltas sobre agendamentos concluídos. Meta: <15%"
            sub={`${kpis.appointments.no_show} faltas no mês`}
          />
          <KPICard
            label="Ticket Médio"
            value={fmtBRL(kpis.avg_ticket)}
            light={ticketLight}
            icon={<DollarSign className="h-4 w-4" />}
            hint="Valor médio pago por sessão realizada no período"
            sub={`${kpis.appointments.completed} sessões pagas`}
          />
          <KPICard
            label="LTV Estimado"
            value={ltv > 0 ? fmtBRL(ltv) : "—"}
            light={ltv > 0 ? "green" : "yellow"}
            icon={<TrendingUp className="h-4 w-4" />}
            hint="Valor estimado por paciente: média de sessões em 6 meses × 2 ciclos anuais × ticket médio"
            sub={`~${fmt(kpis.avg_sessions_per_patient_6m, 1)} sessões/paciente em 6m`}
          />
          <KPICard
            label="Pacientes Ativos"
            value={fmt(kpis.active_patients)}
            light={kpis.active_patients > 0 ? "green" : "yellow"}
            icon={<Users className="h-4 w-4" />}
            hint="Pacientes com ao menos 1 sessão nos últimos 60 dias"
            sub={kpis.at_risk_patients > 0 ? `${kpis.at_risk_patients} em risco` : undefined}
          />
          <KPICard
            label="LTV:CAC"
            value={ltvcac !== null ? `${ltvcac}:1` : "—"}
            light={ltvcacLight}
            icon={ltvcacLight === "green" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            hint="Razão entre LTV estimado e CAC mensal. Meta: ≥3:1 (verde), 1-3:1 (amarelo), <1:1 (vermelho)"
            sub={cac > 0 ? `CAC: ${fmtBRL(cac)}` : "Informe o CAC abaixo"}
          />
          <KPICard
            label="Payback"
            value={payback !== null ? `${fmt(payback, 1)} meses` : "—"}
            light={payback === null ? "yellow" : payback <= 6 ? "green" : payback <= 12 ? "yellow" : "red"}
            icon={<Target className="h-4 w-4" />}
            hint="Meses para recuperar o CAC com a receita mensal média por paciente. Meta: ≤6 meses"
            sub={cac > 0 ? undefined : "Informe o CAC abaixo"}
          />
        </div>

        {/* CAC input */}
        <div className="flex items-end gap-3 pt-1 border-t border-border/40">
          <div className="flex-1 max-w-[200px]">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
              CAC Mensal (R$)
            </Label>
            <Input
              type="number"
              min="0"
              step="10"
              placeholder="Ex: 500"
              value={cacInput}
              onChange={(e) => handleCacChange(e.target.value)}
              className="h-8 text-sm font-semibold"
            />
          </div>
          <p className="text-[11px] text-muted-foreground pb-1.5 leading-snug max-w-[300px]">
            Soma dos gastos com marketing e vendas no mês. Usado para calcular LTV:CAC e Payback.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
