import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Phone,
  Mail
} from 'lucide-react';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeleteFornecedor, Fornecedor, FornecedorFormData } from '@/hooks/useFornecedores';
import { useForm } from 'react-hook-form';

const categorias = ['Materiais', 'Equipamentos', 'Serviços', 'Manutenção', 'Limpeza', 'Outro'];

export default function FornecedoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  const { data: fornecedores, isLoading } = useFornecedores();
  const createFornecedor = useCreateFornecedor();
  const updateFornecedor = useUpdateFornecedor();
  const deleteFornecedor = useDeleteFornecedor();

  const { register, handleSubmit, reset, setValue, watch } = useForm<FornecedorFormData>({
    defaultValues: {
      tipo_pessoa: 'pj',
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      celular: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      categoria: '',
      observacoes: '',
      ativo: true,
      organization_id: null,
      inscricao_estadual: null,
    },
  });

  const filteredFornecedores = fornecedores?.filter(f => 
    f.razao_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.nome_fantasia?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    reset({
      tipo_pessoa: 'pj',
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      celular: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      categoria: '',
      observacoes: '',
      ativo: true,
      organization_id: null,
      inscricao_estadual: null,
    });
    setEditingFornecedor(null);
    setIsModalOpen(true);
  };

  const openEditModal = (fornecedor: Fornecedor) => {
    reset({
      tipo_pessoa: fornecedor.tipo_pessoa,
      razao_social: fornecedor.razao_social,
      nome_fantasia: fornecedor.nome_fantasia || '',
      cpf_cnpj: fornecedor.cpf_cnpj || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      celular: fornecedor.celular || '',
      endereco: fornecedor.endereco || '',
      cidade: fornecedor.cidade || '',
      estado: fornecedor.estado || '',
      cep: fornecedor.cep || '',
      categoria: fornecedor.categoria || '',
      observacoes: fornecedor.observacoes || '',
      ativo: fornecedor.ativo,
      organization_id: fornecedor.organization_id,
      inscricao_estadual: fornecedor.inscricao_estadual,
    });
    setEditingFornecedor(fornecedor);
    setIsModalOpen(true);
  };

  const onSubmit = (data: FornecedorFormData) => {
    if (editingFornecedor) {
      updateFornecedor.mutate({ id: editingFornecedor.id, ...data }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createFornecedor.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este fornecedor?')) {
      deleteFornecedor.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Fornecedores
            </h1>
            <p className="text-muted-foreground">Gerencie os fornecedores e parceiros</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fornecedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">
                {filteredFornecedores.length} fornecedor(es)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredFornecedores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fornecedor.razao_social}</p>
                          {fornecedor.nome_fantasia && (
                            <p className="text-xs text-muted-foreground">{fornecedor.nome_fantasia}</p>
                          )}
                          {fornecedor.cpf_cnpj && (
                            <p className="text-xs text-muted-foreground">{fornecedor.cpf_cnpj}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {fornecedor.tipo_pessoa === 'pj' ? 'PJ' : 'PF'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-0.5">
                          {fornecedor.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {fornecedor.telefone}
                            </div>
                          )}
                          {fornecedor.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {fornecedor.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fornecedor.categoria && (
                          <Badge variant="secondary">{fornecedor.categoria}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={fornecedor.ativo ? "default" : "secondary"}>
                          {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(fornecedor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(fornecedor.id)}
                          >
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

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select 
                    value={watch('tipo_pessoa')} 
                    onValueChange={(v) => setValue('tipo_pessoa', v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                      <SelectItem value="pf">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{watch('tipo_pessoa') === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                  <Input {...register('cpf_cnpj')} placeholder={watch('tipo_pessoa') === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'} />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>{watch('tipo_pessoa') === 'pj' ? 'Razão Social' : 'Nome Completo'} *</Label>
                  <Input {...register('razao_social', { required: true })} />
                </div>

                {watch('tipo_pessoa') === 'pj' && (
                  <div className="col-span-2 space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input {...register('nome_fantasia')} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...register('email')} />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input {...register('telefone')} placeholder="(00) 0000-0000" />
                </div>

                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input {...register('celular')} placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={watch('categoria') || ''} 
                    onValueChange={(v) => setValue('categoria', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Endereço</Label>
                  <Input {...register('endereco')} />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input {...register('cidade')} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input {...register('estado')} maxLength={2} placeholder="SP" />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input {...register('cep')} placeholder="00000-000" />
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Observações</Label>
                  <Textarea {...register('observacoes')} rows={2} />
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={watch('ativo')} 
                    onCheckedChange={(v) => setValue('ativo', v)} 
                  />
                  <Label>Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFornecedor.isPending || updateFornecedor.isPending}>
                  {editingFornecedor ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
