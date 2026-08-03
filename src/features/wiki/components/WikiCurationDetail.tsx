import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTION_LABELS,
  editorialStatusLabel,
  getPrimaryAction,
  technicalStatusLabel,
} from "@/features/wiki/curation/curationUtils";
import type {
  CurationAction,
  AssignmentInput,
  CurationItemDetail,
  CurationQueueItem,
  TransitionInput,
} from "@/features/wiki/types/curation";

interface WikiCurationDetailProps {
  open: boolean;
  item?: CurationQueueItem;
  detail?: CurationItemDetail;
  isLoading: boolean;
  error?: unknown;
  transitionPending: boolean;
  assignmentPending: boolean;
  canAssign: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onTransition: (input: TransitionInput) => Promise<unknown>;
  onAssign: (input: AssignmentInput) => Promise<unknown>;
}

function formatDate(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-BR");
}

function Definition({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children || "Não informado"}</dd>
    </div>
  );
}

export function WikiCurationDetail({
  open,
  item,
  detail,
  isLoading,
  error,
  transitionPending,
  assignmentPending,
  canAssign,
  onOpenChange,
  onRetry,
  onTransition,
  onAssign,
}: WikiCurationDetailProps) {
  const current = detail ?? item;
  const [action, setAction] = useState<CurationAction>();
  const [reason, setReason] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    setAction(undefined);
    setReason("");
    setValidUntil("");
    setAssignmentOpen(false);
    setAssigneeId("");
    setPriority("normal");
    setDueAt("");
  }, [item?.id]);

  const primaryAction = current
    ? getPrimaryAction(current.allowedActions)
    : undefined;
  const requiresReason =
    action === "request_changes" || action === "reject" || action === "archive";

  async function submitTransition() {
    if (!current || !action || (requiresReason && !reason.trim())) return;
    try {
      await onTransition({
        item: current,
        action,
        reason: reason.trim() || undefined,
        validUntil: validUntil || undefined,
      });
      toast.success(`${ACTION_LABELS[action]} concluído.`);
      setAction(undefined);
    } catch (transitionError) {
      const apiError = transitionError as Error & {
        status?: number;
        payload?: { code?: string };
      };
      if (apiError.status === 409) {
        toast.error(
          apiError.payload?.code === "VERSION_CONFLICT"
            ? "O item mudou enquanto estava aberto. Revise os dados atualizados."
            : "A transição não é mais válida para este item.",
        );
      } else
        toast.error(apiError.message || "Não foi possível concluir a ação.");
    }
  }

  async function submitAssignment() {
    if (!current || !assigneeId.trim()) return;
    try {
      await onAssign({
        item: current,
        assigneeId: assigneeId.trim(),
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      toast.success("Responsável atualizado.");
      setAssignmentOpen(false);
    } catch (assignmentError) {
      const apiError = assignmentError as Error & {
        status?: number;
        payload?: { error?: { code?: string; message?: string } };
      };
      toast.error(
        apiError.payload?.error?.code === "VERSION_CONFLICT"
          ? "O item mudou enquanto estava aberto. Revise os dados atualizados."
          : apiError.message || "Não foi possível atribuir o item.",
      );
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-w-xl">
          <SheetHeader className="pr-8">
            <SheetTitle>{current?.title || "Detalhes da curadoria"}</SheetTitle>
            <SheetDescription>
              Versão, confiança clínica e processamento técnico são exibidos
              separadamente.
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div
              className="flex min-h-48 items-center justify-center"
              role="status"
            >
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="sr-only">Carregando detalhe</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível carregar o item.{" "}
                <Button variant="link" className="h-auto p-0" onClick={onRetry}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : current ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge>{editorialStatusLabel(current.editorialStatus)}</Badge>
                <Badge
                  variant={
                    current.technicalStatus === "failed"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {technicalStatusLabel(current.technicalStatus)}
                </Badge>
                <Badge variant="secondary">{current.kind}</Badge>
              </div>

              <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                <Definition label="Responsável">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />{" "}
                    {current.assignee?.name || "Sem responsável"}
                  </span>
                </Definition>
                <Definition label="Prioridade">
                  {current.priority || "Normal"}
                </Definition>
                <Definition label="Prazo">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4" />{" "}
                    {formatDate(current.dueAt)}
                  </span>
                </Definition>
                <Definition label="Vigência">
                  {formatDate(current.validUntil)}
                </Definition>
              </dl>
              {canAssign ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAssigneeId(current.assignee?.id || "");
                    setPriority(current.priority || "normal");
                    setDueAt(current.dueAt ? current.dueAt.slice(0, 16) : "");
                    setAssignmentOpen(true);
                  }}
                >
                  <UserRoundPlus className="mr-2 h-4 w-4" />
                  Atribuir responsável
                </Button>
              ) : null}

              <section
                aria-labelledby="provenance-heading"
                className="space-y-3"
              >
                <h3 id="provenance-heading" className="font-semibold">
                  Proveniência e licença
                </h3>
                {(detail?.sources?.length
                  ? detail.sources
                  : current.provenance
                    ? [current.provenance]
                    : []
                ).map((source, index) => (
                  <div
                    key={`${source.sourceType || "source"}-${source.sourceId || index}`}
                    className="rounded-xl bg-muted/50 p-4"
                  >
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <Definition label="Origem">
                        {source.sourceTitle || source.sourceType}
                      </Definition>
                      <Definition label="Licença">{source.license}</Definition>
                      <Definition label="DOI">{source.doi}</Definition>
                      <Definition label="PMID">{source.pmid}</Definition>
                    </dl>
                    {source.sourceUrl ? (
                      <a
                        className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir fonte <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ))}
                {!detail?.sources?.length && !current.provenance ? (
                  <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    Proveniência não informada.
                  </p>
                ) : null}
              </section>

              {detail?.summary ? (
                <section>
                  <h3 className="font-semibold">Resumo clínico</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {detail.summary}
                  </p>
                </section>
              ) : null}
              {detail?.limitations ? (
                <section>
                  <h3 className="font-semibold">Limitações</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {detail.limitations}
                  </p>
                </section>
              ) : null}
              {detail?.review ? (
                <section className="space-y-3">
                  <h3 className="font-semibold">Revisão da versão</h3>
                  <dl className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                    <Definition label="Submissor">
                      {detail.review.submittedBy?.name}
                    </Definition>
                    <Definition label="Revisor">
                      {detail.review.reviewer?.name}
                    </Definition>
                    <Definition label="Aprovador">
                      {detail.review.approvedBy?.name}
                    </Definition>
                    <Definition label="Decisão">
                      {detail.review.decision}
                    </Definition>
                  </dl>
                </section>
              ) : null}

              {current.allowedActions.length ? (
                <div className="sticky bottom-0 space-y-2 border-t bg-background pb-[env(safe-area-inset-bottom)] pt-4">
                  <div className="flex flex-wrap gap-2">
                    {primaryAction ? (
                      <Button onClick={() => setAction(primaryAction)}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {ACTION_LABELS[primaryAction]}
                      </Button>
                    ) : null}
                    {current.allowedActions
                      .filter((itemAction) => itemAction !== primaryAction)
                      .map((itemAction) => (
                        <Button
                          key={itemAction}
                          variant="outline"
                          onClick={() => setAction(itemAction)}
                        >
                          {ACTION_LABELS[itemAction]}
                        </Button>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    As ações disponíveis são calculadas e validadas pela API
                    para esta versão.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Nenhuma ação editorial disponível para esta versão.
                </p>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(action)}
        onOpenChange={(nextOpen) => !nextOpen && setAction(undefined)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action ? ACTION_LABELS[action] : "Confirmar ação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {requiresReason ? (
              <div className="space-y-1.5">
                <Label htmlFor="transition-reason">Justificativa *</Label>
                <Textarea
                  id="transition-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            ) : null}
            {action === "approve" ? (
              <div className="space-y-1.5">
                <Label htmlFor="transition-validity">
                  Válida até (opcional)
                </Label>
                <Input
                  id="transition-validity"
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                />
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              A ação será aplicada somente à versão atualmente aberta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(undefined)}>
              Cancelar
            </Button>
            <Button
              onClick={submitTransition}
              disabled={transitionPending || (requiresReason && !reason.trim())}
            >
              {transitionPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}{" "}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir responsável</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assignment-user">ID do responsável *</Label>
              <Input
                id="assignment-user"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignment-priority">Prioridade</Label>
              <select
                id="assignment-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignment-due">Prazo</Label>
              <Input
                id="assignment-due"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitAssignment}
              disabled={assignmentPending || !assigneeId.trim()}
            >
              {assignmentPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
