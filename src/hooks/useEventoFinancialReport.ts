import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinancialReport {
  eventoId: string;
  eventoNome: string;
  receitas: number;
  custosPrestadores: number;
  custosInsumos: number;
  outrosCustos: number;
  custoTotal: number;
  saldo: number;
  margem: number;
  pagamentosPendentes: number;
  detalhePagamentos: Array<{
    tipo: string;
    descricao: string;
    valor: number;
    pagoEm: string | null;
  }>;
}

export function useEventoFinancialReport(eventoId: string) {
  return useQuery({
    queryKey: ["evento-financial-report", eventoId],
    queryFn: async (): Promise<FinancialReport> => {
      const { data: evento, error: eventoError } = await supabase
        .from("eventos")
        .select("nome")
        .eq("id", eventoId)
        .single();

      if (eventoError) throw eventoError;

      const { data: pagamentos, error: pagamentosError } = await supabase
        .from("pagamentos")
        .select("tipo, descricao, valor, pago_em")
        .eq("evento_id", eventoId);

      if (pagamentosError) throw pagamentosError;

      const { data: prestadores, error: prestadoresError } = await supabase
        .from("prestadores")
        .select("valor_acordado, status_pagamento")
        .eq("evento_id", eventoId);

      if (prestadoresError) throw prestadoresError;

      const { data: checklist, error: checklistError } = await supabase
        .from("checklist_items")
        .select("quantidade, custo_unitario")
        .eq("evento_id", eventoId);

      if (checklistError) throw checklistError;

      const receitas = pagamentos
        ?.filter((p) => p.tipo === "receita")
        .reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;

      const custosPrestadores = prestadores
        ?.reduce((sum, p) => sum + Number(p.valor_acordado || 0), 0) || 0;

      const custosInsumos = checklist
        ?.reduce((sum, c) => sum + (Number(c.quantidade || 0) * Number(c.custo_unitario || 0)), 0) || 0;

      const outrosCustos = pagamentos
        ?.filter((p) => p.tipo !== "receita")
        .reduce((sum, p) => sum + Number(p.valor || 0), 0) || 0;

      const custoTotal = custosPrestadores + custosInsumos + outrosCustos;
      const saldo = receitas - custoTotal;
      const margem = receitas > 0 ? Math.round((saldo / receitas) * 100) : 0;

      const pagamentosPendentes = prestadores
        ?.filter((p) => p.status_pagamento === "PENDENTE")
        .reduce((sum, p) => sum + Number(p.valor_acordado || 0), 0) || 0;

      return {
        eventoId,
        eventoNome: evento.nome,
        receitas,
        custosPrestadores,
        custosInsumos,
        outrosCustos,
        custoTotal,
        saldo,
        margem,
        pagamentosPendentes,
        detalhePagamentos: pagamentos?.map((p) => ({
          tipo: p.tipo,
          descricao: p.descricao || "",
          valor: Number(p.valor || 0),
          pagoEm: p.pago_em,
        })) || [],
      };
    },
  });
}
