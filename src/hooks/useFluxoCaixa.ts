/**
 * useFluxoCaixa - Migrated to Neon/Workers
 */

import { useQuery } from "@tanstack/react-query";
import { financialApi, type Transacao } from "@/api/v2";
import { formatDateToLocalISO, parseResponseDateOrNull } from "@/utils/dateUtils";

export interface MovimentacaoCaixa {
  id: string;
  data: string | null;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  categoria: string | null;
  forma_pagamento: string | null;
  created_at: string;
}

export interface FluxoCaixaResumo {
  id: string;
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

function normalizeMovimentacao(row: Transacao): MovimentacaoCaixa {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const record = row as Record<string, unknown>;
  const rawDateCandidates = [
    record.created_at,
    record.createdAt,
    record.data_vencimento,
    record.dataVencimento,
    record.updated_at,
    record.updatedAt,
  ];
  const data =
    rawDateCandidates
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => parseResponseDateOrNull(value))
      .find((value): value is Date => value instanceof Date) ?? null;
  const createdAt =
    rawDateCandidates.find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ) ?? "";

  return {
    id: row.id,
    data: data ? formatDateToLocalISO(data) : null,
    tipo: row.tipo as "entrada" | "saida",
    valor: Number(row.valor),
    descricao: row.descricao ?? "",
    categoria: row.categoria ?? null,
    forma_pagamento: typeof metadata.forma_pagamento === "string" ? metadata.forma_pagamento : null,
    created_at: createdAt,
  };
}

export function useMovimentacoesCaixa(dataInicio?: string, dataFim?: string) {
  return useQuery({
    queryKey: ["movimentacoes-caixa", dataInicio, dataFim],
    queryFn: async () => {
      const res = await financialApi.transacoes.list({
        dateFrom: dataInicio,
        dateTo: dataFim,
        limit: 1000,
      });
      return ((res?.data ?? []) as Transacao[]).map(normalizeMovimentacao);
    },
  });
}

export function useFluxoCaixaResumo() {
  return useQuery({
    queryKey: ["fluxo-caixa-resumo"],
    queryFn: async () => {
      const res = await financialApi.transacoes.list({ limit: 2000 });
      const movimentacoes = ((res?.data ?? []) as Transacao[]).map(normalizeMovimentacao);
      const grouped = new Map<string, FluxoCaixaResumo>();

      movimentacoes.forEach((mov) => {
        if (!mov.data) return;
        const mes = mov.data.slice(0, 7);
        const current = grouped.get(mes) ?? {
          id: mes,
          mes,
          entradas: 0,
          saidas: 0,
          saldo: 0,
        };
        if (mov.tipo === "entrada") current.entradas += Number(mov.valor);
        else current.saidas += Number(mov.valor);
        current.saldo = current.entradas - current.saidas;
        grouped.set(mes, current);
      });

      return Array.from(grouped.values())
        .sort((a, b) => b.mes.localeCompare(a.mes))
        .slice(0, 12);
    },
  });
}

export function useCaixaDiario(data: string) {
  return useQuery({
    queryKey: ["caixa-diario", data],
    queryFn: async () => {
      const res = await financialApi.transacoes.list({
        dateFrom: data,
        dateTo: data,
        limit: 500,
      });
      const movimentacoes = ((res?.data ?? []) as Transacao[]).map(normalizeMovimentacao);

      const entradas = movimentacoes
        .filter((m) => m.tipo === "entrada")
        .reduce((acc, m) => acc + Number(m.valor), 0);
      const saidas = movimentacoes
        .filter((m) => m.tipo === "saida")
        .reduce((acc, m) => acc + Number(m.valor), 0);

      const porFormaPagamento: Record<string, number> = {};
      movimentacoes.forEach((m) => {
        const forma = m.forma_pagamento || "Não informado";
        porFormaPagamento[forma] =
          (porFormaPagamento[forma] || 0) + Number(m.valor) * (m.tipo === "entrada" ? 1 : -1);
      });

      return {
        movimentacoes,
        entradas,
        saidas,
        saldo: entradas - saidas,
        porFormaPagamento,
      };
    },
    enabled: !!data,
  });
}
