import React, { memo } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicHealthKPIs } from "@/hooks/useClinicHealthKPIs";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: "primary" | "emerald" | "amber" | "sky";
}

const MetricCard = memo(({ title, value, subtitle, icon: Icon, trend, color = "primary" }: MetricCardProps) => {
  const colorStyles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    sky: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  };

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-2xl border", colorStyles[color])}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              trend.isPositive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}>
              {trend.value}
            </Badge>
          )}
        </div>
        
        <div className="mt-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = "MetricCard";

export const ClinicHealthKPIs: React.FC = () => {
  const { data: kpis, isLoading } = useClinicHealthKPIs();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-44 rounded-[2rem]" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Saúde do Negócio (BI)
          </h2>
          <p className="text-xs text-muted-foreground">
            Indicadores de crescimento e eficiência de aquisição.
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
          Atualizado em tempo real
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="CAC"
          value={formatCurrency(kpis?.cac || 0)}
          subtitle={`${kpis?.new_patients || 0} novos pacientes com R$ ${kpis?.marketing_spend?.toLocaleString("pt-BR") || 0} em ads.`}
          icon={Target}
          color="amber"
          trend={{ value: "Benchmark: < R$ 150", isPositive: (kpis?.cac || 0) < 150 }}
        />

        <MetricCard
          title="LTV Estimado"
          value={formatCurrency(kpis?.ltv_estimate || 0)}
          subtitle="Valor bruto projetado por paciente em 12 meses."
          icon={TrendingUp}
          color="emerald"
          trend={{ value: `ROI: ${kpis?.ltv_cac_ratio || 0}x`, isPositive: (kpis?.ltv_cac_ratio || 0) > 3 }}
        />

        <MetricCard
          title="Payback"
          value={`${kpis?.payback || 0} meses`}
          subtitle="Tempo médio para recuperar o custo de aquisição."
          icon={Clock}
          color="primary"
          trend={{ value: "Ideal: < 3 meses", isPositive: (kpis?.payback || 0) <= 3 }}
        />

        <MetricCard
          title="Eficiência (LTV/CAC)"
          value={`${kpis?.ltv_cac_ratio || 0}x`}
          subtitle="Sustentabilidade: Cada R$ 1 investido retorna este valor."
          icon={Zap}
          color="sky"
          trend={{ value: "Escalável", isPositive: (kpis?.ltv_cac_ratio || 0) > 3 }}
        />
      </div>
    </div>
  );
};
