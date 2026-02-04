import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Check,
  Package,
  Sparkles,
  RefreshCw,
  Clock
} from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { useFinancial, type Transaction } from '@/hooks/useFinancial';
import { TransactionModal, PackagesManager } from '@/components/financial';
import { PackageUsageReport } from '@/components/financial/PackageUsageReport';
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
import { exportFinancialReport } from '@/lib/export/excelExport';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAI } from "@/integrations/firebase/ai";
import { fisioLogger as logger } from '@/lib/errors/logger';

const Financial = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();
  const { generate } = useAI();

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

  const generateFinancialAdvice = async () => {
    if (!stats) return;
    setIsGenerating(true);
    try {
      const prompt = `
        Aja como um consultor financeiro Pro para clínicas. Analise estes dados:
        - Receita: R$ ${stats.totalRevenue}
        - Pendente (Inadimplência): R$ ${stats.pendingPayments}
        - Crescimento: ${stats.monthlyGrowth}%
        - Ticket Médio: R$ ${stats.averageTicket}
        
        Forneça 2 dicas estratégicas e curtas (máximo 20 palavras cada) para aumentar o lucro.
        Responda em português brasileiro.
      `;
      const result = await generate(prompt, { 
        userId: "financial-module", 
        feature: "clinical_analysis" as any 
      });
      setAiSummary(result.content);
    } catch (error) {
      logger.error('Erro ao gerar insights', error, 'Financial');
      setAiSummary("Foco na redução de pendências para otimizar seu caixa!");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (stats && !aiSummary && !isGenerating) {
      generateFinancialAdvice();
    }
  }, [stats]);

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

  const handleExport = async () => {
    if (!stats || transactions.length === 0) return;

    setIsExporting(true);
    try {
      await exportFinancialReport({
        totalRevenue: stats.totalRevenue,
        pendingPayments: stats.pendingPayments,
        paidCount: stats.paidCount,
        totalCount: stats.totalCount,
        averageTicket: stats.averageTicket,
        transactions: transactions.map(t => ({
          id: t.id,
          tipo: t.tipo,
          descricao: t.descricao || '',
          valor: Number(t.valor),
          status: t.status,
          data_vencimento: t.created_at,
          data_pagamento: t.status === 'concluido' ? t.updated_at : undefined
        }))
      });
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo Excel foi gerado com sucesso.'
      });
    } catch {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-6 md:py-10 space-y-8 px-4 sm:px-6">
        
        {/* AI Financial Advisor */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-md overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="h-24 w-24 text-emerald-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-5 w-5 animate-pulse" />
                Consultor Financeiro Clinsight AI
              </CardTitle>
              <CardDescription>Análise estratégica do seu fluxo de caixa</CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="space-y-2 py-2">
                  <div className="h-4 w-3/4 bg-emerald-200/50 animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-emerald-200/50 animate-pulse rounded" />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert italic text-foreground/80 leading-relaxed">
                  "{aiSummary || 'Analise seu faturamento para receber dicas exclusivas de rentabilidade.'}"
                  <div className="mt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={generateFinancialAdvice}
                      className="text-xs h-8 text-emerald-700 hover:bg-emerald-100"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Recalcular Insights
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Gestão Financeira</h1>
            <p className="text-muted-foreground mt-1">Acompanhe receitas, despesas e pacotes de sessões.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" className="rounded-xl h-11" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleNewTransaction} className="rounded-xl shadow-md font-bold h-11 px-6">
              <Plus className="mr-2 h-5 w-5" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="rounded-2xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Receita Total
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tight">R$ {stats?.totalRevenue.toLocaleString('pt-BR')}</p>
              <div className="flex items-center mt-2 text-xs">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats?.monthlyGrowth.toFixed(1)}%
                </Badge>
                <span className="text-muted-foreground ml-2">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Pendentes
                <Clock className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tight text-amber-600">R$ {stats?.pendingPayments.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground mt-2">{transactions.filter(t => t.status === 'pendente').length} aguardando</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Ticket Médio
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tight">R$ {stats?.averageTicket.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground mt-2">Por atendimento</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Recebimento
                <Check className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tight">
                {stats?.totalCount ? Math.round((stats.paidCount / stats.totalCount) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">{stats?.paidCount} de {stats?.totalCount} pagos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="transactions" className="rounded-lg px-6">Transações</TabsTrigger>
            <TabsTrigger value="packages" className="rounded-lg px-6">Pacotes</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg px-6">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold tracking-tight text-foreground">Fluxo de Caixa</h3>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px] rounded-xl">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="all">Todo Histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <LoadingSkeleton type="list" rows={5} />
            ) : transactions.length === 0 ? (
              <EmptyState 
                icon={DollarSign}
                title="Sem transações"
                description="Não encontramos registros financeiros para este período."
                actionLabel="Nova Transação"
                onAction={handleNewTransaction}
              />
            ) : (
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/50">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-6 py-4 text-muted-foreground">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold">{t.descricao || 'Sem descrição'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.tipo}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={t.status === 'concluido' ? 'success' : 'warning'} className="rounded-full px-3">
                              {t.status === 'concluido' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className={cn(
                            "px-6 py-4 font-bold",
                            t.tipo === 'receita' ? 'text-emerald-600' : 'text-destructive'
                          )}>
                            {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {t.status === 'pendente' && (
                              <Button variant="ghost" size="icon" onClick={() => markAsPaid(t.id)} className="h-8 w-8 text-emerald-600">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(t)} className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="packages">
            <PackagesManager />
          </TabsContent>

          <TabsContent value="reports">
            <PackageUsageReport />
          </TabsContent>
        </Tabs>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        transaction={editingTransaction}
        isSubmitting={isCreating || isUpdating}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação removerá o registro permanentemente do fluxo de caixa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Financial;