import { useState } from 'react';
import { usePrestadores, useCreatePrestador, useDeletePrestador, useMarcarPagamento } from '@/hooks/usePrestadores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { prestadorCreateSchema, PrestadorCreate } from '@/lib/validations/prestador';

interface PrestadoresTabProps {
  eventoId: string;
}

export function PrestadoresTab({ eventoId }: PrestadoresTabProps) {
  const [open, setOpen] = useState(false);
  const { data: prestadores, isLoading } = usePrestadores(eventoId);
  const createPrestador = useCreatePrestador();
  const deletePrestador = useDeletePrestador();
  const marcarPagamento = useMarcarPagamento();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrestadorCreate>({
    resolver: zodResolver(prestadorCreateSchema),
    defaultValues: {
      evento_id: eventoId,
      valor_acordado: 0,
    },
  });

  const onSubmit = async (data: PrestadorCreate) => {
    await createPrestador.mutateAsync(data);
    reset({ evento_id: eventoId, valor_acordado: 0 });
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este prestador?')) {
      await deletePrestador.mutateAsync({ id, eventoId });
    }
  };

  const handleTogglePagamento = async (id: string) => {
    await marcarPagamento.mutateAsync({ id, eventoId });
  };

  const totalPago = prestadores?.filter(p => p.status_pagamento === 'PAGO')
    .reduce((sum, p) => sum + Number(p.valor_acordado), 0) || 0;

  const totalPendente = prestadores?.filter(p => p.status_pagamento === 'PENDENTE')
    .reduce((sum, p) => sum + Number(p.valor_acordado), 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Prestadores</CardTitle>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-green-600">Pago: R$ {totalPago.toFixed(2)}</span>
            <span className="text-yellow-600">Pendente: R$ {totalPendente.toFixed(2)}</span>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Prestador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Prestador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" {...register('nome')} />
                {errors.nome && (
                  <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contato">Contato</Label>
                <Input id="contato" {...register('contato')} />
                {errors.contato && (
                  <p className="text-sm text-red-500 mt-1">{errors.contato.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input id="cpf_cnpj" {...register('cpf_cnpj')} />
                {errors.cpf_cnpj && (
                  <p className="text-sm text-red-500 mt-1">{errors.cpf_cnpj.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="valor_acordado">Valor Acordado *</Label>
                <Input
                  id="valor_acordado"
                  type="number"
                  step="0.01"
                  {...register('valor_acordado', { valueAsNumber: true })}
                />
                {errors.valor_acordado && (
                  <p className="text-sm text-red-500 mt-1">{errors.valor_acordado.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPrestador.isPending}>
                  {createPrestador.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !prestadores || prestadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum prestador cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prestadores.map((prestador) => (
                <TableRow key={prestador.id}>
                  <TableCell>{prestador.nome}</TableCell>
                  <TableCell>{prestador.contato || '-'}</TableCell>
                  <TableCell>{prestador.cpf_cnpj || '-'}</TableCell>
                  <TableCell>R$ {Number(prestador.valor_acordado).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={prestador.status_pagamento === 'PAGO' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleTogglePagamento(prestador.id)}
                    >
                      {prestador.status_pagamento === 'PAGO' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {prestador.status_pagamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(prestador.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
