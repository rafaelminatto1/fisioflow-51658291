import { useQuery } from "@tanstack/react-query";
import { HelpCircle, MessageSquareWarning } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/v2/client";

interface WikiGap {
  query: string;
  misses: number;
  last_seen: string;
}

const API_BASE =
  import.meta.env.VITE_WORKERS_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";

export function WikiGapsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "wiki-gaps"],
    queryFn: () =>
      apiClient.get<{ data: WikiGap[]; warning?: string }>(`${API_BASE}/api/analytics/wiki-gaps`),
    staleTime: 5 * 60 * 1000,
  });

  const gaps = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareWarning className="w-4 h-4 text-amber-600" />
          Perguntas sem resposta na wiki
        </CardTitle>
        <CardDescription>
          Buscas dos últimos 30 dias que a wiki não cobriu — pauta para novos artigos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && gaps.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <HelpCircle className="w-4 h-4" />
            Nenhuma lacuna registrada no período.
          </div>
        )}
        {!isLoading && gaps.length > 0 && (
          <ul className="space-y-2">
            {gaps.slice(0, 10).map((gap) => (
              <li
                key={gap.query}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <span className="text-sm text-foreground truncate">{gap.query}</span>
                <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5">
                  {gap.misses}x
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
