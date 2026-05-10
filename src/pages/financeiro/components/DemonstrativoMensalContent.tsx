import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useDemonstrativoMensalLogic } from "@/hooks/useDemonstrativoMensalLogic";
import { DemonstrativoKPIs } from "./DemonstrativoKPIs";
import { RevenueFunnel } from "./RevenueFunnel";
import { FinancialCharts } from "./FinancialCharts";
import { CategorySummaryTable } from "./CategorySummaryTable";

export function DemonstrativoMensalContent() {
  const {
    currentDate,
    stats,
    prevStats,
    chartData,
    categoryData,
    isInitialLoading,
    actions,
  } = useDemonstrativoMensalLogic();

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Gerando Inteligência Financeira...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={actions.prevMonth}
            className="rounded-full h-10 w-10 border-none shadow-sm bg-white dark:bg-slate-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center min-w-[150px]">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Período de Análise
              </span>
            </div>
            <h2 className="text-xl font-black capitalize tracking-tight">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={actions.nextMonth}
            className="rounded-full h-10 w-10 border-none shadow-sm bg-white dark:bg-slate-900"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 border-none shadow-sm bg-white dark:bg-slate-900"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={actions.exportCSV}
            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 border-none shadow-sm bg-white dark:bg-slate-900"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <DemonstrativoKPIs stats={stats} prevStats={prevStats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 rounded-[32px] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  Tendência de Performance
                </h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Histórico de Receitas vs Despesas (6 meses)
                </p>
              </div>
            </div>
            <FinancialCharts chartData={chartData} categoryData={categoryData} />
          </CardContent>
        </Card>

        <RevenueFunnel stats={stats} />
      </div>

      <Card className="rounded-[32px] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-8">
          <div className="mb-8">
            <h3 className="text-lg font-black tracking-tight">
              Detalhamento por Categoria
            </h3>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Análise granular de entradas e saídas no mês corrente
            </p>
          </div>
          <CategorySummaryTable categoryData={categoryData} />
        </CardContent>
      </Card>
    </div>
  );
}
