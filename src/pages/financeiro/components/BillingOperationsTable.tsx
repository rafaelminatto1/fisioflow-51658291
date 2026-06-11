import { CheckCircle2, PenSquare, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/hooks/useFinancial";
import { renderStatusBadge } from "./FinancialUIUtils";

interface BillingOperationsTableProps {
	transactions: Transaction[];
	onNewTransaction: () => void;
	onEditTransaction: (transaction: Transaction) => void;
	onMarkAsPaid: (id: string) => void;
	onDeleteTransaction: (id: string) => void;
}

export function BillingOperationsTable({
	transactions,
	onNewTransaction,
	onEditTransaction,
	onMarkAsPaid,
	onDeleteTransaction,
}: BillingOperationsTableProps) {
	if (transactions.length === 0) {
		return (
			<EmptyState
				icon={Wallet}
				title="Sem transações neste período"
				description="Use o faturamento para registrar receitas, despesas e acompanhar a operação diária."
				action={{
					label: "Nova Transação",
					onClick: onNewTransaction,
				}}
			/>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left text-sm">
				<thead>
					<tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800">
						<th className="px-4 py-4">Data</th>
						<th className="px-4 py-4">Descrição</th>
						<th className="px-4 py-4">Tipo</th>
						<th className="px-4 py-4">Status</th>
						<th className="px-4 py-4 text-right">Valor</th>
						<th className="px-4 py-4 text-right">Ações</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-50 dark:divide-slate-900">
					{transactions.map((transaction) => (
						<tr
							key={transaction.id}
							className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
						>
							<td className="px-4 py-4 text-slate-500 dark:text-slate-400">
								{transaction.created_at
									? new Date(transaction.created_at).toLocaleDateString("pt-BR")
									: "-"}
							</td>
							<td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">
								{transaction.descricao || "Sem descrição"}
							</td>
							<td className="px-4 py-4">
								<Badge
									className={cn(
										"border-0",
										transaction.tipo === "receita"
											? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
											: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
									)}
								>
									{transaction.tipo}
								</Badge>
							</td>
							<td className="px-4 py-4">
								{renderStatusBadge(transaction.status)}
							</td>
							<td className="px-4 py-4 text-right font-black text-slate-950 dark:text-white">
								{formatCurrency(Number(transaction.valor))}
							</td>
							<td className="px-4 py-4">
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										size="icon"
										className="h-9 w-9 rounded-xl"
										onClick={() => onEditTransaction(transaction)}
									>
										<PenSquare className="h-4 w-4" />
									</Button>
									{transaction.status !== "concluido" &&
										transaction.status !== "pago" && (
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-9 rounded-xl"
												onClick={() => onMarkAsPaid(transaction.id)}
											>
												<CheckCircle2 className="h-4 w-4" />
											</Button>
										)}
									<Button
										variant="outline"
										size="icon"
										className="h-9 w-9 rounded-xl text-rose-600"
										onClick={() => onDeleteTransaction(transaction.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
