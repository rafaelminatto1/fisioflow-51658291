import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/web/ui/form';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { useCreateVoucher, useUpdateVoucher, type Voucher } from '@/hooks/useVouchers';
import { Switch } from '@/components/shared/ui/switch';
import { Loader2 } from 'lucide-react';

const voucherSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  descricao: z.string().optional(),
  tipo: z.enum(['pacote', 'mensal', 'trimestral', 'semestral']),
  sessoes: z.number().int().positive().optional().nullable(),
  validade_dias: z.number().int().positive().min(1, 'Mínimo 1 dia'),
  preco: z.number().positive('Preço deve ser maior que zero'),
  ativo: z.boolean().default(true),
});

type VoucherFormData = z.infer<typeof voucherSchema>;

interface VoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher?: Voucher;
}

export function VoucherModal({ open, onOpenChange, voucher }: VoucherModalProps) {
  const createVoucher = useCreateVoucher();
  const updateVoucher = useUpdateVoucher();
  const isEditing = !!voucher;

  const form = useForm<VoucherFormData>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      tipo: 'pacote',
      sessoes: null,
      validade_dias: 30,
      preco: 0,
      ativo: true,
    },
  });

  // Reset form when voucher changes
  useEffect(() => {
    if (voucher) {
      form.reset({
        nome: voucher.nome,
        descricao: voucher.descricao || '',
        tipo: voucher.tipo,
        sessoes: voucher.sessoes,
        validade_dias: voucher.validade_dias,
        preco: Number(voucher.preco),
        ativo: voucher.ativo,
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
        tipo: 'pacote',
        sessoes: null,
        validade_dias: 30,
        preco: 0,
        ativo: true,
      });
    }
  }, [voucher, form]);

  const tipo = form.watch('tipo');
  const isPending = createVoucher.isPending || updateVoucher.isPending;

  const onSubmit = async (data: VoucherFormData) => {
    if (isEditing) {
      await updateVoucher.mutateAsync({
        id: voucher.id,
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        sessoes: data.sessoes,
        validade_dias: data.validade_dias,
        preco: data.preco,
        ativo: data.ativo,
      });
    } else {
      await createVoucher.mutateAsync({
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        sessoes: data.sessoes,
        validade_dias: data.validade_dias,
        preco: data.preco,
        ativo: data.ativo,
        stripe_price_id: null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Voucher' : 'Novo Voucher'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados do voucher/plano' : 'Preencha os dados do voucher/plano'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pacote 4 Sessões" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do voucher"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pacote">Pacote</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tipo === 'pacote' && (
                <FormField
                  control={form.control}
                  name="sessoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Sessões</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validade_dias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      Voucher disponível para compra
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Voucher'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
