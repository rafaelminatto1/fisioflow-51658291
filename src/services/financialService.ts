
import { supabase } from '@/integrations/supabase/client';
import { AppError } from '@/lib/errors/AppError';
import { logger } from '@/lib/errors/logger';

export interface Transaction {
    id: string;
    user_id?: string;
    tipo: string;
    descricao?: string;
    valor: number;
    status: string;
    stripe_payment_intent_id?: string;
    stripe_refund_id?: string;
    metadata?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

export interface FinancialStats {
    totalRevenue: number;
    pendingPayments: number;
    monthlyGrowth: number;
    paidCount: number;
    totalCount: number;
    averageTicket: number;
}

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

export class FinancialService {
    /**
     * Fetch all transactions
     */
    static async fetchTransactions(): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw new AppError(error.message, error.code, 500);

            return data as Transaction[];
        } catch (error) {
            throw AppError.from(error, 'FinancialService.fetchTransactions');
        }
    }

    /**
     * Calculate financial statistics from transactions
     * Note: This logic is currently client-side but centralized here. Ideal for backend migration later.
     */
    static calculateStats(transactions: Transaction[]): FinancialStats {
        const paidTransactions = transactions.filter(t => t.status === 'concluido');
        const pendingTransactions = transactions.filter(t => t.status === 'pendente');

        const totalRevenue = paidTransactions.reduce((acc, t) => acc + Number(t.valor), 0);
        const pendingPayments = pendingTransactions.reduce((acc, t) => acc + Number(t.valor), 0);

        // Calcular crescimento mensal real
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const currentMonthRevenue = paidTransactions
            .filter(t => {
                const d = new Date(t.created_at || '');
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((acc, t) => acc + Number(t.valor), 0);

        const lastMonthRevenue = paidTransactions
            .filter(t => {
                const d = new Date(t.created_at || '');
                const lastMonthDate = new Date();
                lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
                return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
            })
            .reduce((acc, t) => acc + Number(t.valor), 0);

        const monthlyGrowth = lastMonthRevenue > 0
            ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : currentMonthRevenue > 0 ? 100 : 0;

        return {
            totalRevenue,
            pendingPayments,
            monthlyGrowth,
            paidCount: paidTransactions.length,
            totalCount: transactions.length,
            averageTicket: paidTransactions.length > 0 ? totalRevenue / paidTransactions.length : 0,
        };
    }

    /**
     * Create a new transaction
     */
    static async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .insert([transaction])
                .select()
                .single();

            if (error) throw new AppError(error.message, error.code, 400);
            return data as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.createTransaction');
        }
    }

    /**
     * Update a transaction
     */
    static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new AppError(error.message, error.code, 400);
            return data as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.updateTransaction');
        }
    }

    /**
     * Delete a transaction
     */
    static async deleteTransaction(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('transacoes')
                .delete()
                .eq('id', id);

            if (error) throw new AppError(error.message, error.code, 500);
        } catch (error) {
            throw AppError.from(error, 'FinancialService.deleteTransaction');
        }
    }

    /**
     * Mark a transaction as paid
     */
    static async markAsPaid(id: string): Promise<Transaction> {
        try {
            const { data, error } = await supabase
                .from('transacoes')
                .update({ status: 'concluido' })
                .eq('id', id)
                .select()
                .single();

            if (error) throw new AppError(error.message, error.code, 400);
            return data as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.markAsPaid');
        }
    }

    /**
     * Generate financial report for a specific event
     */
    static async getEventReport(eventoId: string): Promise<FinancialReport> {
        try {
            // Parallel fetch for better performance
            const [eventoRes, pagamentosRes, prestadoresRes, checklistRes] = await Promise.all([
                supabase.from("eventos").select("nome").eq("id", eventoId).single(),
                supabase.from("pagamentos").select("tipo, descricao, valor, pago_em").eq("evento_id", eventoId),
                supabase.from("prestadores").select("valor_acordado, status_pagamento").eq("evento_id", eventoId),
                supabase.from("checklist_items").select("quantidade, custo_unitario").eq("evento_id", eventoId)
            ]);

            if (eventoRes.error) throw eventoRes.error;
            if (pagamentosRes.error) throw pagamentosRes.error;
            if (prestadoresRes.error) throw prestadoresRes.error;
            if (checklistRes.error) throw checklistRes.error;

            const evento = eventoRes.data;
            const pagamentos = pagamentosRes.data;
            const prestadores = prestadoresRes.data;
            const checklist = checklistRes.data;

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
        } catch (error) {
            throw AppError.from(error, 'FinancialService.getEventReport');
        }
    }
}
