import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {

  CalendarIcon,
  Tag,
  X,
  CheckSquare,
  Paperclip,
  Plus,
  Trash2,
  Flag,
  Users,
  MessageSquare,
  Link2,
  Clock,
  Activity,
  BookOpen,
  Upload,
  ExternalLink,
  Send,
  FileText,
  Image,
  Video,
  File,
  Check,
  ChevronsUpDown,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  TeamMember,
  TarefaAttachment,
  TarefaReference,
  TarefaChecklist,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
  PRIORIDADE_COLORS,
  STATUS_COLORS,
} from '@/types/tarefas';
import { useUpdateTarefa, useTarefas } from '@/hooks/useTarefas';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.enum(['file', 'link', 'image', 'video', 'document']),
  size: z.number().optional(),
  created_at: z.string()
});

const referenceSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Título é obrigatório'),
  url: z.string().optional(),
  author: z.string().optional(),
  year: z.string().optional(),
  type: z.enum(['article', 'book', 'website', 'video', 'internal', 'other']),
  description: z.string().optional(),
  created_at: z.string()
});

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  due_date: z.string().optional(),
  assignee_id: z.string().optional()
});

const checklistSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(checklistItemSchema)
});

const tarefaDetailSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  status: z.enum(['BACKLOG', 'A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO', 'ARQUIVADO'] as const),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as const),
  tipo: z.enum(['TAREFA', 'BUG', 'FEATURE', 'MELHORIA', 'DOCUMENTACAO', 'REUNIAO'] as const),
  data_vencimento: z.date().optional().nullable(),
  start_date: z.date().optional().nullable(),
  tags: z.array(z.string()).default([]),
  project_id: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  responsavel_id: z.string().optional().nullable(),
  checklists: z.array(checklistSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  references: z.array(referenceSchema).optional(),
  dependencies: z.array(z.string()).default([]),
});

type TarefaDetailFormData = z.infer<typeof tarefaDetailSchema>;

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: Tarefa | null;
  teamMembers: TeamMember[];
}

