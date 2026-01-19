import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, AlertCircle, TrendingDown, Activity } from 'lucide-react';
import { useFinancial } from '@/hooks/useFinancial';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/format';

export const FinancialDashboard: React.FC = () => {
  const { stats, loading } = useFinancial();

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
              Pagamentos confirmados
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard;