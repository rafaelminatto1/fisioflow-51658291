import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MovimentacaoCaixa {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: string | null;
  forma_pagamento: string | null;
  created_at: string;
}

export interface FluxoCaixaResumo {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export function useMovimentacoesCaixa(dataInicio?: string, dataFim?: string) {
  return useQuery({
    queryKey: ['movimentacoes-caixa', dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes_caixa')
        .select('*')
        .order('data', { ascending: false });
      
      if (dataInicio) query = query.gte('data', dataInicio);
      if (dataFim) query = query.lte('data', dataFim);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MovimentacaoCaixa[];
    },
  });
}

export function useFluxoCaixaResumo() {
  return useQuery({
    queryKey: ['fluxo-caixa-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fluxo_caixa_resumo')
        .select('*')
        .order('mes', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as FluxoCaixaResumo[];
    },
  });
}

export function useCaixaDiario(data: string) {
  return useQuery({
    queryKey: ['caixa-diario', data],
    queryFn: async () => {
      const { data: movs, error } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .eq('data', data)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const movimentacoes = movs as MovimentacaoCaixa[];
      const entradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + Number(m.valor), 0);
      const saidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + Number(m.valor), 0);
      
      // Agrupar por forma de pagamento
      const porFormaPagamento: Record<string, number> = {};
      movimentacoes.forEach(m => {
        const forma = m.forma_pagamento || 'Não informado';
        porFormaPagamento[forma] = (porFormaPagamento[forma] || 0) + Number(m.valor) * (m.tipo === 'entrada' ? 1 : -1);
      });
      
      return {
        movimentacoes,
        entradas,
        saidas,
        saldo: entradas - saidas,
        porFormaPagamento,
      };
    },
  });
}
