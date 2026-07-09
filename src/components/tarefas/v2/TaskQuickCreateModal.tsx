import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Flag, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  TarefaChecklist,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
  RECURRENCE_LABELS,
  type TarefaRecurrenceFreq,
} from "@/types/tarefas";
import {
  useCreateTarefa,
  useTarefaTemplates,
  useCreateTarefaTemplate,
  useDeleteTarefaTemplate,
} from "@/hooks/useTarefas";
import { useProjects } from "@/hooks/useProjects";
import { useState } from "react";
import { Repeat, LayoutTemplate, Trash2, Save, Sparkles, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { request } from "@/api/v2/base";

const quickCreateSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  status: z.enum([
    "BACKLOG",
    "A_FAZER",
    "EM_PROGRESSO",
    "REVISAO",
    "CONCLUIDO",
    "ARQUIVADO",
  ] as const),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const),
  tipo: z.enum(["TAREFA", "BUG", "FEATURE", "MELHORIA", "DOCUMENTACAO", "REUNIAO"] as const),
  data_vencimento: z.date().optional().nullable(),
  project_id: z.string().optional().nullable(),
  requires_acknowledgment: z.boolean().default(false),
  recurrence: z.enum(["none", "daily", "weekly", "biweekly", "monthly"] as const).default("none"),
});

type QuickCreateFormData = z.infer<typeof quickCreateSchema>;

interface TaskQuickCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: TarefaStatus;
  defaultProjectId?: string;
  initialData?: Partial<Tarefa>;
}

export function TaskQuickCreateModal({
  open,
  onOpenChange,
  defaultStatus = "A_FAZER",
  defaultProjectId,
  initialData,
}: TaskQuickCreateModalProps) {
  const createTarefa = useCreateTarefa();
  const { data: projects } = useProjects();
  const { data: templates } = useTarefaTemplates();
  const createTemplate = useCreateTarefaTemplate();
  const deleteTemplate = useDeleteTarefaTemplate();
  const [templateChecklists, setTemplateChecklists] = useState<TarefaChecklist[]>([]);

  const form = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      status: (initialData?.status as TarefaStatus) || defaultStatus,
      prioridade: (initialData?.prioridade as TarefaPrioridade) || "MEDIA",
      tipo: (initialData?.tipo as TarefaTipo) || "TAREFA",
      data_vencimento: initialData?.data_vencimento ? new Date(initialData.data_vencimento) : null,
      project_id: initialData?.project_id || defaultProjectId || "__none__",
      requires_acknowledgment: initialData?.requires_acknowledgment || false,
      recurrence: "none",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        titulo: initialData?.titulo || "",
        descricao: initialData?.descricao || "",
        status: (initialData?.status as TarefaStatus) || defaultStatus,
        prioridade: (initialData?.prioridade as TarefaPrioridade) || "MEDIA",
        tipo: (initialData?.tipo as TarefaTipo) || "TAREFA",
        data_vencimento: initialData?.data_vencimento
          ? new Date(initialData.data_vencimento)
          : null,
        project_id: initialData?.project_id || defaultProjectId || "__none__",
        requires_acknowledgment: initialData?.requires_acknowledgment || false,
        recurrence: "none",
      });
      setTemplateChecklists([]);
    }
  }, [open, defaultStatus, defaultProjectId, initialData, form]);

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    form.setValue("titulo", template.titulo);
    form.setValue("descricao", template.descricao ?? "");
    form.setValue("tipo", template.tipo);
    form.setValue("prioridade", template.prioridade);
    setTemplateChecklists(template.checklists ?? []);
  };

  const suggestPriority = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      const res = await request<{ data: { prioridade: TarefaPrioridade } }>(
        "/api/tarefas/ai/suggest-priority",
        {
          method: "POST",
          body: JSON.stringify({ titulo: values.titulo, descricao: values.descricao }),
        },
      );
      return res.data.prioridade;
    },
    onSuccess: (prioridade) => {
      form.setValue("prioridade", prioridade);
      toast.success(`IA sugeriu prioridade: ${PRIORIDADE_LABELS[prioridade]}`);
    },
    onError: (err: Error) => toast.error("Falha na sugestão: " + err.message),
  });

  const saveAsTemplate = () => {
    const values = form.getValues();
    if (!values.titulo) return;
    createTemplate.mutate({
      name: values.titulo,
      titulo: values.titulo,
      descricao: values.descricao,
      tipo: values.tipo,
      prioridade: values.prioridade,
      tags: initialData?.tags || [],
      checklists: templateChecklists,
    });
  };

  const onSubmit = async (data: QuickCreateFormData) => {
    try {
      await createTarefa.mutateAsync({
        titulo: data.titulo,
        descricao: data.descricao,
        status: data.status,
        prioridade: data.prioridade,
        tipo: data.tipo,
        data_vencimento: data.data_vencimento?.toISOString().split("T")[0],
        project_id: data.project_id === "__none__" ? null : data.project_id,
        order_index: 0,
        tags: initialData?.tags || [],
        board_id: initialData?.board_id,
        column_id: initialData?.column_id,
        checklists: templateChecklists,
        requires_acknowledgment: data.requires_acknowledgment,
        recurrence:
          data.recurrence === "none"
            ? null
            : { freq: data.recurrence as TarefaRecurrenceFreq, interval: 1 },
        linked_entity_type: initialData?.linked_entity_type,
        linked_entity_id: initialData?.linked_entity_id,
        responsavel_id: initialData?.responsavel_id,
      });
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template picker */}
            {templates && templates.length > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                <LayoutTemplate className="h-4 w-4 shrink-0 text-slate-400" />
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="h-9 flex-1 border-none bg-transparent shadow-none">
                    <SelectValue placeholder="Criar a partir de template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          {t.name}
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteTemplate.mutate(t.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título da tarefa..." {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a tarefa..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as TarefaStatus[])
                          .filter((s) => s !== "ARQUIVADO")
                          .map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TIPO_LABELS) as TarefaTipo[]).map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {TIPO_LABELS[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      Prioridade
                      <button
                        type="button"
                        onClick={() => suggestPriority.mutate()}
                        disabled={suggestPriority.isPending || !form.watch("titulo")}
                        className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:underline disabled:opacity-40"
                      >
                        {suggestPriority.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Sugerir
                      </button>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <Flag className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(
                          (prioridade) => (
                            <SelectItem key={prioridade} value={prioridade}>
                              {PRIORIDADE_LABELS[prioridade]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Sem prazo</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recorrência */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recorrência</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <Repeat className="h-4 w-4 mr-2 text-slate-400" />
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Não repetir</SelectItem>
                      {(Object.keys(RECURRENCE_LABELS) as TarefaRecurrenceFreq[]).map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {RECURRENCE_LABELS[freq]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px] leading-tight">
                    Ao concluir, a próxima instância é criada automaticamente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project */}
            {projects && projects.length > 0 && !defaultProjectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem projeto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sem projeto</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="requires_acknowledgment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50 mt-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <ShieldAlert className="h-4 w-4 text-orange-500" />
                      Requer Aceite Obrigatório
                    </FormLabel>
                    <FormDescription className="text-[10px] leading-tight">
                      O funcionário deverá clicar em "Li e Entendi" para confirmar a tarefa.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={saveAsTemplate}
                disabled={createTemplate.isPending || !form.watch("titulo")}
                className="mr-auto gap-1.5 rounded-xl text-slate-500"
              >
                <Save className="h-4 w-4" />
                Salvar como template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTarefa.isPending}
                className="rounded-xl bg-slate-900 text-white"
              >
                {createTarefa.isPending ? "Criando..." : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