export function TaskDetailModal({
  open,
  onOpenChange,
  tarefa,
  teamMembers
}: TaskDetailModalProps) {
  const updateTarefa = useUpdateTarefa();
  const { data: projects } = useProjects();
  const { data: allTarefas } = useTarefas();

  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const form = useForm<TarefaDetailFormData>({
    resolver: zodResolver(tarefaDetailSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      status: 'A_FAZER',
      prioridade: 'MEDIA',
      tipo: 'TAREFA',
      data_vencimento: null,
      start_date: null,
      tags: [],
      project_id: null,
      parent_id: null,
      responsavel_id: null,
      checklists: [],
      attachments: [],
      references: [],
      dependencies: []
    }
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist, update: updateChecklist } = useFieldArray({
    control: form.control,
    name: "checklists"
  });

  const { fields: attachmentFields, append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control: form.control,
    name: "attachments"
  });

  const { fields: referenceFields, append: appendReference, remove: removeReference } = useFieldArray({
    control: form.control,
    name: "references"
  });

  const tags = form.watch('tags');

  useEffect(() => {
    if (tarefa) {
      form.reset({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || '',
        status: tarefa.status,
        prioridade: tarefa.prioridade,
        tipo: tarefa.tipo || 'TAREFA',
        data_vencimento: tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null,
        start_date: tarefa.start_date ? new Date(tarefa.start_date) : null,
        tags: tarefa.tags || [],
        project_id: tarefa.project_id || null,
        parent_id: tarefa.parent_id || null,
        responsavel_id: tarefa.responsavel_id || null,
        checklists: tarefa.checklists || [],
        attachments: tarefa.attachments || [],
        references: tarefa.references || [],
        dependencies: tarefa.dependencies || []
      });
    }
  }, [tarefa, form]);

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

  const addChecklist = () => {
    if (newChecklistTitle.trim()) {
      appendChecklist({
        id: crypto.randomUUID(),
        title: newChecklistTitle,
        items: []
      });
      setNewChecklistTitle('');
    }
  };

  const addChecklistItem = (checklistIndex: number) => {
    const checklist = checklistFields[checklistIndex];
    const updatedItems = [
      ...checklist.items,
      { id: crypto.randomUUID(), text: '', completed: false }
    ];
    updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
  };

  const updateChecklistItem = (checklistIndex: number, itemIndex: number, updates: Partial<{ text: string; completed: boolean }>) => {
    const checklist = checklistFields[checklistIndex];
    const updatedItems = [...checklist.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
    updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
  };

  const removeChecklistItem = (checklistIndex: number, itemIndex: number) => {
    const checklist = checklistFields[checklistIndex];
    const updatedItems = checklist.items.filter((_, i) => i !== itemIndex);
    updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
  };

  const addAttachment = (type: 'link' | 'file') => {
    appendAttachment({
      id: crypto.randomUUID(),
      name: '',
      url: '',
      type,
      created_at: new Date().toISOString()
    });
  };

  const addReference = () => {
    appendReference({
      id: crypto.randomUUID(),
      title: '',
      url: '',
      author: '',
      year: '',
      type: 'article',
      description: '',
      created_at: new Date().toISOString()
    });
  };

  // Calculate checklist progress
  const checklistProgress = useMemo(() => {
    const checklists = form.watch('checklists') || [];
    const totalItems = checklists.reduce((acc, cl) => acc + cl.items.length, 0);
    const completedItems = checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0);
    return totalItems > 0 ? { completed: completedItems, total: totalItems, percent: (completedItems / totalItems) * 100 } : null;
  }, [form.watch('checklists')]);

  const onSubmit = async (data: TarefaDetailFormData) => {
    if (!tarefa) return;

    try {
      await updateTarefa.mutateAsync({
        id: tarefa.id,
        titulo: data.titulo,
        descricao: data.descricao,
        status: data.status,
        prioridade: data.prioridade,
        tipo: data.tipo,
        project_id: data.project_id,
        parent_id: data.parent_id,
        responsavel_id: data.responsavel_id,
        data_vencimento: data.data_vencimento?.toISOString().split('T')[0],
        start_date: data.start_date?.toISOString().split('T')[0],
        tags: data.tags,
        checklists: data.checklists,
        attachments: data.attachments,
        references: data.references,
        dependencies: data.dependencies,
        ...(data.status === 'CONCLUIDO' && !tarefa.completed_at
          ? { completed_at: new Date().toISOString() }
          : {})
      });
      toast.success('Tarefa atualizada com sucesso!');
    } catch {
      // Error handled in hook
    }
  };

  // Auto-save on blur
  const handleAutoSave = () => {
    if (form.formState.isDirty) {
      form.handleSubmit(onSubmit)();
    }
  };

  if (!tarefa) return null;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn('text-xs', STATUS_COLORS[tarefa.status].bg, STATUS_COLORS[tarefa.status].text)}>
                  {STATUS_LABELS[tarefa.status]}
                </Badge>
                <Badge className={cn('text-xs', PRIORIDADE_COLORS[tarefa.prioridade])}>
                  <Flag className="h-3 w-3 mr-1" />
                  {PRIORIDADE_LABELS[tarefa.prioridade]}
                </Badge>
              </div>
              <SheetTitle className="text-xl">{tarefa.titulo}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Criado {formatDistanceToNow(new Date(tarefa.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-4">
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="checklists">
              <CheckSquare className="h-4 w-4 mr-2" />
              Checklists
              {checklistProgress && (
                <span className="ml-1 text-xs">({checklistProgress.completed}/{checklistProgress.total})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Anexos
              {attachmentFields.length > 0 && (
                <span className="ml-1 text-xs">({attachmentFields.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="references">
              <BookOpen className="h-4 w-4 mr-2" />
              Referências
              {referenceFields.length > 0 && (
                <span className="ml-1 text-xs">({referenceFields.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 px-6">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-4 space-y-6 pb-6">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input {...field} onBlur={handleAutoSave} />
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
                            className="resize-none min-h-[100px]"
                            {...field}
                            onBlur={handleAutoSave}
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
                          <Select
                            onValueChange={(v) => { field.onChange(v); handleAutoSave(); }}
                            value={field.value}
                          >
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

                    {/* Priority */}
                    <FormField
                      control={form.control}
                      name="prioridade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridade</FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v); handleAutoSave(); }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(PRIORIDADE_LABELS) as TarefaPrioridade[]).map(p => (
                                <SelectItem key={p} value={p}>
                                  {PRIORIDADE_LABELS[p]}
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
                    {/* Type */}
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v); handleAutoSave(); }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(Object.keys(TIPO_LABELS) as TarefaTipo[]).map(t => (
                                <SelectItem key={t} value={t}>
                                  {TIPO_LABELS[t]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Assignee */}
                    <FormField
                      control={form.control}
                      name="responsavel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v === 'none' ? null : v); handleAutoSave(); }}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Nenhum" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Nenhum
                                </div>
                              </SelectItem>
                              {teamMembers.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={member.avatar_url} />
                                      <AvatarFallback className="text-[10px]">
                                        {member.full_name?.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.full_name}
                                  </div>
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
                    {/* Start Date */}
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Início</FormLabel>
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
                                  {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Definir início</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={(d) => { field.onChange(d); handleAutoSave(); }}
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
                          <FormLabel>Prazo</FormLabel>
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
                                  {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Definir prazo</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={(d) => { field.onChange(d); handleAutoSave(); }}
                                initialFocus
                              />
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
                              onBlur={handleAutoSave}
                            />
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="gap-1">
                                  {tag}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => { handleRemoveTag(tag); handleAutoSave(); }}
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

                  {/* Project */}
                  {projects && projects.length > 0 && (
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeto</FormLabel>
                          <Select
                            onValueChange={(v) => { field.onChange(v === 'none' ? null : v); handleAutoSave(); }}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sem projeto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sem projeto</SelectItem>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* Checklists Tab */}
                <TabsContent value="checklists" className="mt-4 space-y-4 pb-6">
                  {/* Progress */}
                  {checklistProgress && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progresso</span>
                          <span className="text-sm text-muted-foreground">
                            {checklistProgress.completed}/{checklistProgress.total} ({Math.round(checklistProgress.percent)}%)
                          </span>
                        </div>
                        <Progress value={checklistProgress.percent} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Add Checklist */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nome do checklist..."
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                    />
                    <Button type="button" onClick={addChecklist} disabled={!newChecklistTitle.trim()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {/* Checklists */}
                  {checklistFields.map((checklist, checklistIndex) => (
                    <Card key={checklist.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            {checklist.title}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChecklist(checklistIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {checklist.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex items-center gap-2 group">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) => {
                                updateChecklistItem(checklistIndex, itemIndex, { completed: !!checked });
                                handleAutoSave();
                              }}
                            />
                            <Input
                              value={item.text}
                              onChange={(e) => updateChecklistItem(checklistIndex, itemIndex, { text: e.target.value })}
                              onBlur={handleAutoSave}
                              className={cn(
                                "h-8 flex-1 border-none focus-visible:ring-1 bg-transparent",
                                item.completed && "line-through text-muted-foreground"
                              )}
                              placeholder="Item do checklist..."
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={() => { removeChecklistItem(checklistIndex, itemIndex); handleAutoSave(); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => addChecklistItem(checklistIndex)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar item
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {checklistFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhum checklist ainda</p>
                      <p className="text-sm">Adicione checklists para organizar subtarefas</p>
                    </div>
                  )}
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="mt-4 space-y-4 pb-6">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => addAttachment('link')}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Adicionar Link
                    </Button>
                    <Button type="button" variant="outline" onClick={() => addAttachment('file')}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Arquivo
                    </Button>
                  </div>

                  {attachmentFields.map((attachment, index) => (
                    <Card key={attachment.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="flex-1 space-y-2">
                            <FormField
                              control={form.control}
                              name={`attachments.${index}.name`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="Nome do anexo..."
                                  className="h-8"
                                  onBlur={handleAutoSave}
                                />
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`attachments.${index}.url`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  placeholder="URL..."
                                  className="h-8 font-mono text-xs"
                                  onBlur={handleAutoSave}
                                />
                              )}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {attachment.url && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(attachment.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { removeAttachment(index); handleAutoSave(); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {attachmentFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhum anexo ainda</p>
                      <p className="text-sm">Adicione links ou arquivos relacionados à tarefa</p>
                    </div>
                  )}
                </TabsContent>

                {/* References Tab */}
                <TabsContent value="references" className="mt-4 space-y-4 pb-6">
                  <Button type="button" onClick={addReference}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Referência
                  </Button>

                  {referenceFields.map((reference, index) => (
                    <Card key={reference.id}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <FormField
                            control={form.control}
                            name={`references.${index}.type`}
                            render={({ field }) => (
                              <Select
                                onValueChange={(v) => { field.onChange(v); handleAutoSave(); }}
                                value={field.value}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="article">Artigo</SelectItem>
                                  <SelectItem value="book">Livro</SelectItem>
                                  <SelectItem value="website">Website</SelectItem>
                                  <SelectItem value="video">Vídeo</SelectItem>
                                  <SelectItem value="internal">Interno</SelectItem>
                                  <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => { removeReference(index); handleAutoSave(); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`references.${index}.title`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Título da referência..."
                              onBlur={handleAutoSave}
                            />
                          )}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            control={form.control}
                            name={`references.${index}.author`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                placeholder="Autor(es)..."
                                onBlur={handleAutoSave}
                              />
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`references.${index}.year`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                placeholder="Ano..."
                                onBlur={handleAutoSave}
                              />
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`references.${index}.url`}
                          render={({ field }) => (
                            <div className="flex items-center gap-2">
                              <Input
                                {...field}
                                placeholder="URL (opcional)..."
                                className="font-mono text-xs"
                                onBlur={handleAutoSave}
                              />
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(field.value, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`references.${index}.description`}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              placeholder="Descrição ou notas..."
                              className="resize-none"
                              rows={2}
                              onBlur={handleAutoSave}
                            />
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  {referenceFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma referência bibliográfica</p>
                      <p className="text-sm">Adicione artigos, livros ou outras referências</p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>

              {/* Footer */}
              <div className="p-6 pt-4 border-t bg-background">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Alterações são salvas automaticamente
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Fechar
                    </Button>
                    <Button type="submit" disabled={updateTarefa.isPending}>
                      {updateTarefa.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
