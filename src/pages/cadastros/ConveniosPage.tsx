import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Switch } from '@/components/shared/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/shared/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/web/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { Plus, Pencil, Trash2, Building2, Search, Phone, Mail } from 'lucide-react';
import { useConvenios, useCreateConvenio, useUpdateConvenio, useDeleteConvenio, Convenio, ConvenioFormData } from '@/hooks/useConvenios';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Badge } from '@/components/shared/ui/badge';

const defaultFormData: ConvenioFormData = {
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  contato_responsavel: '',
  valor_repasse: 0,
  prazo_pagamento_dias: 30,
  observacoes: '',
  ativo: true,
};

export default function ConveniosPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Convenio | null>(null);
  const [formData, setFormData] = useState<ConvenioFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: convenios, isLoading } = useConvenios();
  const createMutation = useCreateConvenio();
  const updateMutation = useUpdateConvenio();
  const deleteMutation = useDeleteConvenio();

  const filteredData = convenios?.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : item.ativo;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (item?: Convenio) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        cnpj: item.cnpj || '',
        telefone: item.telefone || '',
        email: item.email || '',
        contato_responsavel: item.contato_responsavel || '',
        valor_repasse: item.valor_repasse,
        prazo_pagamento_dias: item.prazo_pagamento_dias,
        observacoes: item.observacoes || '',
        ativo: item.ativo,
      });
    } else {
      setEditingItem(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Convênios
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie planos de saúde e convênios
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Convênio
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar convênio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  id="show-inactive"
                />
                <Label htmlFor="show-inactive" className="text-sm">
                  Mostrar inativos
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Contato</TableHead>
                      <TableHead className="hidden lg:table-cell">Valor Repasse</TableHead>
                      <TableHead className="hidden lg:table-cell">Prazo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum convênio encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.nome}</span>
                              {item.cnpj && (
                                <p className="text-xs text-muted-foreground">{item.cnpj}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="space-y-1">
                              {item.telefone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="h-3 w-3" /> {item.telefone}
                                </div>
                              )}
                              {item.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="h-3 w-3" /> {item.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatCurrency(item.valor_repasse)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {item.prazo_pagamento_dias} dias
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.ativo ? 'default' : 'secondary'}>
                              {item.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Deseja remover o convênio "{item.nome}"?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Convênio' : 'Novo Convênio'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do convênio/plano de saúde
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Unimed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@convenio.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato">Contato Responsável</Label>
                <Input
                  id="contato"
                  value={formData.contato_responsavel || ''}
                  onChange={(e) => setFormData({ ...formData, contato_responsavel: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_repasse">Valor Repasse (R$)</Label>
                <Input
                  id="valor_repasse"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_repasse}
                  onChange={(e) => setFormData({ ...formData, valor_repasse: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo Pagamento (dias)</Label>
                <Input
                  id="prazo"
                  type="number"
                  min="0"
                  value={formData.prazo_pagamento_dias}
                  onChange={(e) => setFormData({ ...formData, prazo_pagamento_dias: parseInt(e.target.value) || 0 })}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                id="ativo"
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.nome || createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
