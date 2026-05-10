import { useState, useMemo } from "react";
import { useFluxoCaixaResumo, useCaixaDiario } from "@/hooks/useFluxoCaixa";
import { todayYMD } from "@/lib/date-utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function useFluxoCaixaLogic() {
  const [dataCaixa, setDataCaixa] = useState(() => todayYMD());
  const [periodoView, setPeriodoView] = useState<"mensal" | "diario">("mensal");

  const { data: fluxoMensal = [], isLoading: isLoadingMensal } = useFluxoCaixaResumo();
  const { data: caixaDiario, isLoading: isLoadingDiario } = useCaixaDiario(dataCaixa);

  const chartDataComAcumulado = useMemo(() => {
    const chartData = fluxoMensal
      .map((f) => ({
        mes: formatMonthLabel(f.mes),
        entradas: Number(f.entradas),
        saidas: Number(f.saidas),
        saldo: Number(f.saldo),
      }))
      .reverse();

    let saldoAcumulado = 0;
    return chartData.map((d) => {
      saldoAcumulado += d.saldo;
      return { ...d, acumulado: saldoAcumulado };
    });
  }, [fluxoMensal]);

  const stats = useMemo(() => {
    const totalEntradas = fluxoMensal.reduce((acc, f) => acc + Number(f.entradas), 0);
    const totalSaidas = fluxoMensal.reduce((acc, f) => acc + Number(f.saidas), 0);
    const saldoAcumulado = chartDataComAcumulado[chartDataComAcumulado.length - 1]?.acumulado || 0;

    return {
      totalEntradas,
      totalSaidas,
      saldoAcumulado,
      mesesCount: fluxoMensal.length,
    };
  }, [fluxoMensal, chartDataComAcumulado]);

  return {
    dataCaixa,
    setDataCaixa,
    periodoView,
    setPeriodoView,
    fluxoMensal,
    caixaDiario,
    chartDataComAcumulado,
    stats,
    isLoading: isLoadingMensal || isLoadingDiario,
  };
}
