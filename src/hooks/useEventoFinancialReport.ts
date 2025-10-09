import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialReport {
  evento: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    categoria: string;
    local: string;
  };
  prestadores: {
    total: number;
    pagos: number;
    pendentes: number;
    valor_total: number;
    valor_pago: number;
    valor_pendente: number;
  };
  checklist: {
    total_itens: number;
    itens_ok: number;
    itens_abertos: number;
    custo_total: number;
  };
  pagamentos: {
    total: number;
    por_tipo: Record<string, { count: number; valor: number }>;
    valor_total: number;
  };
  resumo: {
    custo_total: number;
    custo_prestadores: number;
    custo_checklist: number;
    outros_pagamentos: number;
  };
}

export function useEventoFinancialReport(eventoId: string) {
  return useQuery({
    queryKey: ['evento-financial-report', eventoId],
    queryFn: async (): Promise<FinancialReport> => {
      // Buscar evento
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single();

      if (eventoError) throw eventoError;

      // Buscar prestadores
      const { data: prestadores, error: prestadoresError } = await supabase
        .from('prestadores')
        .select('*')
        .eq('evento_id', eventoId);

      if (prestadoresError) throw prestadoresError;

      const prestadoresStats = {
        total: prestadores.length,
        pagos: prestadores.filter(p => p.status_pagamento === 'PAGO').length,
        pendentes: prestadores.filter(p => p.status_pagamento === 'PENDENTE').length,
        valor_total: prestadores.reduce((acc, p) => acc + Number(p.valor_acordado), 0),
        valor_pago: prestadores
          .filter(p => p.status_pagamento === 'PAGO')
          .reduce((acc, p) => acc + Number(p.valor_acordado), 0),
        valor_pendente: prestadores
          .filter(p => p.status_pagamento === 'PENDENTE')
          .reduce((acc, p) => acc + Number(p.valor_acordado), 0),
      };

      // Buscar checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('evento_id', eventoId);

      if (checklistError) throw checklistError;

      const checklistStats = {
        total_itens: checklist.length,
        itens_ok: checklist.filter(i => i.status === 'OK').length,
        itens_abertos: checklist.filter(i => i.status === 'ABERTO').length,
        custo_total: checklist.reduce(
          (acc, i) => acc + (i.quantidade * Number(i.custo_unitario)),
          0
        ),
      };

      // Buscar pagamentos
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('evento_id', eventoId);

      if (pagamentosError) throw pagamentosError;

      const pagamentosPorTipo = pagamentos.reduce((acc, p) => {
        if (!acc[p.tipo]) {
          acc[p.tipo] = { count: 0, valor: 0 };
        }
        acc[p.tipo].count++;
        acc[p.tipo].valor += Number(p.valor);
        return acc;
      }, {} as Record<string, { count: number; valor: number }>);

      const pagamentosStats = {
        total: pagamentos.length,
        por_tipo: pagamentosPorTipo,
        valor_total: pagamentos.reduce((acc, p) => acc + Number(p.valor), 0),
      };

      // Calcular resumo
      const resumo = {
        custo_prestadores: prestadoresStats.valor_total,
        custo_checklist: checklistStats.custo_total,
        outros_pagamentos: pagamentosStats.valor_total,
        custo_total:
          prestadoresStats.valor_total +
          checklistStats.custo_total +
          pagamentosStats.valor_total,
      };

      return {
        evento,
        prestadores: prestadoresStats,
        checklist: checklistStats,
        pagamentos: pagamentosStats,
        resumo,
      };
    },
    enabled: !!eventoId,
  });
}
