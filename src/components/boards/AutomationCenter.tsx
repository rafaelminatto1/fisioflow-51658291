import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Plus, Trash2, Pencil, ChevronRight, Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { boardAutomationsApi } from "@/api/v2";
import type { BoardAutomation, BoardLabel } from "@/types/boards";

interface AutomationCenterProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels?: BoardLabel[];
}

/** Pré-definições para onboarding rápido */
const AUTOMATION_PRESETS = [
  {
    name: "Mover para Concluído quando checklist completo",
    description: "Quando todos os itens do checklist forem marcados",
    trigger: { type: "checklist_completed" },
    conditions: [],
    actions: [{ type: "change_status", status: "CONCLUIDO" }],
  },
  {
    name: "Notificar quando tarefa atrasar",
    description: "Avisa o responsável um dia antes do prazo",
    trigger: { type: "due_date_approaching", days_before: 1 },
    conditions: [],
    actions: [
      {
        type: "send_notification",
        message: "Sua tarefa vence amanhã!",
        channel: "inapp",
      },
    ],
  },
  {
    name: "Notificar no WhatsApp quando atrasar",
    description: "Envia mensagem WhatsApp ao responsável 1 dia antes",
    trigger: { type: "due_date_approaching", days_before: 1 },
    conditions: [],
    actions: [
      {
        type: "send_notification",
        message: "Lembrete: sua tarefa vence amanhã!",
        channel: "whatsapp",
      },
    ],
  },
] as const;

const TRIGGER_LABELS: Record<string, string> = {
  status_changed: "Status mudou",
  label_added: "Etiqueta adicionada",
  label_removed: "Etiqueta removida",
  checklist_completed: "Checklist completado (100%)",
  task_created: "Tarefa criada",
  due_date_approaching: "Prazo se aproximando",
};

const ACTION_LABELS: Record<string, string> = {
  change_status: "Mudar status",
  assign_label: "Adicionar etiqueta",
  remove_label: "Remover etiqueta",
  assign_user: "Atribuir responsável",
  send_notification: "Enviar notificação",
  create_task: "Criar nova tarefa",
};

function describeAutomation(automation: BoardAutomation): string {
  const trigger = TRIGGER_LABELS[automation.trigger.type] ?? automation.trigger.type;
  const actions = automation.actions.map((a) => ACTION_LABELS[a.type] ?? a.type).join(", ");
  return `${trigger} → ${actions}`;
}

