import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { appointmentsApi, financialApi, type ContaFinanceira, type Transacao } from "@/api/v2";
import { useOrganizations } from "@/hooks/useOrganizations";

export interface DemonstrativoData {
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

export interface HistoricoItem {
  mes: string;
  entradas: number;
  saidas: number;
}

function toDayRange(year: string, month: string) {
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
  return {
    dateFrom: format(startOfMonth(date), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

function sumValores(items: Array<{ valor?: string | number }>) {
  return items.reduce((acc, item) => acc + Number(item.valor ?? 0), 0);
}

export function useDemonstrativoMensalLogic() {
  const { currentOrganization } = useOrganizations();
  const organizationId = currentOrganization?.id;

  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), "yyyy-MM").split("-")[1]);
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));

  const meses = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, "0"),
        label: format(new Date(new Date().getFullYear(), i, 1), "MMMM", {
          locale: ptBR,
        }),
      })),
    [],
  );

  const anos = useMemo(
    () => Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)),
    [],
  );

  const { data: demoData, isLoading } = useQuery({
    queryKey: ["demonstrativo-mensal", organizationId, anoSelecionado, mesSelecionado],
    queryFn: async (): Promise<DemonstrativoData> => {
      if (!organizationId) throw new Error("Organização não identificada");
      const { dateFrom, dateTo } = toDayRange(anoSelecionado, mesSelecionado);

      const [transacoesRes, contasReceberRes, contasPagarRes, appointmentsRes] = await Promise.all([
        financialApi.transacoes.list({ dateFrom, dateTo, limit: 1000 }),
        financialApi.contas.list({
          tipo: "receber",
          status: "pendente",
          dateFrom,
          dateTo,
          limit: 1000,
        }),
        financialApi.contas.list({
          tipo: "pagar",
          status: "pendente",
          dateFrom,
          dateTo,
          limit: 1000,
        }),
        appointmentsApi.list({
          dateFrom,
          dateTo,
          status: "atendido",
          limit: 1000,
        }),
      ]);

      const movimentacoes = (transacoesRes?.data ?? []) as Transacao[];
      const entradas = movimentacoes.filter((m) => m.tipo === "entrada");
      const saidas = movimentacoes.filter((m) => m.tipo === "saida");

      const totalEntradas = entradas.reduce((acc, m) => acc + Number(m.valor), 0);
      const totalSaidas = saidas.reduce((acc, m) => acc + Number(m.valor), 0);

      const entradasPorCategoria: Record<string, number> = {};
      const saidasPorCategoria: Record<string, number> = {};
      const entradasPorFormaPagamento: Record<string, number> = {};

      entradas.forEach((m) => {
        const cat = m.categoria || "Outros";
        entradasPorCategoria[cat] = (entradasPorCategoria[cat] || 0) + Number(m.valor);
        const metadata = (m.metadata ?? {}) as Record<string, unknown>;
        const forma =
          typeof metadata.forma_pagamento === "string" ? metadata.forma_pagamento : "Não informado";
        entradasPorFormaPagamento[forma] =
          (entradasPorFormaPagamento[forma] || 0) + Number(m.valor);
      });

      saidas.forEach((m) => {
        const cat = m.categoria || "Outros";
        saidasPorCategoria[cat] = (saidasPorCategoria[cat] || 0) + Number(m.valor);
      });

      const contasReceber = (contasReceberRes?.data ?? []) as ContaFinanceira[];
      const contasPagar = (contasPagarRes?.data ?? []) as ContaFinanceira[];
      const totalAtendimentos = (appointmentsRes?.data ?? []).length;

      return {
        periodo: `${meses.find((m) => m.value === mesSelecionado)?.label} de ${anoSelecionado}`,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
        entradasPorCategoria,
        saidasPorCategoria,
        entradasPorFormaPagamento,
        contasReceber: sumValores(contasReceber),
        contasPagar: sumValores(contasPagar),
        totalAtendimentos,
        ticketMedio: totalAtendimentos ? totalEntradas / totalAtendimentos : 0,
      };
    },
    enabled: !!organizationId && !!anoSelecionado && !!mesSelecionado,
  });

  const { data: demoMesAnterior } = useQuery({
    queryKey: ["demonstrativo-mes-anterior", organizationId, anoSelecionado, mesSelecionado],
    queryFn: async () => {
      const dataAtual = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, 1);
      const dataAnterior = subMonths(dataAtual, 1);
      const { dateFrom, dateTo } = {
        dateFrom: format(startOfMonth(dataAnterior), "yyyy-MM-dd"),
        dateTo: format(endOfMonth(dataAnterior), "yyyy-MM-dd"),
      };
      const res = await financialApi.transacoes.list({
        dateFrom,
        dateTo,
        limit: 1000,
      });
      const movimentacoes = (res?.data ?? []) as Array<{
        tipo: string;
        valor: string | number;
      }>;
      const totalEntradas = movimentacoes
        .filter((m) => m.tipo === "entrada")
        .reduce((acc, m) => acc + Number(m.valor), 0);
      const totalSaidas = movimentacoes
        .filter((m) => m.tipo === "saida")
        .reduce((acc, m) => acc + Number(m.valor), 0);

      return {
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
      };
    },
    enabled: !!demoData && !!organizationId,
  });

  const { data: historicoData } = useQuery({
    queryKey: ["demonstrativo-historico", organizationId, anoSelecionado, mesSelecionado],
    queryFn: async () => {
      const base = new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1, 1);
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(base, 5 - i);
          return financialApi.transacoes
            .list({
              dateFrom: format(startOfMonth(d), "yyyy-MM-dd"),
              dateTo: format(endOfMonth(d), "yyyy-MM-dd"),
              limit: 1000,
            })
            .then((res) => {
              const movs = (res?.data ?? []) as Array<{ tipo: string; valor: string | number }>;
              return {
                mes: format(d, "MMM/yy", { locale: ptBR }),
                entradas: movs
                  .filter((m) => m.tipo === "entrada")
                  .reduce((s, m) => s + Number(m.valor), 0),
                saidas: movs
                  .filter((m) => m.tipo === "saida")
                  .reduce((s, m) => s + Number(m.valor), 0),
              };
            });
        }),
      );
      return results as HistoricoItem[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const growth = useMemo(() => {
    if (!demoMesAnterior || !demoData) return { revenue: 0, balance: 0 };
    return {
      revenue:
        ((demoData.entradas - demoMesAnterior.entradas) / (demoMesAnterior.entradas || 1)) * 100,
      balance:
        ((demoData.saldo - demoMesAnterior.saldo) / Math.abs(demoMesAnterior.saldo || 1)) * 100,
    };
  }, [demoData, demoMesAnterior]);

  return {
    organizationId,
    mesSelecionado,
    setMesSelecionado,
    anoSelecionado,
    setAnoSelecionado,
    meses,
    anos,
    demoData,
    isLoading,
    historicoData,
    growth,
  };
}
