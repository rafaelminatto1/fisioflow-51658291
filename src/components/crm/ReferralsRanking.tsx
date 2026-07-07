/**
 * ReferralsRanking — ranking de pacientes que mais indicaram + fisio_links
 * com cliques. Lê /api/referrals/ranking e /api/referrals/fisio-links.
 */
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Link as LinkIcon, Loader2, MousePointerClick, TrendingUp } from "lucide-react";
import { referralsApi } from "@/api/v2/referrals";
import { TimeSeriesAreaChart, type TimeSeriesPoint } from "@/components/charts/TimeSeriesAreaChart";

export function ReferralsRanking() {
  const { data: rankRes, isLoading: loadingRank } = useQuery({
    queryKey: ["referrals", "ranking", 180],
    queryFn: () => referralsApi.ranking(180, 20),
  });
  const { data: linksRes, isLoading: loadingLinks } = useQuery({
    queryKey: ["referrals", "fisio-links"],
    queryFn: () => referralsApi.fisioLinks(),
  });
  const { data: clicksRes } = useQuery({
    queryKey: ["referrals", "clicks-daily", 30],
    queryFn: () => referralsApi.clicksDaily(30),
  });

  const rank = rankRes?.data ?? [];
  const links = linksRes?.data ?? [];

  const clicksSeries: TimeSeriesPoint[] = (clicksRes?.data ?? []).map((d) => {
    const [, mm, dd] = d.day.split("-");
    return { label: `${dd}/${mm}`, value: d.clicks };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Indicações</h2>
        <p className="text-sm text-muted-foreground">
          Ranking dos pacientes que mais trazem novos contatos + performance dos seus links públicos
          (fisio_links).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> Top indicadores
          </CardTitle>
          <CardDescription>Últimos 180 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRank ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : rank.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum código de indicação cadastrado ou nenhum resgate ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Resgates (180d)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Último</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rank.map((r, i) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>{r.patient_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {r.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.recent_redemptions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.total_redemptions}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.last_redemption_at
                        ? format(new Date(r.last_redemption_at), "dd MMM yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {clicksSeries.some((p) => p.value > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-500" /> Cliques por dia (últimos 30 dias)
            </CardTitle>
            <CardDescription>Soma dos cliques em todos os fisio_links da clínica.</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSeriesAreaChart data={clicksSeries} valueName="cliques" emptyMessage="Sem cliques no período." />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-sky-500" /> Fisio Links públicos
          </CardTitle>
          <CardDescription>Cliques nos últimos 30 dias por link da clínica.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLinks ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum fisio_link configurado.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {links.map((link) => (
                <div key={link.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">/{link.slug}</span>
                    <Badge variant="outline" className="gap-1">
                      <MousePointerClick className="h-3 w-3" /> {link.clicks_30d}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total histórico: {link.total_clicks} cliques
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
