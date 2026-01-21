import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import { Calendar } from '@/components/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shared/ui/popover';
import { Card } from '@/components/shared/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateEvento } from '@/hooks/useEventos';
import { eventoCreateSchema, EventoCreate } from '@/lib/validations/evento';
import { Switch } from '@/components/shared/ui/switch';
import { useEventoTemplates } from '@/hooks/useEventoTemplates';

interface NewEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewEventoModal({ open, onOpenChange }: NewEventoModalProps) {
  const [isCalendarInicioOpen, setIsCalendarInicioOpen] = useState(false);
  const [isCalendarFimOpen, setIsCalendarFimOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const createEvento = useCreateEvento();
  const { data: templates, isLoading: isLoadingTemplates } = useEventoTemplates();

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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setValue('nome', template.nome);
      setValue('descricao', template.descricao || '');
      setValue('categoria', template.categoria as 'corrida' | 'corporativo' | 'ativacao' | 'workshop' | 'outro');
      setValue('gratuito', template.gratuito);
      setValue('valor_padrao_prestador', template.valor_padrao_prestador || 0);
      setShowTemplates(false);
    }
  };

  const handleSave = async (data: EventoCreate) => {
    try {
      await createEvento.mutateAsync(data);
      reset();
      setShowTemplates(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  const watchedDataInicio = watch('data_inicio');
  const watchedDataFim = watch('data_fim');
  const watchedGratuito = watch('gratuito');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setShowTemplates(true);
        reset();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Novo Evento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {showTemplates && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Escolha um template para começar mais rápido:</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {isLoadingTemplates && (
                  <p className="text-sm text-muted-foreground col-span-2">Carregando templates...</p>
                )}
                {!isLoadingTemplates && templates && templates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <h4 className="font-semibold mb-1">{template.nome}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{template.descricao}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {template.categoria}
                      </span>
                      <span className="text-muted-foreground">
                        R$ {template.valor_padrao_prestador}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!showTemplates && (
            <form id="new-evento-form" onSubmit={handleSubmit(handleSave)} className="space-y-6">
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
                      onValueChange={(value) => setValue('categoria', value as 'corrida' | 'corporativo' | 'ativacao' | 'workshop' | 'outro')}
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
            </form>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 pt-2 border-t mt-auto bg-background">
          {showTemplates ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTemplates(false)}
            >
              Criar do zero
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplates(true)}
              >
                Voltar aos templates
              </Button>

              <Button
                type="submit"
                form="new-evento-form"
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
