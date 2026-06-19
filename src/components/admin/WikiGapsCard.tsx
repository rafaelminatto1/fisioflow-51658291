import { useQuery } from "@tanstack/react-query";
import { getWorkersApiUrl } from "@/lib/api/config";
import { HelpCircle, MessageSquareWarning } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/v2/client";

interface WikiGap {
  query: string;
  misses: number;
  last_seen: string;
}

const API_BASE = getWorkersApiUrl();

export function WikiGapsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "wiki-gaps"],
    queryFn: () =>
      apiClient.get<{ data: WikiGap[]; warning?: string }>(`${API_BASE}/api/analytics/wiki-gaps`),
    staleTime: 5 * 60 * 1000,
  });

  const gaps = data?.data ?? [];

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-3 bg-orange-50/50 border-b border-orange-100">
        <CardTitle className="flex items-center gap-2 text-base font-bold font-display text-orange-900">
          <MessageSquareWarning className="w-5 h-5 text-orange-600" />
          Lacunas de Conhecimento
        </CardTitle>
        <CardDescription className="font-medium text-orange-700/70">
          Buscas que não retornaram resultados — prioridade para curadoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {isLoading && <p className="text-sm text-slate-400 font-medium animate-pulse">Analizando logs...</p>}
        {!isLoading && gaps.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4 font-medium">
            <HelpCircle className="w-4 h-4 opacity-50" />
            Toda a demanda de busca foi atendida.
          </div>
        )}
        {!isLoading && gaps.length > 0 && (
          <ul className="space-y-2">
            {gaps.slice(0, 10).map((gap) => (
              <li
                key={gap.query}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 transition-colors hover:border-orange-200"
              >
                <span className="text-sm text-slate-700 font-bold truncate">{gap.query}</span>
                <span className="shrink-0 rounded-lg bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 shadow-sm">
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