interface AutomationFormProps {
  boardId: string;
  automation?: BoardAutomation | null;
  labels: BoardLabel[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending: boolean;
}

function AutomationForm({ automation, labels, onSave, onCancel, isPending }: AutomationFormProps) {
  const [name, setName] = useState(automation?.name ?? "");
  const [triggerType, setTriggerType] = useState(automation?.trigger.type ?? "status_changed");
  const [actionType, setActionType] = useState(automation?.actions[0]?.type ?? "change_status");
  const [actionStatus, setActionStatus] = useState(
    (automation?.actions[0] as { status?: string })?.status ?? "CONCLUIDO",
  );
  const [actionLabelId, setActionLabelId] = useState(
    (automation?.actions[0] as { label_id?: string })?.label_id ?? "",
  );
  const [notifMsg, setNotifMsg] = useState(
    (automation?.actions[0] as { message?: string })?.message ?? "",
  );
  const [notifChannel, setNotifChannel] = useState<"inapp" | "whatsapp">(
    (automation?.actions[0] as { channel?: "inapp" | "whatsapp" })?.channel ?? "inapp",
  );
  const [daysBefore, setDaysBefore] = useState(
    automation?.trigger.type === "due_date_approaching"
      ? ((automation.trigger as { days_before?: number }).days_before ?? 1)
      : 1,
  );

  const buildPayload = () => {
    const trigger: Record<string, unknown> = { type: triggerType };
    if (triggerType === "due_date_approaching") trigger.days_before = daysBefore;

    const action: Record<string, unknown> = { type: actionType };
    if (actionType === "change_status") action.status = actionStatus;
    if (actionType === "assign_label" || actionType === "remove_label")
      action.label_id = actionLabelId;
    if (actionType === "send_notification") {
      action.message = notifMsg;
      action.channel = notifChannel;
    }

    return { name, trigger, conditions: [], actions: [action] };
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Nome da automação
        </label>
        <Input
          placeholder="Ex: Mover para concluído quando checklist completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quando (Gatilho)
        </p>
        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {triggerType === "due_date_approaching" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quantos dias antes?</span>
            <Input
              type="number"
              min={1}
              max={30}
              value={daysBefore}
              onChange={(e) => setDaysBefore(Number(e.target.value))}
              className="w-20"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <ChevronRight className="h-4 w-4" />
        <span className="text-sm">Então (Ação)</span>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {actionType === "change_status" && (
          <Select value={actionStatus} onValueChange={setActionStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="A_FAZER">A Fazer</SelectItem>
              <SelectItem value="EM_PROGRESSO">Em Progresso</SelectItem>
              <SelectItem value="REVISAO">Revisão</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            </SelectContent>
          </Select>
        )}

        {(actionType === "assign_label" || actionType === "remove_label") && (
          <Select value={actionLabelId} onValueChange={setActionLabelId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a etiqueta" />
            </SelectTrigger>
            <SelectContent>
              {labels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {actionType === "send_notification" && (
          <div className="space-y-2">
            <Input
              placeholder="Mensagem da notificação"
              value={notifMsg}
              onChange={(e) => setNotifMsg(e.target.value)}
            />
            <Select
              value={notifChannel}
              onValueChange={(v) => setNotifChannel(v as "inapp" | "whatsapp")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inapp">Notificação no app</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(buildPayload())} disabled={!name.trim() || isPending}>
          {automation ? "Salvar alterações" : "Criar automação"}
        </Button>
      </div>
    </div>
  );
}

export function AutomationCenter({
  boardId,
  open,
  onOpenChange,
  labels = [],
}: AutomationCenterProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<BoardAutomation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["boards", boardId, "automations"],
    queryFn: () => boardAutomationsApi.list(boardId),
    enabled: open && !!boardId,
  });

  const automations: BoardAutomation[] = (data?.data ?? []) as BoardAutomation[];

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["boards", boardId, "automations"],
    });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => boardAutomationsApi.create(boardId, d),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      boardAutomationsApi.update(id, data),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditingAutomation(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      boardAutomationsApi.toggle(id, isActive),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardAutomationsApi.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
    },
  });

  const handleSave = (payload: Record<string, unknown>) => {
    if (editingAutomation) {
      updateMutation.mutate({ id: editingAutomation.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (automation: BoardAutomation) => {
    setEditingAutomation(automation);
    setFormOpen(true);
  };

  const handlePreset = (preset: (typeof AUTOMATION_PRESETS)[number]) => {
    createMutation.mutate({ ...preset });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Central de Automações
            </DialogTitle>
          </DialogHeader>

          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Automações executam regras automaticamente quando eventos acontecem no board. Você
              pode ativar ou desativar qualquer regra sem perdê-la.
            </p>
          </div>

          {/* Active automations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Regras ativas ({automations.filter((a) => a.is_active).length}/{automations.length})
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setEditingAutomation(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nova regra
              </Button>
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            )}

            {!isLoading && automations.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhuma automação criada.</p>
                <p className="text-xs mt-1">Use os exemplos abaixo ou crie uma nova regra.</p>
              </div>
            )}

            {automations.map((automation) => (
              <div
                key={automation.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3 transition-all",
                  automation.is_active
                    ? "bg-background border-border"
                    : "bg-muted/30 border-border/40 opacity-60",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{automation.name}</span>
                    {automation.is_active ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-green-500/10 text-green-600 border-green-200"
                      >
                        Ativa
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-muted text-muted-foreground"
                      >
                        Pausada
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {describeAutomation(automation)}
                  </p>
                  {automation.execution_count > 0 && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {automation.execution_count} execuç
                      {automation.execution_count === 1 ? "ão" : "ões"}
                      {automation.last_executed_at &&
                        ` · última: ${new Date(automation.last_executed_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({
                        id: automation.id,
                        isActive: checked,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(automation)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(automation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Presets */}
          {automations.length === 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Exemplos prontos para usar</p>
              <div className="space-y-2">
                {AUTOMATION_PRESETS.map((preset, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/60 hover:border-border p-3 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{preset.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={() => handlePreset(preset)}
                      disabled={createMutation.isPending}
                    >
                      <Play className="h-3 w-3" />
                      Usar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Automation Form Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingAutomation(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? "Editar automação" : "Nova automação"}</DialogTitle>
          </DialogHeader>
          <AutomationForm
            boardId={boardId}
            automation={editingAutomation}
            labels={labels}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingAutomation(null);
            }}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              A regra será removida permanentemente. Você pode pausá-la em vez de excluir para
              mantê-la disponível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
