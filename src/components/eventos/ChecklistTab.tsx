import { useState } from 'react';
import { useChecklist, useCreateChecklistItem, useDeleteChecklistItem, useToggleChecklistItem } from '@/hooks/useChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checklistItemCreateSchema, ChecklistItemCreate } from '@/lib/validations/checklist';

interface ChecklistTabProps {
  eventoId: string;
}

export function ChecklistTab({ eventoId }: ChecklistTabProps) {
  const [open, setOpen] = useState(false);
  const { data: items, isLoading } = useChecklist(eventoId);
  const createItem = useCreateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const toggleItem = useToggleChecklistItem();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ChecklistItemCreate>({
    resolver: zodResolver(checklistItemCreateSchema),
    defaultValues: {
      evento_id: eventoId,
      quantidade: 1,
      custo_unitario: 0,
    },
  });

  const onSubmit = async (data: ChecklistItemCreate) => {
    await createItem.mutateAsync(data);
    reset({ evento_id: eventoId, quantidade: 1, custo_unitario: 0 });
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este item?')) {
      await deleteItem.mutateAsync({ id, eventoId });
    }
  };

  const handleToggle = async (id: string) => {
    await toggleItem.mutateAsync({ id, eventoId });
  };

  const custoTotal = items?.reduce((sum, item) => sum + (Number(item.custo_unitario) * item.quantidade), 0) || 0;
  const totalPorTipo = items?.reduce((acc, item) => {
    const custo = Number(item.custo_unitario) * item.quantidade;
    acc[item.tipo] = (acc[item.tipo] || 0) + custo;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Checklist</CardTitle>
          <div className="flex gap-4 mt-2 text-sm">
            <span>Total: R$ {custoTotal.toFixed(2)}</span>
            {totalPorTipo && Object.entries(totalPorTipo).map(([tipo, valor]) => (
              <span key={tipo} className="text-muted-foreground">
                {tipo}: R$ {valor.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input id="titulo" {...register('titulo')} />
                {errors.titulo && (
                  <p className="text-sm text-red-500 mt-1">{errors.titulo.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="levar">Levar</SelectItem>
                        <SelectItem value="alugar">Alugar</SelectItem>
                        <SelectItem value="comprar">Comprar</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipo && (
                  <p className="text-sm text-red-500 mt-1">{errors.tipo.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  {...register('quantidade', { valueAsNumber: true })}
                />
                {errors.quantidade && (
                  <p className="text-sm text-red-500 mt-1">{errors.quantidade.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="custo_unitario">Custo Unitário *</Label>
                <Input
                  id="custo_unitario"
                  type="number"
                  step="0.01"
                  {...register('custo_unitario', { valueAsNumber: true })}
                />
                {errors.custo_unitario && (
                  <p className="text-sm text-red-500 mt-1">{errors.custo_unitario.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createItem.isPending}>
                  {createItem.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item no checklist.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">OK</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={item.status === 'OK'}
                      onCheckedChange={() => handleToggle(item.id)}
                    />
                  </TableCell>
                  <TableCell className={item.status === 'OK' ? 'line-through' : ''}>
                    {item.titulo}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.tipo}</Badge>
                  </TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>R$ {Number(item.custo_unitario).toFixed(2)}</TableCell>
                  <TableCell>R$ {(Number(item.custo_unitario) * item.quantidade).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
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
