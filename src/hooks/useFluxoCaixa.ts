/**
 * useFluxoCaixa - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('movimentacoes_caixa') → Firestore collection 'movimentacoes_caixa'
 * - supabase.from('fluxo_caixa_resumo') → Firestore collection 'fluxo_caixa_resumo'
 */

import { useQuery } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';


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
  id: string;
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

// Helper to convert Firestore doc to MovimentacaoCaixa
const convertDocToMovimentacaoCaixa = (doc: { id: string; data: () => Record<string, unknown> }): MovimentacaoCaixa => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as MovimentacaoCaixa;
};

// Helper to convert Firestore doc to FluxoCaixaResumo
const convertDocToFluxoCaixaResumo = (doc: { id: string; data: () => Record<string, unknown> }): FluxoCaixaResumo => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as FluxoCaixaResumo;
};

export function useMovimentacoesCaixa(dataInicio?: string, dataFim?: string) {
  return useQuery({
    queryKey: ['movimentacoes-caixa', dataInicio, dataFim],
    queryFn: async () => {
      let q = query(
        collection(db, 'movimentacoes_caixa'),
        orderBy('data', 'desc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToMovimentacaoCaixa);

      // Filter by date range if provided
      if (dataInicio) {
        data = data.filter(m => m.data >= dataInicio);
      }
      if (dataFim) {
        data = data.filter(m => m.data <= dataFim);
      }

      return data;
    },
  });
}

export function useFluxoCaixaResumo() {
  return useQuery({
    queryKey: ['fluxo-caixa-resumo'],
    queryFn: async () => {
      const q = query(
        collection(db, 'fluxo_caixa_resumo'),
        orderBy('mes', 'desc'),
        limit(12)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToFluxoCaixaResumo);
    },
  });
}

export function useCaixaDiario(data: string) {
  return useQuery({
    queryKey: ['caixa-diario', data],
    queryFn: async () => {
      const q = query(
        collection(db, 'movimentacoes_caixa'),
        where('data', '==', data),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      const movimentacoes = snapshot.docs.map(convertDocToMovimentacaoCaixa);

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
