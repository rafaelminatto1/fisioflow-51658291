import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, FileText, Target, PieChart } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DemonstrativoData {
  periodo: string;
  entradas: number;
  saidas: number;
  saldo: number;
  entradasPorCategoria: Record<string, number>;
  saidasPorCategoria: Record<string, number>;
  entradasPorFormaPagamento: Record<string, number>;
  contasReceber: number;
  contasPagar: number;
  totalAtendimentos: number;
  ticketMedio: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function DemonstrativoMensalPage() {
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));

  // Gerar lista de meses
  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: format(new Date(new Date().getFullYear(), i, 1), 'MMMM', { locale: ptBR }),
  }));

  const anos = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  // Buscar dados do demonstrativo
  const { data: demoData, isLoading } = useQuery({
    queryKey: ['demonstrativo-mensal', anoSelecionado, mesSelecionado],
    queryFn: async (): Promise<DemonstrativoData> => {
      const dataInicio = startOfMonth(new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, 1)).toISOString();
      const dataFim = endOfMonth(new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, 1)).toISOString();

      // Buscar movimentações do caixa
      const { data: movs, error: movsError } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .gte('data', dataInicio.split('T')[0])
        .lte('data', dataFim.split('T')[0]);

      if (movsError) throw movsError;

      const movimentacoes = movs || [];
      const entradas = movimentacoes.filter(m => m.tipo === 'entrada');
      const saidas = movimentacoes.filter(m => m.tipo === 'saida');

      const totalEntradas = entradas.reduce((acc, m) => acc + Number(m.valor), 0);
      const totalSaidas = saidas.reduce((acc, m) => acc + Number(m.valor), 0);

      // Agrupar por categoria
      const entradasPorCategoria: Record<string, number> = {};
      const saidasPorCategoria: Record<string, number> = {};
      const entradasPorFormaPagamento: Record<string, number> = {};

      entradas.forEach(m => {
        const cat = m.categoria || 'Outros';
        entradasPorCategoria[cat] = (entradasPorCategoria[cat] || 0) + Number(m.valor);
        const forma = m.forma_pagamento || 'Não informado';
        entradasPorFormaPagamento[forma] = (entradasPorFormaPagamento[forma] || 0) + Number(m.valor);
      });

      saidas.forEach(m => {
        const cat = m.categoria || 'Outros';
        saidasPorCategoria[cat] = (saidasPorCategoria[cat] || 0) + Number(m.valor);
      });

      // Buscar contas a receber e pagar
      const { data: contasReceber } = await supabase
        .from('contas_financeiras')
        .select('valor')
        .eq('tipo', 'receber')
        .eq('status', 'pendente');

      const { data: contasPagar } = await supabase
        .from('contas_financeiras')
        .select('valor')
        .eq('tipo', 'pagar')
        .eq('status', 'pendente');

      // Buscar total de atendimentos (sessões concluídas)
      const { count: totalAtendimentos } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', dataInicio)
        .lte('start_time', dataFim)
        .eq('status', 'completed');

      return {
        periodo: `${meses.find(m => m.value === mesSelecionado)?.label} de ${anoSelecionado}`,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
        entradasPorCategoria,
        saidasPorCategoria,
        entradasPorFormaPagamento,
        contasReceber: contasReceber?.reduce((acc, c: any) => acc + Number(c.valor), 0) || 0,
        contasPagar: contasPagar?.reduce((acc, c: any) => acc + Number(c.valor), 0) || 0,
        totalAtendimentos: totalAtendimentos || 0,
        ticketMedio: totalAtendimentos ? totalEntradas / totalAtendimentos : 0,
      };
    },
    enabled: !!anoSelecionado && !!mesSelecionado,
  });

  // Preparar dados para gráficos
  const entradasCategoriaData = demoData
    ? Object.entries(demoData.entradasPorCategoria).map(([cat, valor]) => ({ name: cat, value: valor }))
    : [];

  const saidasCategoriaData = demoData
    ? Object.entries(demoData.saidasPorCategoria).map(([cat, valor]) => ({ name: cat, value: valor }))
    : [];

  const formasPagamentoData = demoData
    ? Object.entries(demoData.entradasPorFormaPagamento).map(([forma, valor]) => ({ name: forma, value: valor }))
    : [];

  // Comparar com mês anterior
  const { data: demoMesAnterior } = useQuery({
    queryKey: ['demonstrativo-mes-anterior', anoSelecionado, mesSelecionado],
    queryFn: async () => {
      const dataAtual = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, 1);
      const dataAnterior = subMonths(dataAtual, 1);

      const dataInicio = startOfMonth(dataAnterior).toISOString();
      const dataFim = endOfMonth(dataAnterior).toISOString();

      const { data: movs } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .gte('data', dataInicio.split('T')[0])
        .lte('data', dataFim.split('T')[0]);

      const movimentacoes = movs || [];
      const totalEntradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + Number(m.valor), 0);
      const totalSaidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + Number(m.valor), 0);

      return { entradas: totalEntradas, saidas: totalSaidas, saldo: totalEntradas - totalSaidas };
    },
    enabled: !!demoData,
  });

  const crescimentoReceita = demoMesAnterior && demoData
    ? ((demoData.entradas - demoMesAnterior.entradas) / demoMesAnterior.entradas) * 100
    : 0;

  const crescimentoSaldo = demoMesAnterior && demoData
    ? ((demoData.saldo - demoMesAnterior.saldo) / Math.abs(demoMesAnterior.saldo || 1)) * 100
    : 0;

  const exportarPDF = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PieChart className="h-8 w-8 text-primary" />
              Demonstrativo Mensal (Raio-X)
            </h1>
            <p className="text-muted-foreground mt-1">Análise financeira detalhada do período</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportarPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando demonstrativo...</div>
        ) : demoData ? (
          <>
            {/* Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Total de Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                    R$ {demoData.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {crescimentoReceita !== 0 && (
                    <div className={`flex items-center text-xs mt-1 ${crescimentoReceita > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {crescimentoReceita > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {crescimentoReceita > 0 ? '+' : ''}{crescimentoReceita.toFixed(1)}% vs mês anterior
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Total de Saídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                    R$ {demoData.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((demoData.saidas / (demoData.entradas || 1)) * 100).toFixed(1)}% das entradas
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Saldo do Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${demoData.saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    R$ {demoData.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {crescimentoSaldo !== 0 && (
                    <div className={`flex items-center text-xs mt-1 ${crescimentoSaldo > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {crescimentoSaldo > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {crescimentoSaldo > 0 ? '+' : ''}{crescimentoSaldo.toFixed(1)}% vs mês anterior
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    R$ {demoData.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {demoData.totalAtendimentos} atendimentos
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entradas por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {entradasCategoriaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={entradasCategoriaData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {entradasCategoriaData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">Sem dados de entradas</div>
                  )}
                </CardContent>
              </Card>

              {/* Saídas por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Saídas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {saidasCategoriaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={saidasCategoriaData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {saidasCategoriaData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">Sem dados de saídas</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Forma de Pagamento e Contas Pendentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entradas por Forma de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {formasPagamentoData.length > 0 ? (
                    <div className="space-y-3">
                      {formasPagamentoData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="font-semibold">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">Sem dados</div>
                  )}
                </CardContent>
              </Card>

              {/* Contas Pendentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Contas Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-muted-foreground">A Receber</p>
                      <p className="text-xl font-bold text-green-600">
                        R$ {demoData.contasReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-sm text-muted-foreground">A Pagar</p>
                      <p className="text-xl font-bold text-red-600">
                        R$ {demoData.contasPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-muted-foreground">Saldo Projetado (considerando pendentes)</p>
                    <p className={`text-xl font-bold ${(demoData.saldo + demoData.contasReceber - demoData.contasPagar) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {(demoData.saldo + demoData.contasReceber - demoData.contasPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(new Set([
                      ...Object.keys(demoData.entradasPorCategoria),
                      ...Object.keys(demoData.saidasPorCategoria)
                    ])).map(cat => {
                      const entrada = demoData.entradasPorCategoria[cat] || 0;
                      const saida = demoData.saidasPorCategoria[cat] || 0;
                      const total = entrada + saida;
                      return (
                        <TableRow key={cat}>
                          <TableCell className="font-medium">{cat}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {entrada > 0 ? `R$ ${entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {saida > 0 ? `R$ ${saida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {demoData.entradas > 0 ? ((entrada / demoData.entradas) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-green-600">
                        R$ {demoData.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        R$ {demoData.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Footer com informações */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    <p>Período: <span className="font-medium">{demoData.periodo}</span></p>
                    <p>Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    Demonstrativo Financeiro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
