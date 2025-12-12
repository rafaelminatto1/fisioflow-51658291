import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useFluxoCaixaResumo, useCaixaDiario } from '@/hooks/useFluxoCaixa';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FluxoCaixaPage() {
  const [dataCaixa, setDataCaixa] = useState(new Date().toISOString().split('T')[0]);
  const [periodoView, setPeriodoView] = useState<'mensal' | 'diario'>('mensal');

  const { data: fluxoMensal = [] } = useFluxoCaixaResumo();
  const { data: caixaDiario } = useCaixaDiario(dataCaixa);

  const chartData = fluxoMensal.map(f => ({
    mes: format(new Date(f.mes), 'MMM/yy', { locale: ptBR }),
    entradas: Number(f.entradas),
    saidas: Number(f.saidas),
    saldo: Number(f.saldo),
  })).reverse();

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  const chartDataComAcumulado = chartData.map(d => {
    saldoAcumulado += d.saldo;
    return { ...d, acumulado: saldoAcumulado };
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Fluxo de Caixa
            </h1>
            <p className="text-muted-foreground mt-1">Visualize entradas, saídas e saldo</p>
          </div>
          <Select value={periodoView} onValueChange={(v) => setPeriodoView(v as 'mensal' | 'diario')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Visão Mensal</SelectItem>
              <SelectItem value="diario">Caixa Diário</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {periodoView === 'mensal' ? (
          <>
            {/* Resumo do período */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Total Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {fluxoMensal.reduce((acc, f) => acc + Number(f.entradas), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Total Saídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {fluxoMensal.reduce((acc, f) => acc + Number(f.saidas), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Saldo do Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-medium">
                    Últimos {fluxoMensal.length} meses
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataComAcumulado}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas" fill="#22c55e" />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Caixa Diário */}
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={dataCaixa}
                onChange={(e) => setDataCaixa(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Entradas do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {(caixaDiario?.entradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Saídas do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {(caixaDiario?.saidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Saldo do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(caixaDiario?.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {(caixaDiario?.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Por forma de pagamento */}
            {caixaDiario?.porFormaPagamento && Object.keys(caixaDiario.porFormaPagamento).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(caixaDiario.porFormaPagamento).map(([forma, valor]) => (
                      <div key={forma} className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">{forma}</p>
                        <p className={`text-lg font-bold ${valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
