import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Textarea } from '@/components/shared/ui/textarea';
import { DollarSign, Plus, ArrowUpCircle, ArrowDownCircle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useContasFinanceiras, useCreateContaFinanceira, useUpdateContaFinanceira, useResumoFinanceiro, ContaFinanceira } from '@/hooks/useContasFinanceiras';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIAS = ['Consulta', 'Pacote', 'Aluguel', 'Salário', 'Material', 'Equipamento', 'Marketing', 'Outros'];
const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Boleto', 'Transferência'];

export default function ContasFinanceirasPage() {
  const [tab, setTab] = useState<'receber' | 'pagar'>('receber');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);

  const [formData, setFormData] = useState({
    tipo: 'receber' as 'receber' | 'pagar',
    descricao: '',
    valor: '',
    data_vencimento: '',
    categoria: '',
    forma_pagamento: '',
    observacoes: '',
  });

  const { data: contas = [], isLoading } = useContasFinanceiras(tab, statusFilter || undefined);
  const { data: resumo } = useResumoFinanceiro();
  const createMutation = useCreateContaFinanceira();
  const updateMutation = useUpdateContaFinanceira();

  const handleOpenDialog = (conta?: ContaFinanceira) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        tipo: conta.tipo,
        descricao: conta.descricao,
        valor: String(conta.valor),
        data_vencimento: conta.data_vencimento,
        categoria: conta.categoria || '',
        forma_pagamento: conta.forma_pagamento || '',
        observacoes: conta.observacoes || '',
      });
    } else {
      setEditingConta(null);
      setFormData({
        tipo: tab,
        descricao: '',
        valor: '',
        data_vencimento: '',
        categoria: '',
        forma_pagamento: '',
        observacoes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      valor: parseFloat(formData.valor),
      status: 'pendente' as const,
      parcelas: 1,
      parcela_atual: 1,
      recorrente: false,
      data_pagamento: null,
      patient_id: null,
      fornecedor_id: null,
    };

    if (editingConta) {
      await updateMutation.mutateAsync({ id: editingConta.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleQuitar = async (conta: ContaFinanceira) => {
    await updateMutation.mutateAsync({
      id: conta.id,
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    });
  };

  const getStatusBadge = (status: string, vencimento: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    if (status === 'pago') return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
    if (status === 'cancelado') return <Badge variant="secondary">Cancelado</Badge>;
    if (vencimento < hoje) return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
    if (vencimento === hoje) return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Hoje</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              Contas Financeiras
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie contas a receber e a pagar</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">A Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {resumo?.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
              {(resumo?.receberAtrasado || 0) > 0 && (
                <p className="text-xs text-destructive">{resumo?.receberAtrasado} atrasados</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">A Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {resumo?.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
              {(resumo?.pagarAtrasado || 0) > 0 && (
                <p className="text-xs text-destructive">{resumo?.pagarAtrasado} atrasados</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Vencendo Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(resumo?.receberHoje || 0) + (resumo?.pagarHoje || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Saldo Projetado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(resumo?.totalReceber || 0) - (resumo?.totalPagar || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {((resumo?.totalReceber || 0) - (resumo?.totalPagar || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'receber' | 'pagar')}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="receber" className="gap-2">
                    <ArrowUpCircle className="h-4 w-4" />
                    A Receber
                  </TabsTrigger>
                  <TabsTrigger value="pagar" className="gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    A Pagar
                  </TabsTrigger>
                </TabsList>
                <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="atrasado">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value={tab}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : contas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contas.map((conta) => (
                        <TableRow key={conta.id}>
                          <TableCell className="font-medium">{conta.descricao}</TableCell>
                          <TableCell>{conta.categoria || '-'}</TableCell>
                          <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="font-medium">
                            R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{getStatusBadge(conta.status, conta.data_vencimento)}</TableCell>
                          <TableCell className="text-right">
                            {conta.status === 'pendente' && (
                              <Button variant="ghost" size="sm" onClick={() => handleQuitar(conta)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Quitar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as 'receber' | 'pagar' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receber">A Receber</SelectItem>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={formData.data_vencimento} onChange={(e) => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.forma_pagamento} onValueChange={(v) => setFormData(prev => ({ ...prev, forma_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingConta ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
