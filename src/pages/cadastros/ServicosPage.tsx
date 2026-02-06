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
  DollarSign,
  Clock,
  Settings
} from 'lucide-react';
import { useServicos, useCreateServico, useUpdateServico, useDeleteServico, Servico, ServicoFormData } from '@/hooks/useServicos';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';

const tipoCobrancaLabels = {
  unitario: 'Unitário',
  mensal: 'Mensal',
  pacote: 'Pacote',
};

const defaultColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function ServicosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  const { data: servicos, isLoading } = useServicos();
  const createServico = useCreateServico();
  const updateServico = useUpdateServico();
  const deleteServico = useDeleteServico();

  const { register, handleSubmit, reset, setValue, watch } = useForm<ServicoFormData>({
    defaultValues: {
      nome: '',
      descricao: '',
      duracao_padrao: 60,
      tipo_cobranca: 'unitario',
      valor: 0,
      centro_custo: '',
      permite_agendamento_online: true,
      cor: '#3b82f6',
      ativo: true,
      organization_id: null,
    },
  });

  const filteredServicos = servicos?.filter(s => 
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    reset({
      nome: '',
      descricao: '',
      duracao_padrao: 60,
      tipo_cobranca: 'unitario',
      valor: 0,
      centro_custo: '',
      permite_agendamento_online: true,
      cor: '#3b82f6',
      ativo: true,
      organization_id: null,
    });
    setSelectedColor('#3b82f6');
    setEditingServico(null);
    setIsModalOpen(true);
  };

  const openEditModal = (servico: Servico) => {
    reset({
      nome: servico.nome,
      descricao: servico.descricao || '',
      duracao_padrao: servico.duracao_padrao,
      tipo_cobranca: servico.tipo_cobranca,
      valor: servico.valor,
      centro_custo: servico.centro_custo || '',
      permite_agendamento_online: servico.permite_agendamento_online,
      cor: servico.cor || '#3b82f6',
      ativo: servico.ativo,
      organization_id: servico.organization_id,
    });
    setSelectedColor(servico.cor || '#3b82f6');
    setEditingServico(servico);
    setIsModalOpen(true);
  };

  const onSubmit = (data: ServicoFormData) => {
    const formData = { ...data, cor: selectedColor };
    
    if (editingServico) {
      updateServico.mutate({ id: editingServico.id, ...formData }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createServico.mutate(formData, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este serviço?')) {
      deleteServico.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Tabela de Serviços
            </h1>
            <p className="text-muted-foreground">Gerencie os serviços e preços da clínica</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">
                {filteredServicos.length} serviço(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredServicos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço cadastrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: servico.cor || '#3b82f6' }} 
                          />
                          <div>
                            <p className="font-medium">{servico.nome}</p>
                            {servico.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {servico.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {servico.duracao_padrao} min
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tipoCobrancaLabels[servico.tipo_cobranca]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-3 w-3" />
                          {servico.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={servico.permite_agendamento_online ? "default" : "secondary"}>
                          {servico.permite_agendamento_online ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={servico.ativo ? "default" : "secondary"}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(servico)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(servico.id)}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome *</Label>
                  <Input {...register('nome', { required: true })} placeholder="Ex: Fisioterapia" />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Textarea {...register('descricao')} placeholder="Descrição do serviço..." rows={2} />
                </div>

                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input 
                    type="number" 
                    {...register('duracao_padrao', { valueAsNumber: true })} 
                    min={15} 
                    step={15} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Cobrança</Label>
                  <Select
                    value={watch('tipo_cobranca')}
                    onValueChange={(v) => setValue('tipo_cobranca', v as 'unitario' | 'mensal' | 'pacote')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unitario">Unitário</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="pacote">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number" 
                    {...register('valor', { valueAsNumber: true })} 
                    min={0} 
                    step={0.01} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Input {...register('centro_custo')} placeholder="Ex: Atendimentos" />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          selectedColor === color ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={watch('permite_agendamento_online')} 
                    onCheckedChange={(v) => setValue('permite_agendamento_online', v)} 
                  />
                  <Label>Agendamento Online</Label>
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
                <Button type="submit" disabled={createServico.isPending || updateServico.isPending}>
                  {editingServico ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
