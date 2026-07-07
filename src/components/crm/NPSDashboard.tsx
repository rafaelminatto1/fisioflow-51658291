/**
 * NPSDashboard — métricas e lista de respostas NPS.
 *
 * Lê /api/nps/stats e /api/nps. Cliente envia/agenda pesquisas via
 * automation rule "Alta — NPS em 7 dias" (template 0086).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Award, Smile, Meh, Frown, MessageCircle, TrendingUp } from "lucide-react";
import { npsApi } from "@/api/v2/nps";
import { TimeSeriesAreaChart, type TimeSeriesPoint } from "@/components/charts/TimeSeriesAreaChart";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** NPS por mês (promotores% − detratores%) a partir das respostas com data. */
function npsMonthlyTrend(
  surveys: Array<{ classification: string | null; responded_at?: string | null }>,
): TimeSeriesPoint[] {
  const buckets = new Map<string, { promoter: number; detractor: number; total: number }>();
  for (const s of surveys) {
    if (!s.responded_at || !s.classification) continue;
    const d = new Date(s.responded_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key) ?? { promoter: 0, detractor: 0, total: 0 };
    b.total += 1;
    if (s.classification === "promoter") b.promoter += 1;
    if (s.classification === "detractor") b.detractor += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, b]) => {
      const month = Number(key.split("-")[1]) - 1;
      const nps = b.total > 0 ? Math.round(((b.promoter - b.detractor) / b.total) * 100) : 0;
      return { label: MONTH_NAMES[month] ?? key, value: nps };
    });
}

const FILTER_LABEL: Record<string, string> = {
  all: "Todas",
  promoter: "Promotores",
  passive: "Neutros",
  detractor: "Detratores",
};

function classificationBadge(classification: string | null) {
  if (classification === "promoter") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
        <Smile className="h-3 w-3" /> Promotor
      </Badge>
    );
  }
  if (classification === "passive") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
        <Meh className="h-3 w-3" /> Neutro
      </Badge>
    );
  }
  if (classification === "detractor") {
    return (
      <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 gap-1">
        <Frown className="h-3 w-3" /> Detrator
      </Badge>
    );
  }
  return <Badge variant="outline">Pendente</Badge>;
}

export function NPSDashboard() {
  const [days, setDays] = useState(90);
  const [filter, setFilter] = useState<"all" | "promoter" | "passive" | "detractor">("all");

  const { data: statsRes, isLoading: loadingStats } = useQuery({
    queryKey: ["nps", "stats", days],
    queryFn: () => npsApi.stats(days),
  });

  const { data: listRes, isLoading: loadingList } = useQuery({
    queryKey: ["nps", "list", filter],
    queryFn: () =>
      npsApi.list({ classification: filter === "all" ? undefined : filter, limit: 200 }),
  });

  // Query dedicada (sem filtro) p/ a série temporal, para o seletor não distorcê-la
  const { data: trendRes } = useQuery({
    queryKey: ["nps", "trend"],
    queryFn: () => npsApi.list({ limit: 200 }),
  });

  const stats = statsRes?.data;
  const surveys = listRes?.data ?? [];
  const npsTrend = useMemo(() => npsMonthlyTrend(trendRes?.data ?? []), [trendRes]);

  const totalRespondedPct = useMemo(() => {
    if (!stats?.total_sent) return 0;
    return Math.round((stats.total_responded / stats.total_sent) * 100);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pesquisa NPS</h2>
          <p className="text-sm text-muted-foreground">
            Net Promoter Score nas últimas semanas — automação envia 7 dias após alta clínica.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NPS</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {loadingStats ? "—" : stats?.nps == null ? "—" : Number(stats.nps).toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Score médio: {stats?.score_medio == null ? "—" : Number(stats.score_medio).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Promotores</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-emerald-600">
              {stats?.promotores ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Smile className="h-4 w-4 text-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Neutros</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-600">
              {stats?.neutros ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Meh className="h-4 w-4 text-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Detratores</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-rose-600">
              {stats?.detratores ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Frown className="h-4 w-4 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      {npsTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Evolução do NPS por mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesAreaChart data={npsTrend} valueName="NPS" emptyMessage="Sem respostas ainda." />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Taxa de resposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{totalRespondedPct}%</span>
            <span className="text-sm text-muted-foreground">
              {stats?.total_responded ?? 0} de {stats?.total_sent ?? 0} pesquisas
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Respostas e comentários
            </CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FILTER_LABEL).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma resposta neste filtro.
            </p>
          ) : (
            surveys.map((s) => (
              <div key={s.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {classificationBadge(s.classification)}
                    {s.score != null && (
                      <span className="font-bold tabular-nums">{s.score}/10</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(s.responded_at ?? s.sent_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                {s.comentario && (
                  <p className="text-sm text-slate-600 italic">&ldquo;{s.comentario}&rdquo;</p>
                )}
                {!s.responded_at && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/nps/${s.token}`);
                    }}
                  >
                    Copiar link público
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
