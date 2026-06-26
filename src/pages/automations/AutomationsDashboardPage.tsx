import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Workflow,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { AutomationRecord } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAutomations,
  useAutomationStats,
  useUpdateAutomation,
  emptyDefinition,
} from "@/hooks/useAutomations";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { triggerLabel } from "@/components/automation/triggerEvents";
import { AutomationCreateEditDialog } from "@/components/automation/AutomationCreateEditDialog";
import { AutomationDeleteDialog } from "@/components/automation/AutomationDeleteDialog";

type StatMap = Record<string, { runsThisMonth: number; failures: number; lastRunAt: string | null }>;

function fromNow(value: string | null | undefined): string {
  if (!value) return "Nunca";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Nunca";
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

function AutomationsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {["a", "b", "c", "d"].map((k) => (
        <Card key={k}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Workflow className="h-7 w-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold">Nenhuma automação ainda</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Crie sua primeira automação para automatizar lembretes, onboarding e follow-ups. Economize
          tempo da sua equipe.
        </p>
        <Button className="mt-5" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Criar automação
        </Button>
      </CardContent>
    </Card>
  );
}

export function AutomationsDashboardPage() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();

  const { data: automations, isLoading } = useAutomations();
  const { data: stats } = useAutomationStats();
  const { data: logs = [] } = useAutomationLogs(organizationId, { limitCount: 50 });
  const updateMut = useUpdateAutomation();

  const [activeTab, setActiveTab] = useState("ativas");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRecord | null>(null);
  const [deleting, setDeleting] = useState<AutomationRecord | null>(null);

  const statMap = useMemo<StatMap>(() => {
    const map: StatMap = {};
    for (const p of stats?.perAutomation ?? []) {
      map[p.id] = {
        runsThisMonth: p.runsThisMonth,
        failures: p.failures,
        lastRunAt: p.lastRunAt,
      };
    }
    return map;
  }, [stats]);

  const openCreate = () => {
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (a: AutomationRecord) => {
    setEditing(a);
    setCreateOpen(true);
  };

  const handleToggle = async (a: AutomationRecord, next: boolean) => {
    try {
      await updateMut.mutateAsync({
        id: a.id,
        name: a.name,
        description: a.description ?? undefined,
        triggerEvent: a.trigger_event ?? undefined,
        enabled: next,
        definition: a.definition ?? emptyDefinition(a.trigger_event ?? undefined),
      });
      toast.success(next ? "Automação ativada." : "Automação desativada.");
    } catch {
      toast.error("Erro ao alterar status.");
    }
  };

  return (
    <PageLayout
      title="Automações"
      subtitle="Gerencie seus fluxos automáticos e poupe tempo da sua equipe."
      actions={
        <Button onClick={openCreate} disabled={automations?.length === 0 && isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Automação
        </Button>
      }
    >
      <AutomationCreateEditDialog open={createOpen} onOpenChange={setCreateOpen} automation={editing} />
      <AutomationDeleteDialog
        automation={deleting}
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="ativas">Meus Fluxos</TabsTrigger>
          <TabsTrigger value="logs">Histórico e Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Fluxos Ativos</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats ? `${stats.active}/${stats.total}` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Execuções no Mês
                </CardTitle>
                <Activity className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats ? stats.runsThisMonth : "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Taxa de Sucesso</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats ? `${(stats.successRate * 100).toFixed(1)}%` : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <AutomationsSkeleton />
          ) : !automations || automations.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automations.map((auto) => {
                const s = statMap[auto.id];
                const lastRun = s?.lastRunAt ?? null;
                return (
                  <Card
                    key={auto.id}
                    className={
                      auto.enabled ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-slate-300"
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                            <span className="line-clamp-1">{auto.name}</span>
                          </CardTitle>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-normal">
                              {triggerLabel(auto.trigger_event)}
                            </Badge>
                            <Badge variant={auto.enabled ? "default" : "secondary"} className="font-normal">
                              {auto.enabled ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          {auto.description && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {auto.description}
                            </p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/automacoes/builder/${auto.id}`)}>
                              <Workflow className="mr-2 h-4 w-4" />
                              Abrir Builder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(auto)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Editar dados
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleting(auto)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap justify-between items-center gap-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Última execução: {fromNow(lastRun)}
                        </div>
                        <div className="flex gap-4">
                          {s && <span>
                            <strong>{s.runsThisMonth}</strong> vezes/mês
                          </span>}
                          {!!s?.failures && (
                            <span className="text-red-500 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <strong>{s.failures}</strong> falhas
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-sm">{auto.enabled ? "Ativa" : "Inativa"}</span>
                        <Switch
                          checked={!!auto.enabled}
                          disabled={updateMut.isPending}
                          onCheckedChange={(next) => handleToggle(auto, next)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Recente</CardTitle>
              <CardDescription>
                Veja o que foi executado recentemente pelas suas automações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma execução registrada ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log, idx) => {
                    const ok = log.status === "success";
                    return (
                      <div
                        key={log.id ?? idx}
                        className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {ok ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-slate-800">
                              {log.automation_name ?? "Automação"}
                            </p>
                            {log.error ? (
                              <p className="text-sm text-red-500">{log.error}</p>
                            ) : (
                              <p className="text-sm text-slate-500">
                                {ok ? "Executada com sucesso" : "Falha na execução"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">{fromNow(log.started_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

export default AutomationsDashboardPage;
