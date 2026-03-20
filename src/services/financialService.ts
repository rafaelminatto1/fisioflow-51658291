import { financialApi } from "@/api/v2/financial";
import { auditApi } from "@/lib/api/workers-client";
import { AppError } from "@/lib/errors/AppError";
import type { Transacao } from "@/types/workers";

export type Transaction = Transacao;

export interface FinancialStats {
	totalRevenue: number;
	pendingPayments: number;
	monthlyGrowth: number;
	paidCount: number;
	totalCount: number;
	averageTicket: number;
}

export type FinancialPeriod = "daily" | "weekly" | "monthly" | "all";

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
	static async fetchTransactions(limit = 300): Promise<Transaction[]> {
		try {
			const response = await financialApi.transacoes.list({ limit });
			return response.data || [];
		} catch (error) {
			throw AppError.from(error, "FinancialService.fetchTransactions");
		}
	}

	/**
	 * Fetch aggregated financial summary from backend cache
	 */
	static async fetchSummary(
		period: FinancialPeriod = "monthly",
	): Promise<FinancialStats> {
		try {
			const summary = await financialApi.summary(period);
			return {
				totalRevenue: Number(summary.data?.totalRevenue || 0),
				pendingPayments: Number(summary.data?.pendingPayments || 0),
				monthlyGrowth: Number(summary.data?.monthlyGrowth || 0),
				paidCount: Number(summary.data?.paidCount || 0),
				totalCount: Number(summary.data?.totalCount || 0),
				averageTicket: Number(summary.data?.averageTicket || 0),
			};
		} catch (error) {
			throw AppError.from(error, "FinancialService.fetchSummary");
		}
	}

	/**
	 * Calculate financial statistics from transactions
	 * Note: This logic is currently client-side but centralized here. Ideal for backend migration later.
	 */
	static calculateStats(transactions: Transaction[]): FinancialStats {
		const paidTransactions = transactions.filter(
			(t) => t.status === "concluido",
		);
		const pendingTransactions = transactions.filter(
			(t) => t.status === "pendente",
		);

		const totalRevenue = paidTransactions.reduce(
			(acc, t) => acc + Number(t.valor),
			0,
		);
		const pendingPayments = pendingTransactions.reduce(
			(acc, t) => acc + Number(t.valor),
			0,
		);

		// Calcular crescimento mensal real
		const currentMonth = new Date().getMonth();
		const currentYear = new Date().getFullYear();

		const currentMonthRevenue = paidTransactions
			.filter((t) => {
				const d = new Date(t.created_at || "");
				return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
			})
			.reduce((acc, t) => acc + Number(t.valor), 0);

		const lastMonthRevenue = paidTransactions
			.filter((t) => {
				const d = new Date(t.created_at || "");
				const lastMonthDate = new Date();
				lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
				return (
					d.getMonth() === lastMonthDate.getMonth() &&
					d.getFullYear() === lastMonthDate.getFullYear()
				);
			})
			.reduce((acc, t) => acc + Number(t.valor), 0);

		const monthlyGrowth =
			lastMonthRevenue > 0
				? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
				: currentMonthRevenue > 0
					? 100
					: 0;

		return {
			totalRevenue,
			pendingPayments,
			monthlyGrowth,
			paidCount: paidTransactions.length,
			totalCount: transactions.length,
			averageTicket:
				paidTransactions.length > 0
					? totalRevenue / paidTransactions.length
					: 0,
		};
	}

	/**
	 * Create a new transaction
	 */
	static async createTransaction(
		transaction: Omit<Transaction, "id" | "created_at" | "updated_at">,
	): Promise<Transaction> {
		try {
			const response = await financialApi.transacoes.create(transaction);
			const newTransaction = response.data as Transaction;

			// Log de auditoria: Lançamento Financeiro
			try {
				await auditApi.create({
					action: "INSERT",
					entity_type: "contas_financeiras",
					entity_id: newTransaction.id,
					metadata: {
						description: newTransaction.descricao,
						value: newTransaction.valor,
						type: newTransaction.tipo,
						timestamp: new Date().toISOString(),
					},
				});
			} catch (e) {
				/* silent fail */
			}

			return newTransaction;
		} catch (error) {
			throw AppError.from(error, "FinancialService.createTransaction");
		}
	}

	/**
	 * Update a transaction
	 */
	static async updateTransaction(
		id: string,
		updates: Partial<Transaction>,
	): Promise<Transaction> {
		try {
			const response = await financialApi.transacoes.update(id, updates);
			const updated = response.data as Transaction;

			// Log de auditoria: Alteração Financeira
			try {
				await auditApi.create({
					action: "UPDATE",
					entity_type: "contas_financeiras",
					entity_id: id,
					metadata: {
						description: updated.descricao,
						value: updated.valor,
						updates: Object.keys(updates),
						timestamp: new Date().toISOString(),
					},
				});
			} catch (e) {
				/* silent fail */
			}

			return updated;
		} catch (error) {
			throw AppError.from(error, "FinancialService.updateTransaction");
		}
	}

	/**
	 * Delete a transaction
	 */
	static async deleteTransaction(id: string): Promise<void> {
		try {
			await financialApi.transacoes.delete(id);

			// Log de auditoria: Exclusão Financeira
			try {
				await auditApi.create({
					action: "DELETE",
					entity_type: "contas_financeiras",
					entity_id: id,
					metadata: { timestamp: new Date().toISOString() },
				});
			} catch (e) {
				/* silent fail */
			}
		} catch (error) {
			throw AppError.from(error, "FinancialService.deleteTransaction");
		}
	}

	/**
	 * Mark a transaction as paid
	 */
	static async markAsPaid(id: string): Promise<Transaction> {
		try {
			const response = await financialApi.transacoes.update(id, {
				status: "concluido",
			});
			const updated = response.data as Transaction;

			// Log de auditoria: Pagamento Confirmado
			try {
				await auditApi.create({
					action: "UPDATE",
					entity_type: "contas_financeiras",
					entity_id: id,
					metadata: {
						description: updated.descricao,
						status: "paid",
						timestamp: new Date().toISOString(),
					},
				});
			} catch (e) {
				/* silent fail */
			}

			return updated;
		} catch (error) {
			throw AppError.from(error, "FinancialService.markAsPaid");
		}
	}

	/**
	 * Generate financial report for a specific event
	 */
	static async getEventReport(eventoId: string): Promise<FinancialReport> {
		try {
			const response = await financialApi.getEventReport(eventoId);
			return response.data as FinancialReport;
		} catch (error) {
			throw AppError.from(error, "FinancialService.getEventReport");
		}
	}

	/**
	 * Find a transaction by appointment ID stored in metadata
	 */
	static async findTransactionByAppointmentId(
		appointmentId: string,
	): Promise<Transaction | null> {
		try {
			const response = await financialApi.findByAppointment(appointmentId);
			return (response.data as Transaction | null) ?? null;
		} catch (error) {
			throw AppError.from(
				error,
				"FinancialService.findTransactionByAppointmentId",
			);
		}
	}
}
