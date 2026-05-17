/**
 * RoiBySourceCard — receita gerada por origem de captação.
 * Lê /api/contacts/roi-by-source e mostra ranking com receita, conversão e
 * ticket médio.
 */
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";
import { contactsApi } from "@/api/v2/contacts";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RoiBySourceCard({ days = 90 }: { days?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", "roi-by-source", days],
    queryFn: () => contactsApi.roiBySource(days),
  });

  const rows = data?.data ?? [];
  const maxReceita = Math.max(1, ...rows.map((r) => Number(r.receita)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              ROI por origem
            </CardTitle>
            <CardDescription>Últimos {days} dias</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem dados de captação no período.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const receita = Number(r.receita);
              const pct = (receita / maxReceita) * 100;
              return (
                <div key={r.origem} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize">{r.origem}</span>
                    <span className="font-semibold tabular-nums">{BRL.format(receita)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {r.total_convertidos}/{r.total_contatos} convertidos
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {Number(r.taxa_conversao).toFixed(1)}% • Ticket {BRL.format(Number(r.ticket_medio))}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
