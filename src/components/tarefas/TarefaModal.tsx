import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Tag, X, CheckSquare, Link as LinkIcon, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  useTarefas,
  useCreateTarefa,
  useUpdateTarefa
} from '@/hooks/useTarefas';
import { useProjects } from '@/hooks/useProjects';

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean()
});

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url('URL inválida'),
  type: z.string().default('link')
});

const tarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  status: z.enum(['A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO']),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']),
  data_vencimento: z.date().optional().nullable(),
  start_date: z.date().optional().nullable(),
  tags: z.array(z.string()).default([]),
  project_id: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  checklist: z.array(checklistItemSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  dependencies: z.array(z.string()).default([])
});

type TarefaFormData = z.infer<typeof tarefaSchema>;

interface TarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa?: Tarefa | null;
  defaultStatus?: TarefaStatus;
  defaultOrderIndex?: number;
  defaultProjectId?: string;
}

export function TarefaModal({ open, onOpenChange, tarefa, defaultStatus = 'A_FAZER', defaultOrderIndex = 0, defaultProjectId }: TarefaModalProps) {
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const { data: projects } = useProjects();
  const { data: allTarefas } = useTarefas();

  const form = useForm<TarefaFormData>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      status: defaultStatus,
      prioridade: 'MEDIA',
      data_vencimento: null,
      start_date: null,
      tags: [],
      project_id: defaultProjectId || '',
      parent_id: null,
      checklist: [],
      attachments: [],
      dependencies: []
    }
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } = useFieldArray({
    control: form.control,
    name: "checklist"
  });

  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: "attachments"
  });

  const tags = form.watch('tags');

  useEffect(() => {
    if (tarefa) {
      form.reset({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || '',
        status: tarefa.status,
        prioridade: tarefa.prioridade,
        data_vencimento: tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null,
        start_date: tarefa.start_date ? new Date(tarefa.start_date) : null,
        tags: tarefa.tags || [],
        project_id: tarefa.project_id || defaultProjectId || '',
        parent_id: tarefa.parent_id || null,
        checklist: tarefa.checklist || [],
        attachments: tarefa.attachments || [],
        dependencies: tarefa.dependencies || []
      });
    } else {
      form.reset({
        titulo: '',
        descricao: '',
        status: defaultStatus,
        prioridade: 'MEDIA',
        data_vencimento: null,
        start_date: null,
        tags: [],
        project_id: defaultProjectId || '',
        parent_id: null,
        checklist: [],
        attachments: [],
        dependencies: []
      });
    }
  }, [tarefa, defaultStatus, defaultProjectId, form]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      const value = input.value.trim();

      if (value && !tags.includes(value)) {
        form.setValue('tags', [...tags, value]);
        input.value = '';
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tags', tags.filter(t => t !== tagToRemove));
  };

  const addChecklistItem = () => {
    appendChecklist({ id: crypto.randomUUID(), text: '', completed: false });
  };

  const addAttachment = () => {
    appendAttachment({ id: crypto.randomUUID(), name: '', url: '', type: 'link' });
  };

  const onSubmit = async (data: TarefaFormData) => {
    try {
      if (tarefa) {
        await updateTarefa.mutateAsync({
          id: tarefa.id,
          ...data,
          project_id: data.project_id || null,
          data_vencimento: data.data_vencimento?.toISOString().split('T')[0],
          start_date: data.start_date?.toISOString().split('T')[0],
          parent_id: data.parent_id,
          dependencies: data.dependencies
        });
      } else {
        await createTarefa.mutateAsync({
          ...data,
          order_index: defaultOrderIndex,
          project_id: data.project_id || null,
          data_vencimento: data.data_vencimento?.toISOString().split('T')[0],
          start_date: data.start_date?.toISOString().split('T')[0],
          parent_id: data.parent_id,
          dependencies: data.dependencies
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-hidden flex flex-col flex-1">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 p-1">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o título da tarefa..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Project Selection */}
                  {!defaultProjectId && (
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um projeto (opcional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nenhum</SelectItem>
                              {projects?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                            {(Object.keys(STATUS_LABELS) as TarefaStatus[]).map(status => (
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
                </div>

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

                {/* Checklist Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" /> Checklist
                    </FormLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={addChecklistItem}>
                      <Plus className="w-4 h-4 mr-1" /> Item
                    </Button>
                  </div>
                  {checklistFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 group">
                      <FormField
                        control={form.control}
                        name={`checklist.${index}.completed`}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`checklist.${index}.text`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="h-8 flex-1 border-none focus-visible:ring-1 bg-muted/20"
                            placeholder="Item do checklist..."
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => removeChecklist(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {checklistFields.length === 0 && (
                    <div className="text-sm text-muted-foreground italic px-2">Nenhum item no checklist</div>
                  )}
                </div>

                <Separator />

                {/* Attachments Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" /> Anexos
                    </FormLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={addAttachment}>
                      <Plus className="w-4 h-4 mr-1" /> Link
                    </Button>
                  </div>
                  {attachmentFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 group">
                      <FormField
                        control={form.control}
                        name={`attachments.${index}.name`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="h-8 w-1/3 text-xs"
                            placeholder="Nome do link..."
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`attachments.${index}.url`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="h-8 flex-1 text-xs font-mono"
                            placeholder="https://..."
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {attachmentFields.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.watch('attachments')?.map((att, i) => (
                        att.name && att.url ? (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-secondary px-2 py-1 rounded-md flex items-center gap-1 hover:bg-secondary/80 transition-colors"
                          >
                            <LinkIcon className="w-3 h-3" />
                            {att.name}
                          </a>
                        ) : null
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(prioridade => (
                              <SelectItem key={prioridade} value={prioridade}>
                                {PRIORIDADE_LABELS[prioridade]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Início</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy')
                                ) : (
                                  <span>Definir início</span>
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

                  {/* Due Date */}
                  <FormField
                    control={form.control}
                    name="data_vencimento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vencimento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy')
                                ) : (
                                  <span>Definir prazo</span>
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



                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parent Task Selection */}
                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tarefa Pai (Subtarefa de)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? allTarefas?.find((t) => t.id === field.value)?.titulo
                                  : "Selecione a tarefa pai"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar tarefa..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {allTarefas?.filter(t => t.id !== tarefa?.id).map((t) => (
                                    <CommandItem
                                      value={t.titulo}
                                      key={t.id}
                                      onSelect={() => {
                                        form.setValue("parent_id", t.id === field.value ? null : t.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          t.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {t.titulo}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dependencies Selection */}
                  <FormField
                    control={form.control}
                    name="dependencies"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Dependências (Bloqueado por)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  (!field.value || field.value.length === 0) && "text-muted-foreground"
                                )}
                              >
                                {field.value && field.value.length > 0
                                  ? `${field.value.length} tarefa(s) selecionada(s)`
                                  : "Selecione dependências"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar tarefa..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {allTarefas?.filter(t => t.id !== tarefa?.id).map((t) => (
                                    <CommandItem
                                      value={t.titulo}
                                      key={t.id}
                                      onSelect={() => {
                                        const current = field.value || [];
                                        const next = current.includes(t.id)
                                          ? current.filter((id) => id !== t.id)
                                          : [...current, t.id];
                                        form.setValue("dependencies", next);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value?.includes(t.id) ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {t.titulo}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Tags */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Digite e pressione Enter..."
                            onKeyDown={handleAddTag}
                            className="flex-1"
                          />
                        </div>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="gap-1">
                                {tag}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                                  onClick={() => handleRemoveTag(tag)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTarefa.isPending || updateTarefa.isPending}
              >
                {tarefa ? 'Salvar' : 'Criar Tarefa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  );
}
