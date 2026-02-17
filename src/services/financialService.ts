import { financialApi } from '@/integrations/firebase/functions';
import { AppError } from '@/lib/errors/AppError';

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
            const response = await financialApi.list(1000);
            return response.data || [];
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
            const response = await financialApi.create(transaction);
            return response as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.createTransaction');
        }
    }

    /**
     * Update a transaction
     */
    static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        try {
            const response = await financialApi.update(id, updates);
            return response as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.updateTransaction');
        }
    }

    /**
     * Delete a transaction
     */
    static async deleteTransaction(id: string): Promise<void> {
        try {
            await financialApi.delete(id);
        } catch (error) {
            throw AppError.from(error, 'FinancialService.deleteTransaction');
        }
    }

    /**
     * Mark a transaction as paid
     */
    static async markAsPaid(id: string): Promise<Transaction> {
        try {
            const response = await financialApi.update(id, { status: 'concluido' });
            return response as Transaction;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.markAsPaid');
        }
    }

    /**
     * Generate financial report for a specific event
     */
    static async getEventReport(eventoId: string): Promise<FinancialReport> {
        try {
            const response = await financialApi.getEventReport(eventoId);
            return response as FinancialReport;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.getEventReport');
        }
    }

    /**
     * Find a transaction by appointment ID stored in metadata
     */
    static async findTransactionByAppointmentId(appointmentId: string): Promise<Transaction | null> {
        try {
            const response = await financialApi.findByAppointment(appointmentId);
            return response as Transaction | null;
        } catch (error) {
            throw AppError.from(error, 'FinancialService.findTransactionByAppointmentId');
        }
    }
}
