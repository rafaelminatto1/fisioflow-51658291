import { useEventosStats } from "@/hooks/useEventosStats";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Target, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EventosStatsWidget() {
  const { data: stats, isLoading } = useEventosStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Eventos",
      value: stats?.totalEventos || 0,
      subtitle: `${stats?.eventosAtivos || 0} ativos agora`,
      icon: Calendar,
      color: "primary",
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
    },
    {
      title: "Taxa de Conclusão",
      value: `${stats?.taxaConclusao || 0}%`,
      subtitle: `${stats?.eventosConcluidos || 0} finalizados`,
      icon: Target,
      color: "emerald",
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Receita Total",
      value: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(stats?.receitaTotal || 0),
      subtitle: `Margem média: ${stats?.margemMedia || 0}%`,
      icon: DollarSign,
      color: "blue",
      gradient: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Participantes",
      value: stats?.totalParticipantes || 0,
      subtitle: `Média: ${stats?.mediaParticipantesPorEvento || 0}/evento`,
      icon: Users,
      color: "violet",
      gradient: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, idx) => (
        <Card
          key={idx}
          className="group overflow-hidden border-border/40 hover:border-primary/20 hover:shadow-premium-sm transition-all duration-300"
        >
          <CardContent className="p-0">
            <div className={cn("p-6 bg-gradient-to-br", stat.gradient)}>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "p-2.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm group-hover:scale-110 transition-transform duration-300",
                    stat.iconColor,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {stat.title}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tighter">{stat.value}</h3>
                <p className="text-[11px] font-bold text-muted-foreground/80 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {stat.subtitle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
