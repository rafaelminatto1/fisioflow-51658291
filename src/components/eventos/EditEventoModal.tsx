import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventoUpdateSchema, EventoUpdate } from '@/lib/validations/evento';
import { useUpdateEvento } from '@/hooks/useEventos';

interface EditEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: any;
}

export function EditEventoModal({ open, onOpenChange, evento }: EditEventoModalProps) {
  const updateEvento = useUpdateEvento();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EventoUpdate>({
    resolver: zodResolver(eventoUpdateSchema),
  });

  useEffect(() => {
    if (evento) {
      reset({
        nome: evento.nome,
        descricao: evento.descricao || '',
        categoria: evento.categoria,
        local: evento.local,
        data_inicio: new Date(evento.data_inicio),
        data_fim: new Date(evento.data_fim),
        status: evento.status,
        gratuito: evento.gratuito,
        link_whatsapp: evento.link_whatsapp || '',
        valor_padrao_prestador: Number(evento.valor_padrao_prestador),
      });
    }
  }, [evento, reset]);

  const onSubmit = async (data: EventoUpdate) => {
    await updateEvento.mutateAsync({ id: evento.id, data });
    onOpenChange(false);
  };

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
              <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register('descricao')} rows={3} />
            {errors.descricao && (
              <p className="text-sm text-red-500 mt-1">{errors.descricao.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrida">Corrida</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="ativacao">Ativação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoria && (
                <p className="text-sm text-red-500 mt-1">{errors.categoria.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
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
                )}
              />
              {errors.status && (
                <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="local">Local *</Label>
            <Input id="local" {...register('local')} />
            {errors.local && (
              <p className="text-sm text-red-500 mt-1">{errors.local.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Controller
                name="data_inicio"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                )}
              />
              {errors.data_inicio && (
                <p className="text-sm text-red-500 mt-1">{errors.data_inicio.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="data_fim">Data de Fim *</Label>
              <Controller
                name="data_fim"
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                )}
              />
              {errors.data_fim && (
                <p className="text-sm text-red-500 mt-1">{errors.data_fim.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="gratuito"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="gratuito"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="gratuito" className="cursor-pointer">
              Evento gratuito
            </Label>
          </div>

          <div>
            <Label htmlFor="link_whatsapp">Link do WhatsApp</Label>
            <Input
              id="link_whatsapp"
              type="url"
              placeholder="https://chat.whatsapp.com/..."
              {...register('link_whatsapp')}
            />
            {errors.link_whatsapp && (
              <p className="text-sm text-red-500 mt-1">{errors.link_whatsapp.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="valor_padrao_prestador">Valor Padrão Prestador (R$)</Label>
            <Input
              id="valor_padrao_prestador"
              type="number"
              step="0.01"
              {...register('valor_padrao_prestador', { valueAsNumber: true })}
            />
            {errors.valor_padrao_prestador && (
              <p className="text-sm text-red-500 mt-1">
                {errors.valor_padrao_prestador.message}
              </p>
            )}
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
