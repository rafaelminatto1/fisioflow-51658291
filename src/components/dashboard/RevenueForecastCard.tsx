import { TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRevenueForecast } from "@/hooks/useRevenueForecast";

const fmtBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RevenueForecastCard() {
  const { data, isLoading } = useRevenueForecast();

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm bg-card/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const realizationPct =
    data.total_month_estimate > 0
      ? Math.round((data.realized_revenue_mtd / data.total_month_estimate) * 100)
      : 0;

  return (
    <Card className="border border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Previsão de Receita — Mês Atual
          </CardTitle>
          <span className="text-[11px] text-muted-foreground font-medium">
            {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Realizado MTD
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              {fmtBRL(data.realized_revenue_mtd)}
            </p>
            <p className="text-[11px] text-muted-foreground">{realizationPct}% da meta do mês</p>
          </div>

          <div className="rounded-2xl border bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 p-4 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Previsão Restante
            </span>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-display">
              {fmtBRL(data.forecast_remaining)}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {data.upcoming_appointments} sessões agendadas
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border p-4 flex flex-col gap-1",
              data.total_month_estimate > 0
                ? "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800"
                : "bg-muted/30 border-border/50",
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Estimativa Total
            </span>
            <p
              className={cn(
                "text-xl font-black font-display",
                data.total_month_estimate > 0
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-muted-foreground",
              )}
            >
              {fmtBRL(data.total_month_estimate)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Ticket médio: {fmtBRL(data.avg_ticket)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {data.total_month_estimate > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(realizationPct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {realizationPct}% realizado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
