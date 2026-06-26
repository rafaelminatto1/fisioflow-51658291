/**
 * AutomationCreateEditDialog - Modal de criação/edição rápida de automação.
 * Em modo criação, ao salvar navega para o Builder visual (/automacoes/builder/:id).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AutomationRecord } from "@/api/v2";
import {
  emptyDefinition,
  useCreateAutomation,
  useUpdateAutomation,
} from "@/hooks/useAutomations";
import { TRIGGER_EVENTS } from "./triggerEvents";

interface AutomationCreateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: AutomationRecord | null;
}

export function AutomationCreateEditDialog({
  open,
  onOpenChange,
  automation,
}: AutomationCreateEditDialogProps) {
  const navigate = useNavigate();
  const isEdit = !!automation;

  const createMut = useCreateAutomation();
  const updateMut = useUpdateAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<string>(TRIGGER_EVENTS[0].value);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (automation) {
      setName(automation.name ?? "");
      setDescription(automation.description ?? "");
      setTriggerEvent(automation.trigger_event || TRIGGER_EVENTS[0].value);
      setEnabled(automation.enabled ?? false);
    } else {
      setName("");
      setDescription("");
      setTriggerEvent(TRIGGER_EVENTS[0].value);
      setEnabled(false);
    }
  }, [open, automation]);

  const busy = createMut.isPending || updateMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para a automação.");
      return;
    }

    if (isEdit && automation) {
      try {
        await updateMut.mutateAsync({
          id: automation.id,
          name: name.trim(),
          description: description.trim() || undefined,
          triggerEvent,
          enabled,
          definition: automation.definition ?? emptyDefinition(triggerEvent),
        });
        toast.success("Automação atualizada!");
        onOpenChange(false);
      } catch {
        toast.error("Erro ao atualizar automação.");
      }
      return;
    }

    try {
      const res = await createMut.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerEvent,
        enabled: false,
        definition: emptyDefinition(triggerEvent),
      });
      const newId = res?.data?.id;
      toast.success("Automação criada! Abra o builder para montar o fluxo.");
      onOpenChange(false);
      if (newId) navigate(`/automacoes/builder/${newId}`);
    } catch {
      toast.error("Erro ao criar automação.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {isEdit ? "Editar Automação" : "Nova Automação"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados básicos. Para montar o fluxo, use o Builder."
              : "Preencha os dados básicos. Em seguida você montará o fluxo no Builder visual."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auto-name">Nome *</Label>
            <Input
              id="auto-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Boas-vindas de novos pacientes"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-desc">Descrição</Label>
            <Textarea
              id="auto-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que esta automação faz?"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-trigger">Gatilho (evento)</Label>
            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
              <SelectTrigger id="auto-trigger">
                <SelectValue placeholder="Selecione um gatilho" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_EVENTS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TRIGGER_EVENTS.find((t) => t.value === triggerEvent)?.description}
            </p>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="auto-enabled" className="cursor-pointer">
                  Automação ativa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativa, executa automaticamente ao receber o gatilho.
                </p>
              </div>
              <Switch id="auto-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar e abrir Builder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AutomationCreateEditDialog;
