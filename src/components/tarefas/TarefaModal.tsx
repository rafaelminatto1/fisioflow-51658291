import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Tag, X } from 'lucide-react';
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
import { 
  Tarefa, 
  TarefaStatus, 
  TarefaPrioridade,
  STATUS_LABELS, 
  PRIORIDADE_LABELS,
  useCreateTarefa,
  useUpdateTarefa 
} from '@/hooks/useTarefas';

const tarefaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  status: z.enum(['A_FAZER', 'EM_PROGRESSO', 'REVISAO', 'CONCLUIDO']),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']),
  data_vencimento: z.date().optional().nullable(),
  tags: z.array(z.string()).default([])
});

type TarefaFormData = z.infer<typeof tarefaSchema>;

interface TarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa?: Tarefa | null;
  defaultStatus?: TarefaStatus;
}

export function TarefaModal({ open, onOpenChange, tarefa, defaultStatus = 'A_FAZER' }: TarefaModalProps) {
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  
  const form = useForm<TarefaFormData>({
    resolver: zodResolver(tarefaSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      status: defaultStatus,
      prioridade: 'MEDIA',
      data_vencimento: null,
      tags: []
    }
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
        tags: tarefa.tags || []
      });
    } else {
      form.reset({
        titulo: '',
        descricao: '',
        status: defaultStatus,
        prioridade: 'MEDIA',
        data_vencimento: null,
        tags: []
      });
    }
  }, [tarefa, defaultStatus, form]);

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

  const onSubmit = async (data: TarefaFormData) => {
    try {
      if (tarefa) {
        await updateTarefa.mutateAsync({
          id: tarefa.id,
          ...data,
          data_vencimento: data.data_vencimento?.toISOString().split('T')[0]
        });
      } else {
        await createTarefa.mutateAsync({
          ...data,
          data_vencimento: data.data_vencimento?.toISOString().split('T')[0]
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled in hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
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
                    <Input placeholder="Digite o título da tarefa..." {...field} />
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

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Due Date */}
            <FormField
              control={form.control}
              name="data_vencimento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
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
                            <span>Selecione uma data</span>
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
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
    </Dialog>
  );
}
