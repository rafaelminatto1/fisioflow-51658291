import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { DollarSign, TrendingUp, Calendar, AlertCircle, TrendingDown, Activity } from 'lucide-react';
import { useFinancial } from '@/hooks/useFinancial';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { DelinquencyList } from './DelinquencyList';
import { generateTransactionsCSV, downloadCSV } from '@/utils/csvExport';
import { Download } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';

export const FinancialDashboard: React.FC = () => {
  const { stats, loading, period, setPeriod, transactions } = useFinancial();

  const handleExport = () => {
    try {
      if (transactions.length === 0) {
        toast.error('Não há transações para exportar neste período.');
        return;
      }
      const csv = generateTransactionsCSV(transactions);
      const filename = `transacoes_fisioflow_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar relatório.');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Fallback se não houver dados
  const data = stats || {
    totalRevenue: 0,
    monthlyGrowth: 0,
    pendingPayments: 0,
    paidCount: 0,
    totalCount: 0,
    averageTicket: 0
  };

  const pendingCount = data.totalCount - data.paidCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho financeiro da sua clínica.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Tabs
            value={period}
            onValueChange={(val) => setPeriod(val as 'daily' | 'weekly' | 'monthly' | 'all')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-4 sm:w-[400px]">
              <TabsTrigger value="daily">Hoje</TabsTrigger>
              <TabsTrigger value="weekly">7 Dias</TabsTrigger>
              <TabsTrigger value="monthly">30 Dias</TabsTrigger>
              <TabsTrigger value="all">Total</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="icon" onClick={handleExport} title="Exportar CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {data.monthlyGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={data.monthlyGrowth >= 0 ? "text-emerald-500" : "text-red-500"}>
                {Math.abs(data.monthlyGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.averageTicket)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Por atendimento realizado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.pendingPayments)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {pendingCount} {pendingCount === 1 ? 'pagamento pendente' : 'pagamentos pendentes'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalCount > 0
                ? `${((data.paidCount / data.totalCount) * 100).toFixed(0)}%`
                : '0%'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Pagamentos realizados vs total
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receita por Categoria */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Receita por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Agrupamento por categoria
                const categories = stats.totalRevenue > 0 ? transactions.reduce((acc, t) => {
                  if (t.status !== 'concluido') return acc;

                  let category = 'Outros';
                  const desc = t.descricao?.toLowerCase() || '';

                  if (desc.includes('pacote')) category = 'Pacotes';
                  else if (desc.includes('fisioterapia')) category = 'Fisioterapia';
                  else if (desc.includes('pilates')) category = 'Pilates';
                  else if (desc.includes('consulta')) category = 'Consultas';

                  acc[category] = (acc[category] || 0) + Number(t.valor);
                  return acc;
                }, {} as Record<string, number>) : {};

                const sortedCategories = Object.entries(categories)
                  .sort(([, a], [, b]) => b - a);

                if (sortedCategories.length === 0) {
                  return <p className="text-sm text-muted-foreground">Sem dados de receita no período.</p>;
                }

                return sortedCategories.map(([cat, value]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted-foreground">{formatCurrency(value)}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(value / stats.totalRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Últimas Transações */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none truncate max-w-[200px]">{t.descricao}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                  </div>
                  <div className={`font-bold ${t.tipo === 'despesa' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {t.tipo === 'despesa' ? '-' : '+'}{formatCurrency(t.valor)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1">
        <DelinquencyList />
      </div>

    </div >
  );
};

export default FinancialDashboard;