/**
 * CRMAutomacoes — gerencia regras de automação CRM (Fase 3 do plano CRM).
 *
 * - Lista templates globais (organization_id IS NULL) e regras da clínica
 * - Toggle ativo/inativo (optimistic update)
 * - Clonar template → cria regra na clínica já ativa
 * - Ver execuções recentes
 * - Deletar regra da clínica (templates globais protegidos)
 * - Botão "Executar agora" dispara scan manual
 */
import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  RefreshCcw,
  History,
} from "lucide-react";
import {
  useCrmAutomationsList,
  useCrmAutomationTemplates,
  useToggleCrmAutomation,
  useDeleteCrmAutomation,
  useCloneCrmAutomation,
  useCrmAutomationExecutions,
  useScanCrmAutomations,
} from "@/hooks/useCrmAutomations";
import type { CrmAutomationRule, CrmTriggerType } from "@/api/v2/crmAutomations";

const TRIGGER_LABEL: Record<CrmTriggerType, string> = {
  lead_created: "Novo lead",
  stage_changed: "Mudou de estágio",
  birthday: "Aniversário",
  discharge: "Alta clínica",
  nps_low: "NPS baixo",
  appointment_no_show: "No-show",
  inactivity: "Inatividade",
};

const TRIGGER_COLOR: Record<CrmTriggerType, string> = {
  lead_created: "bg-blue-100 text-blue-700 border-blue-200",
  stage_changed: "bg-purple-100 text-purple-700 border-purple-200",
  birthday: "bg-pink-100 text-pink-700 border-pink-200",
  discharge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  nps_low: "bg-rose-100 text-rose-700 border-rose-200",
  appointment_no_show: "bg-amber-100 text-amber-700 border-amber-200",
  inactivity: "bg-slate-100 text-slate-700 border-slate-200",
};

const ACTION_LABEL: Record<string, string> = {
  send_whatsapp: "WhatsApp",
  send_email: "E-mail",
  send_nps: "Pesquisa NPS",
  create_task: "Criar tarefa",
  update_stage: "Mudar estágio",
  add_tag: "Adicionar tag",
  wait: "Aguardar",
  webhook: "Webhook",
};

function ActionsSummary({ rule }: { rule: CrmAutomationRule }) {
  if (!rule.acoes.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {rule.acoes.map((a, i) => {
        const delay = a.delay_seconds ?? 0;
        const delayLabel =
          delay >= 86400
            ? `${Math.round(delay / 86400)}d`
            : delay >= 3600
              ? `${Math.round(delay / 3600)}h`
              : delay >= 60
                ? `${Math.round(delay / 60)}m`
                : delay > 0
                  ? `${delay}s`
                  : "";
        return (
          <Badge key={i} variant="outline" className="text-xs gap-1">
            {ACTION_LABEL[a.type] ?? a.type}
            {delayLabel && <span className="text-muted-foreground">+{delayLabel}</span>}
          </Badge>
        );
      })}
    </div>
  );
}

