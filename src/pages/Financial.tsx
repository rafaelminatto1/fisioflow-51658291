import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  Plus, 
  Download, 
  Filter,
  Edit,
  Trash2,
  Check
} from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useFinancial, type Transaction } from '@/hooks/useFinancial';
import { TransactionModal } from '@/components/financial/TransactionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Financial = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    transactions,
    stats,
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    markAsPaid,
    isCreating,
    isUpdating,
    isDeleting,
  } = useFinancial();

  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingTransaction) {
      updateTransaction({ id: editingTransaction.id, ...data });
    } else {
      createTransaction(data);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-100 text-green-700';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'receita':
        return 'Receita';
      case 'despesa':
        return 'Despesa';
      case 'pagamento':
        return 'Pagamento';
      case 'recebimento':
        return 'Recebimento';
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie cobranças e acompanhe sua receita</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="hover:bg-accent/80 border-border/50">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>
            <Button 
              onClick={handleNewTransaction}
              className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-medical"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card className="bg-gradient-card border-border/50 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Receita Total
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    R$ {(stats?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medical">
                  <DollarSign className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div className="flex items-center mt-3">
                <TrendingUp className="w-4 h-4 text-secondary mr-1" />
                <span className="text-sm text-secondary font-medium">
                  +{stats?.monthlyGrowth || 0}%
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Pagamentos Pendentes
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(stats?.pendingPayments || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {(stats?.totalCount || 0) - (stats?.paidCount || 0)} transações pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Taxa de Pagamento
                  </p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-secondary to-secondary bg-clip-text text-transparent">
                    {stats && stats.totalCount > 0
                      ? Math.round((stats.paidCount / stats.totalCount) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medical">
                  <CreditCard className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {stats?.paidCount || 0} de {stats?.totalCount || 0} transações pagas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Ticket Médio
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(stats?.averageTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-medical">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Por transação realizada</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Management Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Todas as Transações</TabsTrigger>
            <TabsTrigger value="pending">Pendências</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            {transactions.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Nenhuma transação encontrada"
                description="Crie sua primeira transação para começar"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Transações Recentes
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {getTipoLabel(transaction.tipo)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.descricao || 'Sem descrição'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              R$ {Number(transaction.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <Badge className={getStatusColor(transaction.status)}>
                              {getStatusLabel(transaction.status)}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            {transaction.status === 'pendente' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsPaid(transaction.id)}
                                title="Marcar como pago"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(transaction.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            {transactions.filter(t => t.status === 'pendente').length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="Nenhum pagamento pendente"
                description="Todos os pagamentos estão em dia! 🎉"
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Pagamentos Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions
                      .filter(t => t.status === 'pendente')
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {getTipoLabel(transaction.tipo)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.descricao || 'Sem descrição'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium text-foreground">
                                R$ {Number(transaction.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('pt-BR') : ''}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => markAsPaid(transaction.id)}
                            >
                              Marcar como Pago
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleSubmit}
        transaction={editingTransaction || undefined}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Financial;
