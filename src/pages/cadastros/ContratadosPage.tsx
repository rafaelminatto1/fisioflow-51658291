import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, UserCheck, Phone, IdCard } from 'lucide-react';
import { useForm } from 'react-hook-form';

  useContratados,
  useCreateContratado,
  useUpdateContratado,
  useDeleteContratado,
  type Contratado,
} from '@/hooks/useContratados';
import type { ContratadoCreate, ContratadoUpdate } from '@/lib/validations/contratado';

export default function ContratadosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [especialidadeFiltro, setEspecialidadeFiltro] = useState('todas');
  const [comDocumento, setComDocumento] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContratado, setEditingContratado] = useState<Contratado | null>(null);

  const { data: contratados = [], isLoading } = useContratados();
  const createContratado = useCreateContratado();
  const updateContratado = useUpdateContratado();
  const deleteContratado = useDeleteContratado();

  const { register, handleSubmit, reset } = useForm<ContratadoCreate>({
    defaultValues: {
      nome: '',
      contato: '',
      cpf_cnpj: '',
      especialidade: '',
      observacoes: '',
    },
  });

  const especialidades = Array.from(
    new Set(contratados.map((c) => c.especialidade).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const filtered = contratados.filter((c) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      c.nome.toLowerCase().includes(term) ||
      (c.contato || '').toLowerCase().includes(term) ||
      (c.cpf_cnpj || '').toLowerCase().includes(term) ||
      (c.especialidade || '').toLowerCase().includes(term)
    );
    const matchesEspecialidade = especialidadeFiltro === 'todas'
      ? true
      : (c.especialidade || '') === especialidadeFiltro;
    const matchesDocumento = comDocumento ? Boolean(c.cpf_cnpj) : true;
    return matchesSearch && matchesEspecialidade && matchesDocumento;
  });

  const openCreateModal = () => {
    reset({
      nome: '',
      contato: '',
      cpf_cnpj: '',
      especialidade: '',
      observacoes: '',
    });
    setEditingContratado(null);
    setIsModalOpen(true);
  };

  const openEditModal = (contratado: Contratado) => {
    reset({
      nome: contratado.nome,
      contato: contratado.contato || '',
      cpf_cnpj: contratado.cpf_cnpj || '',
      especialidade: contratado.especialidade || '',
      observacoes: contratado.observacoes || '',
    });
    setEditingContratado(contratado);
    setIsModalOpen(true);
  };

  const onSubmit = (data: ContratadoCreate | ContratadoUpdate) => {
    if (editingContratado) {
      updateContratado.mutate(
        { id: editingContratado.id, data: data as ContratadoUpdate },
        { onSuccess: () => setIsModalOpen(false) }
      );
      return;
    }
    createContratado.mutate(data as ContratadoCreate, {
      onSuccess: () => setIsModalOpen(false),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este contratado?')) {
      deleteContratado.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              Contratados
            </h1>
            <p className="text-muted-foreground">Cadastro global de prestadores contratados para eventos</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contratado
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contratado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={especialidadeFiltro} onValueChange={setEspecialidadeFiltro}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as especialidades</SelectItem>
                    {especialidades.map((especialidade) => (
                      <SelectItem key={especialidade} value={especialidade}>
                        {especialidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch checked={comDocumento} onCheckedChange={setComDocumento} />
                  <span className="text-sm text-muted-foreground">Com CPF/CNPJ</span>
                </div>
                <Badge variant="secondary">{filtered.length} contratado(s)</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum contratado cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((contratado) => (
                    <TableRow key={contratado.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contratado.nome}</p>
                          {contratado.cpf_cnpj && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <IdCard className="h-3 w-3" />
                              {contratado.cpf_cnpj}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contratado.contato ? (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contratado.contato}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contratado.especialidade ? (
                          <Badge variant="secondary">{contratado.especialidade}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(contratado)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(contratado.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContratado ? 'Editar Contratado' : 'Novo Contratado'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input {...register('nome', { required: true })} />
                </div>

                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input {...register('contato')} placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input {...register('cpf_cnpj')} placeholder="000.000.000-00" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Especialidade</Label>
                  <Input {...register('especialidade')} placeholder="Ex: Fisioterapeuta, Massoterapeuta" />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea {...register('observacoes')} rows={3} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createContratado.isPending || updateContratado.isPending}>
                  {editingContratado ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
