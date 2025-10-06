import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateEvento } from '@/hooks/useEventos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const updateSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  descricao: z.string().optional(),
  categoria: z.enum(['corrida', 'corporativo', 'ativacao', 'workshop', 'outro']),
  status: z.enum(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']),
  local: z.string().min(2, 'Local é obrigatório'),
  data_inicio: z.string(),
  data_fim: z.string(),
  gratuito: z.boolean(),
  link_whatsapp: z.string().optional(),
  valor_padrao_prestador: z.number().nonnegative().default(0),
});

type UpdateFormData = z.infer<typeof updateSchema>;

interface EditEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: {
    id: string;
    nome: string;
    descricao: string | null;
    categoria: string;
    status: string;
    local: string;
    data_inicio: string;
    data_fim: string;
    gratuito: boolean;
    link_whatsapp: string | null;
    valor_padrao_prestador: number;
  };
}

export function EditEventoModal({ open, onOpenChange, evento }: EditEventoModalProps) {
  const updateEvento = useUpdateEvento();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
  });

  useEffect(() => {
    if (evento) {
      reset({
        id: evento.id,
        nome: evento.nome,
        descricao: evento.descricao || '',
        categoria: evento.categoria as any,
        status: evento.status as any,
        local: evento.local,
        data_inicio: evento.data_inicio,
        data_fim: evento.data_fim,
        gratuito: evento.gratuito,
        link_whatsapp: evento.link_whatsapp || '',
        valor_padrao_prestador: Number(evento.valor_padrao_prestador),
      });
    }
  }, [evento, reset]);

  const onSubmit = async (formData: UpdateFormData) => {
    const { id, data_inicio, data_fim, ...rest } = formData;
    const data: any = {
      ...rest,
      data_inicio: data_inicio ? new Date(data_inicio) : undefined,
      data_fim: data_fim ? new Date(data_fim) : undefined,
    };
    await updateEvento.mutateAsync({ id, data });
    onOpenChange(false);
  };

  const categoria = watch('categoria');
  const status = watch('status');
  const gratuito = watch('gratuito');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome do Evento *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && (
              <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register('descricao')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={categoria}
                onValueChange={(value) => setValue('categoria', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrida">Corrida</SelectItem>
                  <SelectItem value="corporativo">Corporativo</SelectItem>
                  <SelectItem value="ativacao">Ativação</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENDADO">Agendado</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="local">Local *</Label>
            <Input id="local" {...register('local')} />
            {errors.local && (
              <p className="text-sm text-destructive mt-1">{errors.local.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_inicio">Data Início *</Label>
              <Input id="data_inicio" type="date" {...register('data_inicio')} />
            </div>

            <div>
              <Label htmlFor="data_fim">Data Fim *</Label>
              <Input id="data_fim" type="date" {...register('data_fim')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gratuito"
              checked={gratuito}
              onChange={(e) => setValue('gratuito', e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="gratuito" className="cursor-pointer">
              Evento Gratuito
            </Label>
          </div>

          <div>
            <Label htmlFor="link_whatsapp">Link WhatsApp</Label>
            <Input
              id="link_whatsapp"
              {...register('link_whatsapp')}
              placeholder="https://chat.whatsapp.com/..."
            />
          </div>

          <div>
            <Label htmlFor="valor_padrao_prestador">Valor Padrão Prestador (R$)</Label>
            <Input
              id="valor_padrao_prestador"
              type="number"
              step="0.01"
              {...register('valor_padrao_prestador', { valueAsNumber: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateEvento.isPending}>
              {updateEvento.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
