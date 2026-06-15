/**
 * System Health Dashboard — métricas reais via /api/admin/slo-metrics
 * (Analytics Engine SQL). Atualiza a cada 30s.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  Database,
  Brain,
  Mic,
  Play,
  Trash2,
} from "lucide-react";
import { request } from "@/api/v2/base";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SLOWindow = "1h" | "24h" | "7d";

interface SLOResponse {
  data: {
    window: SLOWindow;
    summary: {
      requests: number;
      uptimePct: number;
      errorRatePct: number;
      errors5xx: number;
      errors4xx: number;
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
    };
    byRoute: Array<{
      route: string;
      requests: number;
      p95_ms: number;
      errors_5xx: number;
    }>;
    errorBreakdown: Array<{
      route: string;
      status: number;
      occurrences: number;
    }>;
  };
}

interface CloudflareControlResponse {
  data: {
    aiSearch: {
      configured: boolean;
      stats: null | Record<string, unknown>;
      errorItems: { items: Array<{ id: string; filename?: string; status?: string }> };
    };
    workflows: {
      wikiSync: boolean;
      knowledgeSync: boolean;
    };
    agentMemory: {
      configured: boolean;
      bindingPresent: boolean;
    };
    transcriptionBudget: {
      budgets: Array<{
        professional_user_id: string | null;
        monthly_limit_minutes: number;
        warn_at_percent: number;
        hard_stop: boolean;
      }>;
      usage: Array<{
        therapist_id: string | null;
        used_minutes: number;
        captured_seconds: number;
      }>;
      currentUserCheck: {
        allowed: boolean;
        organization: {
          limitMinutes: number;
          usedMinutes: number;
          remainingMinutes: number;
          warning: boolean;
        };
      };
    };
  };
}

const WINDOWS: { label: string; value: SLOWindow }[] = [
  { label: "Última hora", value: "1h" },
  { label: "Últimas 24h", value: "24h" },
  { label: "Últimos 7 dias", value: "7d" },
];

export default function SystemHealthPage() {
  const [window, setWindow] = useState<SLOWindow>("24h");
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery<SLOResponse>({
    queryKey: ["slo-metrics", window],
    queryFn: () => request<SLOResponse>(`/api/admin/slo-metrics?window=${window}`),
    refetchInterval: 30_000,
    retry: 1,
  });
  const control = useQuery<CloudflareControlResponse>({
    queryKey: ["cloudflare-control-status"],
    queryFn: () => request<CloudflareControlResponse>("/api/admin/cloudflare-control/status"),
    refetchInterval: 30_000,
    retry: 1,
  });

  const s = data?.data?.summary;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Métricas SLO em tempo real (Cloudflare Analytics Engine)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {WINDOWS.map((w) => (
              <Button
                key={w.value}
                size="sm"
                variant={window === w.value ? "default" : "ghost"}
                onClick={() => setWindow(w.value)}
              >
                {w.label}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6 text-sm text-red-700 dark:text-red-300">
            Erro ao carregar métricas: {String((error as Error).message)}
            {String((error as Error).message).includes("CF_API_TOKEN") && (
              <p className="mt-2 text-xs">
                Configure: <code>wrangler secret put CF_API_TOKEN --env production</code> (escopo
                Account Analytics:Read).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando métricas…</p>}

      <CloudflareOpsPanel
        data={control.data}
        isLoading={control.isLoading}
        error={control.error as Error | null}
        onRefresh={() => {
          control.refetch();
          queryClient.invalidateQueries({ queryKey: ["cloudflare-control-status"] });
        }}
      />

      {s && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Uptime"
              icon={<CheckCircle className="h-4 w-4 text-green-600" />}
              value={`${s.uptimePct.toFixed(3)}%`}
              hint={`${s.requests.toLocaleString()} requisições`}
              progress={s.uptimePct}
              healthy={s.uptimePct >= 99.9}
            />
            <MetricCard
              title="Error Rate (5xx)"
              icon={
                <AlertCircle
                  className={`h-4 w-4 ${s.errorRatePct < 1 ? "text-green-600" : "text-red-600"}`}
                />
              }
              value={`${s.errorRatePct.toFixed(3)}%`}
              hint={`${s.errors5xx} erros 5xx · ${s.errors4xx} erros 4xx`}
              healthy={s.errorRatePct < 1}
              badge
            />
            <MetricCard
              title="P95 latência"
              icon={<Clock className="h-4 w-4 text-blue-600" />}
              value={`${s.p95_ms}ms`}
              hint={`P50 ${s.p50_ms}ms · P99 ${s.p99_ms}ms`}
              healthy={s.p95_ms < 1000}
              badge
            />
            <MetricCard
              title="Volume"
              icon={<Zap className="h-4 w-4 text-yellow-600" />}
              value={s.requests.toLocaleString()}
              hint={`Janela: ${window}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 20 rotas</CardTitle>
                <CardDescription>
                  Por volume de requisições · P95 latência · erros 5xx
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b">
                    <tr>
                      <th className="text-left py-2">Rota</th>
                      <th className="text-right py-2">Reqs</th>
                      <th className="text-right py-2">P95</th>
                      <th className="text-right py-2">5xx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.data.byRoute.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 font-mono text-xs truncate max-w-[200px]">{r.route}</td>
                        <td className="text-right tabular-nums">
                          {Number(r.requests).toLocaleString()}
                        </td>
                        <td className="text-right tabular-nums">
                          {Math.round(Number(r.p95_ms))}ms
                        </td>
                        <td
                          className={`text-right tabular-nums ${
                            Number(r.errors_5xx) > 0 ? "text-red-600 font-bold" : "text-slate-400"
                          }`}
                        >
                          {Number(r.errors_5xx)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Erros recentes (4xx + 5xx)</CardTitle>
                <CardDescription>Top 10 por ocorrência</CardDescription>
              </CardHeader>
              <CardContent>
                {data!.data.errorBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem erros na janela.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b">
                      <tr>
                        <th className="text-left py-2">Rota</th>
                        <th className="text-right py-2">Status</th>
                        <th className="text-right py-2">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.data.errorBreakdown.map((e, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 font-mono text-xs truncate max-w-[200px]">
                            {e.route}
                          </td>
                          <td className="text-right">
                            <Badge variant={Number(e.status) >= 500 ? "destructive" : "outline"}>
                              {Number(e.status)}
                            </Badge>
                          </td>
                          <td className="text-right tabular-nums font-bold">
                            {Number(e.occurrences)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function CloudflareOpsPanel({
  data,
  isLoading,
  error,
  onRefresh,
}: {
  data?: CloudflareControlResponse;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const [monthlyLimit, setMonthlyLimit] = useState(1200);
  const [warnAt, setWarnAt] = useState(80);
  const [hardStop, setHardStop] = useState(true);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cloudflare-control-status"] });

  const triggerWorkflow = useMutation({
    mutationFn: (name: "wiki-sync" | "knowledge-sync") =>
      request(`/api/admin/cloudflare-control/workflows/${name}/trigger`, {
        method: "POST",
        body: JSON.stringify(name === "knowledge-sync" ? { syncTarget: "all" } : {}),
      }),
    onSuccess: invalidate,
  });

  const cleanupErrors = useMutation({
    mutationFn: (dryRun: boolean) =>
      request("/api/admin/cloudflare-control/ai-search/cleanup-errors", {
        method: "POST",
        body: JSON.stringify({ dryRun, limit: 500 }),
      }),
    onSuccess: invalidate,
  });

  const reindex = useMutation({
    mutationFn: () =>
      request("/api/admin/cloudflare-control/ai-search/reindex", {
        method: "POST",
        body: JSON.stringify({ cleanupErrors: true }),
      }),
    onSuccess: invalidate,
  });

  const saveBudget = useMutation({
    mutationFn: () =>
      request("/api/admin/cloudflare-control/transcription-budget", {
        method: "PUT",
        body: JSON.stringify({
          monthlyLimitMinutes: monthlyLimit,
          warnAtPercent: warnAt,
          hardStop,
        }),
      }),
    onSuccess: invalidate,
  });

  const status = data?.data;
  const budget = status?.transcriptionBudget.currentUserCheck.organization;
  const configuredBudget = status?.transcriptionBudget.budgets.find(
    (row) => row.professional_user_id == null,
  );

  useEffect(() => {
    if (!configuredBudget) return;
    setMonthlyLimit(Number(configuredBudget.monthly_limit_minutes));
    setWarnAt(Number(configuredBudget.warn_at_percent));
    setHardStop(Boolean(configuredBudget.hard_stop));
  }, [configuredBudget]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            AI Search
          </CardTitle>
          <CardDescription>RAG, wiki, protocolos e exercícios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando Cloudflare…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={status?.aiSearch.configured ? "default" : "destructive"}>
                  {status?.aiSearch.configured ? "AI_SEARCH ativo" : "AI_SEARCH ausente"}
                </Badge>
                <Badge variant="outline">
                  {status?.aiSearch.errorItems.items.length ?? 0} itens com erro listáveis
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerWorkflow.mutate("wiki-sync")}
                  disabled={triggerWorkflow.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Wiki
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerWorkflow.mutate("knowledge-sync")}
                  disabled={triggerWorkflow.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Knowledge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cleanupErrors.mutate(false)}
                  disabled={cleanupErrors.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar erros
                </Button>
                <Button size="sm" onClick={() => reindex.mutate()} disabled={reindex.isPending}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reindexar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            Agent Memory
          </CardTitle>
          <CardDescription>Memória por organização, paciente e profissional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={status?.agentMemory.configured ? "default" : "secondary"}>
              {status?.agentMemory.configured ? "Configurado" : "Aguardando beta"}
            </Badge>
            <Badge variant={status?.agentMemory.bindingPresent ? "default" : "outline"}>
              Binding {status?.agentMemory.bindingPresent ? "presente" : "ausente"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            O código já grava e consulta perfis separados para org, paciente e profissional. O
            binding será ativado assim que a conta aceitar o namespace.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" />
            Orçamento de transcrição
          </CardTitle>
          <CardDescription>Minutos mensais por clínica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budget && (
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>{budget.usedMinutes} min usados</span>
                <span>{budget.limitMinutes} min/mês</span>
              </div>
              <Progress
                value={
                  budget.limitMinutes > 0
                    ? Math.min(100, (budget.usedMinutes / budget.limitMinutes) * 100)
                    : 0
                }
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {budget.remainingMinutes} min restantes
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="monthlyLimit">Limite mensal</Label>
              <Input
                id="monthlyLimit"
                type="number"
                min={0}
                value={monthlyLimit}
                onChange={(event) => setMonthlyLimit(Number(event.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="warnAt">Aviso em %</Label>
              <Input
                id="warnAt"
                type="number"
                min={1}
                max={100}
                value={warnAt}
                onChange={(event) => setWarnAt(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hardStop">Bloqueio automático</Label>
            <Switch id="hardStop" checked={hardStop} onCheckedChange={setHardStop} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveBudget.mutate()} disabled={saveBudget.isPending}>
              Salvar orçamento
            </Button>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  icon,
  value,
  hint,
  progress,
  healthy,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  hint: string;
  progress?: number;
  healthy?: boolean;
  badge?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        {progress != null && <Progress value={progress} className="mt-2" />}
        {badge && (
          <Badge variant={healthy ? "default" : "destructive"} className="mt-2">
            {healthy ? (
              <>
                <Activity className="w-3 h-3 mr-1" /> Healthy
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" /> Warning
              </>
            )}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
