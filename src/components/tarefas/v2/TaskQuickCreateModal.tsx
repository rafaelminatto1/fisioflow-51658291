import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Tarefa,
  TarefaStatus,
  TarefaPrioridade,
  TarefaTipo,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  TIPO_LABELS,
} from '@/types/tarefas';
import { useCreateTarefa } from '@/hooks/useTarefas';
import { useProjects } from '@/hooks/useProjects';

const quickCreateSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  status: z.enum(['BACKLOG', 'A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO', 'ARQUIVADO'] as const),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as const),
  tipo: z.enum(['TAREFA', 'BUG', 'FEATURE', 'MELHORIA', 'DOCUMENTACAO', 'REUNIAO'] as const),
  data_vencimento: z.date().optional().nullable(),
  project_id: z.string().optional().nullable(),
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
  defaultStatus = 'A_FAZER',
  defaultProjectId,
  initialData
}: TaskQuickCreateModalProps) {
  const createTarefa = useCreateTarefa();
  const { data: projects } = useProjects();

  const form = useForm<QuickCreateFormData>({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: {
      titulo: initialData?.titulo || '',
      descricao: initialData?.descricao || '',
      status: (initialData?.status as TarefaStatus) || defaultStatus,
      prioridade: (initialData?.prioridade as TarefaPrioridade) || 'MEDIA',
      tipo: (initialData?.tipo as TarefaTipo) || 'TAREFA',
      data_vencimento: initialData?.data_vencimento ? new Date(initialData.data_vencimento) : null,
      project_id: initialData?.project_id || defaultProjectId || null,
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        titulo: initialData?.titulo || '',
        descricao: initialData?.descricao || '',
        status: (initialData?.status as TarefaStatus) || defaultStatus,
        prioridade: (initialData?.prioridade as TarefaPrioridade) || 'MEDIA',
        tipo: (initialData?.tipo as TarefaTipo) || 'TAREFA',
        data_vencimento: initialData?.data_vencimento ? new Date(initialData.data_vencimento) : null,
        project_id: initialData?.project_id || defaultProjectId || null,
      });
    }
  }, [open, defaultStatus, defaultProjectId, initialData, form]);

  const onSubmit = async (data: QuickCreateFormData) => {
    try {
      await createTarefa.mutateAsync({
        titulo: data.titulo,
        descricao: data.descricao,
        status: data.status,
        prioridade: data.prioridade,
        tipo: data.tipo,
        data_vencimento: data.data_vencimento?.toISOString().split('T')[0],
        project_id: data.project_id,
        order_index: 0,
        tags: initialData?.tags || [],
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
            {/* Title */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o título da tarefa..."
                      {...field}
                      autoFocus
                    />
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
                          .filter(s => s !== 'ARQUIVADO')
                          .map(status => (
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
                        {(Object.keys(TIPO_LABELS) as TarefaTipo[]).map(tipo => (
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
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <Flag className="h-4 w-4 mr-2" />
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
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
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

            {/* Project */}
            {projects && projects.length > 0 && !defaultProjectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem projeto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sem projeto</SelectItem>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTarefa.isPending}>
                {createTarefa.isPending ? 'Criando...' : 'Criar Tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
