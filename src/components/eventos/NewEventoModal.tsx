import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateEvento } from '@/hooks/useEventos';
import { eventoCreateSchema, EventoCreate } from '@/lib/validations/evento';
import { Switch } from '@/components/ui/switch';

interface NewEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewEventoModal({ open, onOpenChange }: NewEventoModalProps) {
  const [isCalendarInicioOpen, setIsCalendarInicioOpen] = useState(false);
  const [isCalendarFimOpen, setIsCalendarFimOpen] = useState(false);
  const createEvento = useCreateEvento();

  const form = useForm<EventoCreate>({
    resolver: zodResolver(eventoCreateSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      categoria: 'corrida',
      local: '',
      data_inicio: new Date(),
      data_fim: new Date(),
      gratuito: false,
      link_whatsapp: '',
      valor_padrao_prestador: 0,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = form;

  const handleSave = async (data: EventoCreate) => {
    try {
      await createEvento.mutateAsync(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  const watchedDataInicio = watch('data_inicio');
  const watchedDataFim = watch('data_fim');
  const watchedGratuito = watch('gratuito');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nome">Nome do Evento *</Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex: Corrida de Rua 5K"
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  {...register('descricao')}
                  placeholder="Descrição do evento"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={watch('categoria')}
                  onValueChange={(value) => setValue('categoria', value as any)}
                >
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
                {errors.categoria && (
                  <p className="text-sm text-destructive">{errors.categoria.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="local">Local *</Label>
                <Input
                  id="local"
                  {...register('local')}
                  placeholder="Ex: Parque Ibirapuera"
                />
                {errors.local && (
                  <p className="text-sm text-destructive">{errors.local.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Datas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Popover open={isCalendarInicioOpen} onOpenChange={setIsCalendarInicioOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchedDataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedDataInicio ? (
                        format(watchedDataInicio, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        "Selecione uma data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedDataInicio}
                      onSelect={(date) => {
                        setValue('data_inicio', date || new Date());
                        setIsCalendarInicioOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_inicio && (
                  <p className="text-sm text-destructive">{String(errors.data_inicio.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Popover open={isCalendarFimOpen} onOpenChange={setIsCalendarFimOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchedDataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedDataFim ? (
                        format(watchedDataFim, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        "Selecione uma data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedDataFim}
                      onSelect={(date) => {
                        setValue('data_fim', date || new Date());
                        setIsCalendarFimOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.data_fim && (
                  <p className="text-sm text-destructive">{String(errors.data_fim.message)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configurações Financeiras */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configurações</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="gratuito"
                  checked={watchedGratuito}
                  onCheckedChange={(checked) => setValue('gratuito', checked)}
                />
                <Label htmlFor="gratuito">Evento Gratuito</Label>
              </div>

              {!watchedGratuito && (
                <div className="space-y-2">
                  <Label htmlFor="valor_padrao_prestador">Valor Padrão Prestador (R$)</Label>
                  <Input
                    id="valor_padrao_prestador"
                    type="number"
                    step="0.01"
                    {...register('valor_padrao_prestador', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.valor_padrao_prestador && (
                    <p className="text-sm text-destructive">{errors.valor_padrao_prestador.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="link_whatsapp">Link do WhatsApp</Label>
                <Input
                  id="link_whatsapp"
                  {...register('link_whatsapp')}
                  placeholder="https://wa.me/5511999999999"
                />
                {errors.link_whatsapp && (
                  <p className="text-sm text-destructive">{errors.link_whatsapp.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Criar Evento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
