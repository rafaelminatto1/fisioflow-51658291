import { Users, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTeamPerformanceKPIs, type TherapistKPI } from "@/hooks/useTeamPerformanceKPIs";

const fmtBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmt = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function semaphoreOccupancy(v: number) {
  if (v >= 75) return "text-emerald-500";
  if (v >= 50) return "text-amber-500";
  return "text-red-500";
}

function semaphoreNoShow(v: number) {
  if (v <= 10) return "text-emerald-500";
  if (v <= 20) return "text-amber-500";
  return "text-red-500";
}

function TherapistRow({ t, rank }: { t: TherapistKPI; rank: number }) {
  const initials = t.therapist_name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="grid grid-cols-[auto_1fr_repeat(4,minmax(0,1fr))] items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card hover:bg-muted/20 transition-colors">
      <span className="text-lg font-black text-muted-foreground/40 w-5 text-center">{rank}</span>

      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold truncate">{t.therapist_name}</span>
      </div>

      <div className="text-center">
        <p className="text-sm font-black">{t.completed}</p>
        <p className="text-[10px] text-muted-foreground">sessões</p>
      </div>

      <div className="text-center">
        <p className={cn("text-sm font-black", semaphoreOccupancy(t.occupancy_rate))}>
          {fmt(t.occupancy_rate, 1)}%
        </p>
        <p className="text-[10px] text-muted-foreground">ocupação</p>
      </div>

      <div className="text-center">
        <p className={cn("text-sm font-black", semaphoreNoShow(t.no_show_rate))}>
          {fmt(t.no_show_rate, 1)}%
        </p>
        <p className="text-[10px] text-muted-foreground">no-show</p>
      </div>

      <div className="text-center">
        <p className="text-sm font-black text-primary">{fmtBRL(t.revenue)}</p>
        <p className="text-[10px] text-muted-foreground">faturamento</p>
      </div>
    </div>
  );
}

export function TeamPerformanceKPIs() {
  const { data, isLoading } = useTeamPerformanceKPIs();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm bg-card/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.therapists || data.therapists.length === 0) return null;

  const { therapists } = data;

  return (
    <Card className="border border-border/50 shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Performance da Equipe
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 text-primary"
            onClick={() => navigate("/performance-equipe")}
          >
            Ver detalhes <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {new Date(data.period.start + "T12:00:00").toLocaleString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_repeat(4,minmax(0,1fr))] items-center gap-3 px-4 pb-1">
          <span className="w-5" />
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Profissional
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
            Sessões
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
            Ocupação
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
            No-show
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">
            Faturamento
          </span>
        </div>

        {therapists.map((t, i) => (
          <TherapistRow key={t.therapist_id} t={t} rank={i + 1} />
        ))}
      </CardContent>
    </Card>
  );
}
