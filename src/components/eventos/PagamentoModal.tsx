import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreatePagamento, useUpdatePagamento } from '@/hooks/usePagamentos';
import { pagamentoCreateSchema, type PagamentoCreate } from '@/lib/validations/pagamento';
import { cn } from '@/lib/utils';

interface PagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  pagamento?: any;
}

export function PagamentoModal({ open, onOpenChange, eventoId, pagamento }: PagamentoModalProps) {
  const [date, setDate] = useState<Date | undefined>(
    pagamento?.pago_em ? new Date(pagamento.pago_em) : new Date()
  );

  const createPagamento = useCreatePagamento();
  const updatePagamento = useUpdatePagamento();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PagamentoCreate & { pago_em: Date }>({
    resolver: zodResolver(pagamentoCreateSchema),
    defaultValues: pagamento
      ? {
          ...pagamento,
          pago_em: new Date(pagamento.pago_em),
        }
      : {
          evento_id: eventoId,
          tipo: 'outro',
          descricao: '',
          valor: 0,
          pago_em: new Date(),
          comprovante_url: '',
        },
  });

  const tipo = watch('tipo');

  const onSubmit = async (data: PagamentoCreate & { pago_em: Date }) => {
    try {
      if (pagamento) {
        await updatePagamento.mutateAsync({
          id: pagamento.id,
          data: { ...data, pago_em: date },
          eventoId,
        });
      } else {
        await createPagamento.mutateAsync({ ...data, pago_em: date! });
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving pagamento:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {pagamento ? 'Editar Pagamento' : 'Novo Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(value) => setValue('tipo', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prestador">Prestador</SelectItem>
                <SelectItem value="insumo">Insumo</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Pagamento fisioterapeuta João"
              {...register('descricao')}
            />
            {errors.descricao && (
              <p className="text-sm text-destructive">{errors.descricao.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('valor', { valueAsNumber: true })}
            />
            {errors.valor && (
              <p className="text-sm text-destructive">{errors.valor.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy') : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comprovante_url">URL do Comprovante (opcional)</Label>
            <Input
              id="comprovante_url"
              type="url"
              placeholder="https://..."
              {...register('comprovante_url')}
            />
            {errors.comprovante_url && (
              <p className="text-sm text-destructive">{errors.comprovante_url.message}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createPagamento.isPending || updatePagamento.isPending}
            >
              {createPagamento.isPending || updatePagamento.isPending
                ? 'Salvando...'
                : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