function ExecutionsSheet({
  rule,
  open,
  onClose,
}: {
  rule: CrmAutomationRule | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: executions = [], isLoading } = useCrmAutomationExecutions(
    open && rule ? rule.id : null,
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Execuções
          </SheetTitle>
          <SheetDescription>{rule?.nome}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : executions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma execução ainda.
            </p>
          ) : (
            executions.map((e) => {
              const StatusIcon =
                e.status === "completed"
                  ? CheckCircle2
                  : e.status === "failed"
                    ? XCircle
                    : e.status === "running"
                      ? Loader2
                      : Clock;
              const color =
                e.status === "completed"
                  ? "text-emerald-600"
                  : e.status === "failed"
                    ? "text-rose-600"
                    : e.status === "running"
                      ? "text-blue-600"
                      : "text-muted-foreground";
              return (
                <div key={e.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
                      <StatusIcon
                        className={`h-3.5 w-3.5 ${e.status === "running" ? "animate-spin" : ""}`}
                      />
                      {e.status} · passo #{e.action_index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.scheduled_for), "dd MMM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {e.error && (
                    <p className="mt-1 text-xs text-rose-600 break-words">{e.error}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RuleCard({
  rule,
  isTemplate,
  onView,
}: {
  rule: CrmAutomationRule;
  isTemplate: boolean;
  onView: () => void;
}) {
  const toggleMutation = useToggleCrmAutomation();
  const deleteMutation = useDeleteCrmAutomation();
  const cloneMutation = useCloneCrmAutomation();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {rule.nome}
              {isTemplate && (
                <Badge variant="outline" className="text-xs font-normal">
                  Template
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {rule.descricao ?? "—"}
            </CardDescription>
          </div>
          {!isTemplate && (
            <Switch
              checked={rule.ativo}
              onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, ativo: v })}
              disabled={toggleMutation.isPending}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={`border ${TRIGGER_COLOR[rule.gatilho_tipo]}`}>
            <Zap className="h-3 w-3 mr-1" />
            {TRIGGER_LABEL[rule.gatilho_tipo] ?? rule.gatilho_tipo}
          </Badge>
          {rule.cooldown_minutes > 0 && (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              cooldown {Math.round(rule.cooldown_minutes / 60)}h
            </span>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Ações</p>
          <ActionsSummary rule={rule} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          {isTemplate ? (
            <Button
              size="sm"
              onClick={() => cloneMutation.mutate({ template: rule, ativo: true })}
              disabled={cloneMutation.isPending}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Clonar e ativar
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onView}>
                <History className="h-3.5 w-3.5 mr-1" />
                Execuções
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Execuções pendentes desta regra também serão canceladas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CRMAutomacoes() {
  const { data: all = [], isLoading } = useCrmAutomationsList();
  const { data: templates = [] } = useCrmAutomationTemplates();
  const scanMutation = useScanCrmAutomations();
  const [viewingRule, setViewingRule] = useState<CrmAutomationRule | null>(null);

  const myRules = useMemo(() => all.filter((r) => r.organization_id !== null), [all]);

  // Templates ainda não clonados (dedup por nome+gatilho — heurística)
  const availableTemplates = useMemo(() => {
    const clonedKey = new Set(myRules.map((r) => `${r.nome}|${r.gatilho_tipo}`));
    return templates.filter((t) => !clonedKey.has(`${t.nome}|${t.gatilho_tipo}`));
  }, [templates, myRules]);

  const lastUpdatedText = useMemo(() => {
    if (!myRules.length) return null;
    const lastUpdated = myRules.reduce<Date | null>((acc, r) => {
      const d = new Date(r.updated_at);
      return !acc || d > acc ? d : acc;
    }, null);
    if (!lastUpdated) return null;
    return formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR });
  }, [myRules]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Regras de Automação
          </h2>
          <p className="text-sm text-muted-foreground">
            Gatilhos automáticos do CRM. Cron <code>*/15 * * * *</code> executa as
            ações agendadas.
            {lastUpdatedText && <> Última regra atualizada {lastUpdatedText}.</>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
        >
          <RefreshCcw
            className={`h-4 w-4 mr-2 ${scanMutation.isPending ? "animate-spin" : ""}`}
          />
          Executar scan agora
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Minhas regras ({myRules.length})
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : myRules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Nenhuma regra ativa ainda. Clone um template abaixo para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {myRules.map((r) => (
              <RuleCard
                key={r.id}
                rule={r}
                isTemplate={false}
                onView={() => setViewingRule(r)}
              />
            ))}
          </div>
        )}
      </section>

      {availableTemplates.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Templates disponíveis ({availableTemplates.length})
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Clonar copia o template para sua clínica já ativo. Você pode
            personalizar ou desativar a qualquer momento.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {availableTemplates.map((t) => (
              <RuleCard key={t.id} rule={t} isTemplate onView={() => {}} />
            ))}
          </div>
        </section>
      )}

      <ExecutionsSheet
        rule={viewingRule}
        open={!!viewingRule}
        onClose={() => setViewingRule(null)}
      />

      <Card className="bg-amber-50/50 border-amber-200">
        <CardContent className="pt-4 pb-4 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p>
              <strong>Editor visual de regras</strong> ainda não disponível — para
              criar regras customizadas (gatilhos compostos, novas ações), use a
              API <code>POST /api/crm-automations</code> diretamente.
            </p>
            <p>
              Ações de envio dependem das credenciais configuradas:{" "}
              <code>WHATSAPP_*</code> para WhatsApp e <code>NPS_PUBLIC_BASE_URL</code>{" "}
              para links de NPS.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
