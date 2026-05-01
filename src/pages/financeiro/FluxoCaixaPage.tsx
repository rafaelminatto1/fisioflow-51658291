import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  LineChart as LineChartIcon,
} from "lucide-react";
import { useFluxoCaixaResumo, useCaixaDiario } from "@/hooks/useFluxoCaixa";
import { MainLayout } from "@/components/layout/MainLayout";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { todayYMD, parseLocalDate } from "@/lib/date-utils";

function formatMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey || "Sem data";

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return monthKey;
  }

  const monthDate = new Date(year, month - 1, 1, 12, 0, 0);
  return Number.isNaN(monthDate.getTime())
    ? monthKey
    : format(monthDate, "MMM/yy", { locale: ptBR });
}

export function FluxoCaixaContent() {
  const [dataCaixa, setDataCaixa] = useState(() => todayYMD());
  const [periodoView, setPeriodoView] = useState<"mensal" | "diario">("mensal");

  const { data: fluxoMensal = [] } = useFluxoCaixaResumo();
  const { data: caixaDiario } = useCaixaDiario(dataCaixa);

  const chartData = fluxoMensal
    .map((f) => {
      return {
        mes: formatMonthLabel(f.mes),
        entradas: Number(f.entradas),
        saidas: Number(f.saidas),
        saldo: Number(f.saldo),
      };
    })
    .reverse();

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  const chartDataComAcumulado = chartData.map((d) => {
    saldoAcumulado += d.saldo;
    return { ...d, acumulado: saldoAcumulado };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LineChartIcon className="h-6 w-6 text-primary" />
            Fluxo de Caixa
          </h2>
          <p className="text-muted-foreground mt-1">Análise de saúde financeira e projeções</p>
        </div>
        <Select value={periodoView} onValueChange={(v) => setPeriodoView(v as "mensal" | "diario")}>
          <SelectTrigger className="w-[180px] rounded-xl font-bold text-xs h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="mensal">Visão Mensal</SelectItem>
            <SelectItem value="diario">Caixa Diário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {periodoView === "mensal" ? (
        <>
          {/* Resumo do período */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">
                  R${" "}
                  {fluxoMensal
                    .reduce((acc, f) => acc + Number(f.entradas), 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Saídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-red-600">
                  R${" "}
                  {fluxoMensal
                    .reduce((acc, f) => acc + Number(f.saidas), 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Saldo Acumulado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-black ${saldoAcumulado >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  R${" "}
                  {saldoAcumulado.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-primary" />
                  Amostragem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {fluxoMensal.length} meses
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">
                Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[350px] w-full">
                <SafeResponsiveContainer className="h-full" minHeight={350}>
                  <BarChart data={chartDataComAcumulado}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{
                        paddingBottom: "20px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    />
                    <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Caixa Diário */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Data do Caixa:
              </span>
              <input
                type="date"
                value={dataCaixa}
                onChange={(e) => setDataCaixa(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20"
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">
                  R${" "}
                  {(caixaDiario?.entradas || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Saídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-red-600">
                  R${" "}
                  {(caixaDiario?.saidas || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Saldo Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-black ${(caixaDiario?.saldo || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  R${" "}
                  {(caixaDiario?.saldo || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por forma de pagamento */}
          {caixaDiario?.porFormaPagamento &&
            Object.keys(caixaDiario.porFormaPagamento).length > 0 && (
              <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                    Por Meio de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(caixaDiario.porFormaPagamento).map(([forma, valor]) => (
                      <div
                        key={forma}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          {forma}
                        </p>
                        <p
                          className={`text-lg font-black ${valor >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          R${" "}
                          {valor.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
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
  );
}

export default function FluxoCaixaPage() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <FluxoCaixaContent />
      </div>
    </MainLayout>
  );
}
