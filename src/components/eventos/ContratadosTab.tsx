import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Edit, Plus, Trash2, X } from 'lucide-react';
import { ContratadoCombobox } from '@/components/ui/contratado-combobox';
import { usePermissions } from '@/hooks/usePermissions';
import {

  ContratadoCreate,
  contratadoCreateSchema,
  ContratadoUpdate,
  contratadoUpdateSchema,
} from '@/lib/validations/contratado';
import {
  EventoContratadoCreate,
  eventoContratadoCreateSchema,
  EventoContratadoUpdate,
  eventoContratadoUpdateSchema,
} from '@/lib/validations/evento-contratado';
import {
  useContratados,
  useCreateContratado,
  useDeleteContratado,
  useUpdateContratado,
} from '@/hooks/useContratados';
import {
  useEventoContratados,
  useCreateEventoContratado,
  useDeleteEventoContratado,
  useUpdateEventoContratado,
} from '@/hooks/useEventoContratados';

interface ContratadosTabProps {
  eventoId: string;
  evento?: {
    data_inicio?: string;
    data_fim?: string;
    hora_inicio?: string | null;
    hora_fim?: string | null;
  };
}

export function ContratadosTab({ eventoId, evento }: ContratadosTabProps) {
  const { canWrite, canDelete } = usePermissions();
  const { data: contratados = [] } = useContratados();
  const { data: eventoContratados = [], isLoading } = useEventoContratados(eventoId);
  const createContratado = useCreateContratado();
  const updateContratado = useUpdateContratado();
  const deleteContratado = useDeleteContratado();
  const createEventoContratado = useCreateEventoContratado();
  const updateEventoContratado = useUpdateEventoContratado();
  const deleteEventoContratado = useDeleteEventoContratado();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'existente' | 'novo'>('existente');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; contratadoId: string } | null>(null);

  const defaultInicio = evento?.hora_inicio || '08:00';
  const defaultFim = evento?.hora_fim || '17:00';

  const assignmentForm = useForm<EventoContratadoCreate>({
    resolver: zodResolver(eventoContratadoCreateSchema),
    defaultValues: {
      evento_id: eventoId,
      contratado_id: '',
      funcao: '',
      valor_acordado: 0,
      horario_inicio: defaultInicio,
      horario_fim: defaultFim,
      status_pagamento: 'PENDENTE',
    },
  });

  const contratadoForm = useForm<ContratadoCreate>({
    resolver: zodResolver(contratadoCreateSchema),
    defaultValues: {
      nome: '',
      contato: '',
      cpf_cnpj: '',
      especialidade: '',
      observacoes: '',
    },
  });

  const editAssignmentForm = useForm<EventoContratadoUpdate>({
    resolver: zodResolver(eventoContratadoUpdateSchema),
  });

  const editContratadoForm = useForm<ContratadoUpdate>({
    resolver: zodResolver(contratadoUpdateSchema),
  });

  const contratadosMap = useMemo(
    () => new Map(contratados.map((c) => [c.id, c])),
    [contratados]
  );

  const totals = useMemo(() => {
    const total = eventoContratados.reduce((sum, c) => sum + Number(c.valor_acordado || 0), 0);
    const pagos = eventoContratados
      .filter((c) => c.status_pagamento === 'PAGO')
      .reduce((sum, c) => sum + Number(c.valor_acordado || 0), 0);
    return { total, pagos, pendente: total - pagos };
  }, [eventoContratados]);

  const handleCreate = assignmentForm.handleSubmit(async (assignmentData) => {
    if (mode === 'existente') {
      if (!assignmentData.contratado_id) return;
      await createEventoContratado.mutateAsync(assignmentData);
      assignmentForm.reset({
        evento_id: eventoId,
        contratado_id: '',
        funcao: '',
        valor_acordado: 0,
        horario_inicio: defaultInicio,
        horario_fim: defaultFim,
        status_pagamento: 'PENDENTE',
      });
      setOpen(false);
      return;
    }

    const isValidContratado = await contratadoForm.trigger();
    if (!isValidContratado) return;

    const novoContratado = await createContratado.mutateAsync(contratadoForm.getValues());
    await createEventoContratado.mutateAsync({
      ...assignmentData,
      contratado_id: novoContratado.id,
    });
    contratadoForm.reset();
    assignmentForm.reset({
      evento_id: eventoId,
      contratado_id: '',
      funcao: '',
      valor_acordado: 0,
      horario_inicio: defaultInicio,
      horario_fim: defaultFim,
      status_pagamento: 'PENDENTE',
    });
    setOpen(false);
  });

  const openEdit = (id: string, contratadoId: string) => {
    const assignment = eventoContratados.find((c) => c.id === id);
    const contratado = contratadosMap.get(contratadoId);
    if (!assignment || !contratado) return;

    editAssignmentForm.reset({
      funcao: assignment.funcao || '',
      valor_acordado: Number(assignment.valor_acordado || 0),
      horario_inicio: assignment.horario_inicio,
      horario_fim: assignment.horario_fim,
      status_pagamento: assignment.status_pagamento || 'PENDENTE',
    });
    editContratadoForm.reset({
      nome: contratado.nome,
      contato: contratado.contato || '',
      cpf_cnpj: contratado.cpf_cnpj || '',
      especialidade: contratado.especialidade || '',
      observacoes: contratado.observacoes || '',
    });
    setEditing({ id, contratadoId });
    setEditOpen(true);
  };

  const handleEdit = editAssignmentForm.handleSubmit(async (assignment) => {
    if (!editing) return;
    const contratadoData = editContratadoForm.getValues();

    await updateEventoContratado.mutateAsync({
      id: editing.id,
      data: {
        ...assignment,
      },
      eventoId,
      contratadoId: editing.contratadoId,
    });

    await updateContratado.mutateAsync({
      id: editing.contratadoId,
      data: contratadoData,
    });

    setEditOpen(false);
    setEditing(null);
  });

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este contratado do evento?')) {
      await deleteEventoContratado.mutateAsync({ id, eventoId });
    }
  };

  const handleDeleteContratado = async (contratadoId: string) => {
    if (confirm('Deseja excluir este contratado? Isso pode afetar outros eventos.')) {
      await deleteContratado.mutateAsync(contratadoId);
    }
  };

  const handleTogglePagamento = async (assignmentId: string, contratadoId: string) => {
    const assignment = eventoContratados.find((c) => c.id === assignmentId);
    if (!assignment) return;
    await updateEventoContratado.mutateAsync({
      id: assignmentId,
      data: {
        status_pagamento: assignment.status_pagamento === 'PAGO' ? 'PENDENTE' : 'PAGO',
        horario_inicio: assignment.horario_inicio,
        horario_fim: assignment.horario_fim,
      },
      eventoId,
      contratadoId,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contratados</CardTitle>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-green-600">Pago: R$ {totals.pagos.toFixed(2)}</span>
            <span className="text-yellow-600">Pendente: R$ {totals.pendente.toFixed(2)}</span>
          </div>
        </div>
        {canWrite('eventos') && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contratado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Contratado no Evento</DialogTitle>
              </DialogHeader>
              <Tabs value={mode} onValueChange={(value) => setMode(value as 'existente' | 'novo')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existente">Selecionar existente</TabsTrigger>
                  <TabsTrigger value="novo">Cadastrar novo</TabsTrigger>
                </TabsList>

                <TabsContent value="existente" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Contratado</Label>
                    <ContratadoCombobox
                      contratados={contratados}
                      value={assignmentForm.watch('contratado_id')}
                      onValueChange={(value) => assignmentForm.setValue('contratado_id', value)}
                    />
                    {assignmentForm.formState.errors.contratado_id && (
                      <p className="text-sm text-destructive">
                        {assignmentForm.formState.errors.contratado_id.message}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="novo" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="novo-nome">Nome *</Label>
                      <Input id="novo-nome" {...contratadoForm.register('nome')} />
                      {contratadoForm.formState.errors.nome && (
                        <p className="text-sm text-destructive">
                          {contratadoForm.formState.errors.nome.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novo-contato">Contato</Label>
                      <Input id="novo-contato" {...contratadoForm.register('contato')} />
                      {contratadoForm.formState.errors.contato && (
                        <p className="text-sm text-destructive">
                          {contratadoForm.formState.errors.contato.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novo-cpf">CPF/CNPJ</Label>
                      <Input id="novo-cpf" {...contratadoForm.register('cpf_cnpj')} />
                      {contratadoForm.formState.errors.cpf_cnpj && (
                        <p className="text-sm text-destructive">
                          {contratadoForm.formState.errors.cpf_cnpj.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novo-especialidade">Especialidade</Label>
                      <Input id="novo-especialidade" {...contratadoForm.register('especialidade')} />
                      {contratadoForm.formState.errors.especialidade && (
                        <p className="text-sm text-destructive">
                          {contratadoForm.formState.errors.especialidade.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="novo-observacoes">Observações</Label>
                      <Textarea id="novo-observacoes" rows={3} {...contratadoForm.register('observacoes')} />
                      {contratadoForm.formState.errors.observacoes && (
                        <p className="text-sm text-destructive">
                          {contratadoForm.formState.errors.observacoes.message}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="funcao">Função</Label>
                  <Input id="funcao" {...assignmentForm.register('funcao')} />
                  {assignmentForm.formState.errors.funcao && (
                    <p className="text-sm text-destructive">
                      {assignmentForm.formState.errors.funcao.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor Acordado (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    {...assignmentForm.register('valor_acordado', { valueAsNumber: true })}
                  />
                  {assignmentForm.formState.errors.valor_acordado && (
                    <p className="text-sm text-destructive">
                      {assignmentForm.formState.errors.valor_acordado.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario_inicio">Horário Início *</Label>
                  <Input id="horario_inicio" type="time" {...assignmentForm.register('horario_inicio')} />
                  {assignmentForm.formState.errors.horario_inicio && (
                    <p className="text-sm text-destructive">
                      {assignmentForm.formState.errors.horario_inicio.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario_fim">Horário Fim *</Label>
                  <Input id="horario_fim" type="time" {...assignmentForm.register('horario_fim')} />
                  {assignmentForm.formState.errors.horario_fim && (
                    <p className="text-sm text-destructive">
                      {assignmentForm.formState.errors.horario_fim.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createEventoContratado.isPending || createContratado.isPending}>
                  {createEventoContratado.isPending || createContratado.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {(!evento?.hora_inicio || !evento?.hora_fim) && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Para evitar conflitos de horário, defina o horário do evento (início e fim).
          </div>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : eventoContratados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contratado cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventoContratados.map((item) => {
                const contratado = contratadosMap.get(item.contratado_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{contratado?.nome || 'Contratado removido'}</TableCell>
                    <TableCell>{contratado?.contato || '-'}</TableCell>
                    <TableCell>{item.funcao || '-'}</TableCell>
                    <TableCell>{item.horario_inicio} - {item.horario_fim}</TableCell>
                    <TableCell>R$ {Number(item.valor_acordado || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status_pagamento === 'PAGO' ? 'default' : 'secondary'}
                        className={canWrite('eventos') ? 'cursor-pointer' : ''}
                        onClick={() => canWrite('eventos') && handleTogglePagamento(item.id, item.contratado_id)}
                      >
                        {item.status_pagamento === 'PAGO' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        {item.status_pagamento}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite('eventos') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item.id, item.contratado_id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete('eventos') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Contratado</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input {...editContratadoForm.register('nome')} />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input {...editContratadoForm.register('contato')} />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input {...editContratadoForm.register('cpf_cnpj')} />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input {...editContratadoForm.register('especialidade')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} {...editContratadoForm.register('observacoes')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Função</Label>
                <Input {...editAssignmentForm.register('funcao')} />
              </div>
              <div className="space-y-2">
                <Label>Valor Acordado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...editAssignmentForm.register('valor_acordado', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário Início</Label>
                <Input type="time" {...editAssignmentForm.register('horario_inicio')} />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim</Label>
                <Input type="time" {...editAssignmentForm.register('horario_fim')} />
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-6">
              {canDelete('eventos') && editing && (
                <Button
                  variant="outline"
                  onClick={() => handleDeleteContratado(editing.contratadoId)}
                >
                  Excluir contratado
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEdit} disabled={updateEventoContratado.isPending || updateContratado.isPending}>
                  {updateEventoContratado.isPending || updateContratado.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
