import { useState, useEffect } from 'react';
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
  Plus,
  Download,
  Filter,
  Edit,
  Check,
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
    _isDeleting,
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
        feature: "clinical_analysis" as unknown 
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="container max-w-7xl mx-auto py-6 md:py-8 space-y-8 animate-fade-in pb-20 md:pb-0">
        
        {/* Header - Design Moderno */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-premium-sm border border-slate-100 dark:border-slate-800/50">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Gestão Financeira</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Visão consolidada de receitas, despesas e performance</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleExport} variant="outline" className="rounded-xl h-11 border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleNewTransaction} className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/10 font-bold h-11 px-6 text-xs uppercase tracking-wider">
              <Plus className="mr-2 h-5 w-5" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* AI Financial Advisor - Premium Card */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="border-none bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-premium-md overflow-hidden relative group rounded-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Sparkles className="h-32 w-32 text-emerald-600" />
            </div>
            <CardHeader className="pb-2 border-b border-emerald-100/50 dark:border-emerald-900/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-black tracking-tight text-lg">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    Clinsight AI
                  </CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 dark:text-emerald-500/40">Consultoria Estratégica</CardDescription>
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isGenerating ? (
                <div className="space-y-3 py-2">
                  <div className="h-3 w-3/4 bg-emerald-200/30 animate-pulse rounded-full" />
                  <div className="h-3 w-1/2 bg-emerald-200/30 animate-pulse rounded-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed italic">
                    "{aiSummary || 'Analise seu faturamento para receber dicas exclusivas de rentabilidade.'}"
                  </p>
                  <div className="flex justify-start">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={generateFinancialAdvice}
                      className="text-[10px] font-black uppercase tracking-[0.2em] h-8 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Atualizar Insights
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="rounded-2xl border-none shadow-premium-sm hover-lift bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                Receita Total
                <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">R$ {stats?.totalRevenue.toLocaleString('pt-BR')}</p>
              <div className="flex items-center mt-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold px-2 py-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats?.monthlyGrowth.toFixed(1)}%
                </Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">vs anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-premium-sm hover-lift bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                Pendentes
                <div className="p-1.5 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tighter text-amber-600">R$ {stats?.pendingPayments.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">{transactions.filter(t => t.status === 'pendente').length} em aberto</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-premium-sm hover-lift bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                Ticket Médio
                <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">R$ {stats?.averageTicket.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Média p/ sessão</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-premium-sm hover-lift bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                Efetivação
                <div className="p-1.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                {stats?.totalCount ? Math.round((stats.paidCount / stats.totalCount) * 100) : 0}%
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">{stats?.paidCount} de {stats?.totalCount} realizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-6 sm:mb-8 grid grid-cols-3 w-full max-w-md mx-auto shadow-inner-border">
            <TabsTrigger value="transactions" className="rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md">Transações</TabsTrigger>
            <TabsTrigger value="packages" className="rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md">Pacotes</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase tracking-[0.1em]">Fluxo de Caixa</h3>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs">
                  <Filter className="h-3.5 w-3.5 mr-2 text-primary" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
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
              <div className="border border-slate-100 dark:border-slate-800/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-premium-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px]">Data</th>
                        <th className="px-6 py-4 text-[10px]">Descrição</th>
                        <th className="px-6 py-4 text-[10px]">Status</th>
                        <th className="px-6 py-4 text-[10px]">Valor</th>
                        <th className="px-6 py-4 text-right text-[10px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                          <td className="px-6 py-5 text-slate-500 font-mono text-xs">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px] leading-tight">{t.descricao || 'Sem descrição'}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{t.tipo}</p>
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant={t.status === 'concluido' ? 'success' : 'warning'} className="rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border-none shadow-sm">
                              {t.status === 'concluido' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className={cn(
                            "px-6 py-5 font-black text-sm",
                            t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-5 text-right space-x-2">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {t.status === 'pendente' && (
                                <Button variant="ghost" size="icon" onClick={() => markAsPaid(t.id)} className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(t)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
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