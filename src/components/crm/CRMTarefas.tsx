import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Users,
  Loader2,
} from "lucide-react";
import { useCRMTarefas, useCreateTarefa, useConcluirTarefa, useDeleteTarefa } from "@/hooks/useCRM";
import { useLeads } from "@/hooks/useLeads";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const TIPOS_TAREFA = [
  { value: "follow_up", label: "Follow-up", icon: Users, color: "bg-blue-500" },
  { value: "ligacao", label: "Ligação", icon: Phone, color: "bg-green-500" },
  { value: "email", label: "Email", icon: Mail, color: "bg-purple-500" },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    color: "bg-emerald-500",
  },
  {
    value: "reuniao",
    label: "Reunião",
    icon: Calendar,
    color: "bg-orange-500",
  },
];

const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "bg-slate-400" },
  { value: "normal", label: "Normal", color: "bg-blue-500" },
  { value: "alta", label: "Alta", color: "bg-amber-500" },
  { value: "urgente", label: "Urgente", color: "bg-rose-500" },
];

interface CRMTarefasProps {
  leadId?: string;
  compact?: boolean;
}

export function CRMTarefas({ leadId, compact = false }: CRMTarefasProps) {
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo: "follow_up",
    prioridade: "normal",
    data_vencimento: "",
    hora_vencimento: "",
    lead_id: leadId || "",
  });

  const { data: tarefas = [] } = useCRMTarefas(leadId);
  const { data: leads = [] } = useLeads();
  const createMutation = useCreateTarefa();
  const concluirMutation = useConcluirTarefa();
  const deleteMutation = useDeleteTarefa();

  const tarefasPendentes = tarefas.filter(
    (t) => t.status === "pendente" || t.status === "em_andamento",
  );
  const tarefasConcluidas = tarefas.filter((t) => t.status === "concluida");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      lead_id: formData.lead_id || null,
      data_vencimento: formData.data_vencimento || null,
      hora_vencimento: formData.hora_vencimento || null,
      status: "pendente",
      responsavel_id: null,
    });
    setIsDialogOpen(false);
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "follow_up",
      prioridade: "normal",
      data_vencimento: "",
      hora_vencimento: "",
      lead_id: leadId || "",
    });
  };

  const getDateBadge = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d))
      return (
        <Badge variant="destructive" className="text-[10px] h-4">
          Atrasada
        </Badge>
      );
    if (isToday(d)) return <Badge className="bg-amber-500 text-[10px] h-4">Hoje</Badge>;
    if (isTomorrow(d)) return <Badge className="bg-blue-500 text-[10px] h-4">Amanhã</Badge>;
    return null;
  };

  const getTipoInfo = (tipo: string) =>
    TIPOS_TAREFA.find((t) => t.value === tipo) || TIPOS_TAREFA[0];
  const getPrioridadeInfo = (prioridade: string) =>
    PRIORIDADES.find((p) => p.value === prioridade) || PRIORIDADES[1];

  const renderModal = () => (
    <CustomModal
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      isMobile={isMobile}
      contentClassName="max-w-md"
    >
      <CustomModalHeader onClose={() => setIsDialogOpen(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Nova Tarefa CRM
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Título da Tarefa *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ex: Ligar para confirmar avaliação"
              required
              className="rounded-xl"
            />
          </div>

          {!leadId && (
            <div className="space-y-2">
              <Label className="font-semibold text-xs text-muted-foreground">
                Vincular a Lead (opcional)
              </Label>
              <Select
                value={formData.lead_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, lead_id: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TAREFA.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, prioridade: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.color)} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-xs">Data de Vencimento</Label>
              <Input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    data_vencimento: e.target.value,
                  }))
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs">Horário</Label>
              <Input
                type="time"
                value={formData.hora_vencimento}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hora_vencimento: e.target.value,
                  }))
                }
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-xs">Descrição / Notas</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
              placeholder="Detalhes adicionais da tarefa..."
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setIsDialogOpen(false)}
          className="rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit()}
          disabled={createMutation.isPending || !formData.titulo}
          className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Criar Tarefa
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Tarefas</h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDialogOpen(true)}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tarefasPendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
        ) : (
          <div className="space-y-1">
            {tarefasPendentes.slice(0, 3).map((tarefa) => {
              const TipoIcon = getTipoInfo(tarefa.tipo).icon;
              return (
                <div
                  key={tarefa.id}
                  className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-lg group"
                >
                  <Checkbox
                    checked={tarefa.status === "concluida"}
                    onCheckedChange={() => concluirMutation.mutate(tarefa.id)}
                  />
                  <TipoIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="flex-1 truncate">{tarefa.titulo}</span>
                  {getDateBadge(tarefa.data_vencimento)}
                </div>
              );
            })}
          </div>
        )}
        {renderModal()}
      </div>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Tarefas do CRM
          </CardTitle>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="rounded-lg gap-1">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {tarefasPendentes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-medium">Tudo em dia!</p>
                <p className="text-xs">Nenhuma tarefa pendente para este lead.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tarefasPendentes.map((tarefa) => {
                  const TipoIcon = getTipoInfo(tarefa.tipo).icon;
                  const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade);
                  return (
                    <div
                      key={tarefa.id}
                      className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <Checkbox
                        checked={tarefa.status === "concluida"}
                        onCheckedChange={() => concluirMutation.mutate(tarefa.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded-lg", getTipoInfo(tarefa.tipo).color)}>
                            <TipoIcon className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-semibold text-sm truncate">{tarefa.titulo}</span>
                          <div
                            className={cn("w-2 h-2 rounded-full", prioridadeInfo.color)}
                            title={`Prioridade: ${prioridadeInfo.label}`}
                          />
                        </div>
                        {tarefa.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {tarefa.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {tarefa.data_vencimento && (
                            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}
                              {tarefa.hora_vencimento &&
                                ` às ${tarefa.hora_vencimento.slice(0, 5)}`}
                            </span>
                          )}
                          {getDateBadge(tarefa.data_vencimento)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(tarefa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {tarefasConcluidas.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Concluídas recentemente
                </h4>
                <div className="space-y-2">
                  {tarefasConcluidas.slice(0, 5).map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="flex items-center gap-2 p-2 text-xs bg-slate-50 rounded-lg text-slate-400 line-through grayscale"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/50" />
                      <span className="flex-1 truncate">{tarefa.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        {renderModal()}
      </CardContent>
    </Card>
  );
}
