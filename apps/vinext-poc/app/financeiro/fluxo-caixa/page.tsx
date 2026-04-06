import { db } from '../../lib/db';
import { getAuthSession } from '../../lib/auth';
import { transacoes } from '@fisioflow/db';
import { eq, desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@fisioflow/ui';
import { TrendingUp, TrendingDown, DollarSign, Calendar, LineChart } from 'lucide-react';
import { FluxoCaixaChart } from '../../components/financeiro/FluxoCaixaChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMM/yy', { locale: ptBR });
}

export default async function FluxoCaixaPage() {
  const session = await getAuthSession();
  if (!session) {
    return <div className="p-8 text-center">Não autorizado. Por favor, faça login.</div>;
  }

  // 1. Fetch Transações (Direct DB Access + Multi-tenancy)
  const data = await db.query.transacoes.findMany({
    where: eq(transacoes.organizationId, session.organizationId),
    orderBy: [desc(transacoes.createdAt)],
    limit: 1000,
  });

  // 2. Process data (Server-side grouping)
  const grouped = new Map<string, { mes: string, entradas: number, saidas: number, saldo: number }>();

  data.forEach((t) => {
    const mes = t.createdAt.toISOString().slice(0, 7);
    const valor = Number(t.valor);
    const existing = grouped.get(mes) || { mes, entradas: 0, saidas: 0, saldo: 0 };
    
    if (t.tipo === 'receita') {
      existing.entradas += valor;
    } else {
      // 'despesa' e outros tipos são saídas
      existing.saidas += valor;
    }
    existing.saldo = existing.entradas - existing.saidas;
    grouped.set(mes, existing);
  });

  const rawChartData = Array.from(grouped.values())
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12);

  let saldoAcumulado = 0;
  const chartData = rawChartData.map((d) => {
    saldoAcumulado += d.saldo;
    return {
      ...d,
      mes: formatMonthLabel(d.mes),
      acumulado: saldoAcumulado,
    };
  });

  const totalEntradas = chartData.reduce((acc, d) => acc + d.entradas, 0);
  const totalSaidas = chartData.reduce((acc, d) => acc + d.saidas, 0);

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <LineChart className="h-8 w-8 text-primary" />
            Fluxo de Caixa (SSR)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Análise direta do banco de dados • Renderização no Servidor
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">
              R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">
              R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${(totalEntradas - totalSaidas) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {(totalEntradas - totalSaidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl bg-primary/10 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black tracking-tight text-primary">
              Últimos 12 Meses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Section */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Performance Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <FluxoCaixaChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
