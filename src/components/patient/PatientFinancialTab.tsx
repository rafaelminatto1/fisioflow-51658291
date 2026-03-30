import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, CreditCard, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { parseResponseDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

interface PatientFinancialTabProps {
	appointments: any[];
}

export function PatientFinancialTab({
	appointments,
}: PatientFinancialTabProps) {
	const transactions = appointments;

	const totalPaid = useMemo(
		() =>
			transactions
				.filter(
					(t: any) =>
						t.payment_status === "paid_single" ||
						t.payment_status === "paid_package",
				)
				.reduce(
					(sum: number, t: any) => sum + (Number(t.payment_amount) || 0),
					0,
				),
		[transactions],
	);

	const totalPending = useMemo(
		() =>
			transactions
				.filter((t: any) => t.payment_status === "pending")
				.reduce(
					(sum: number, t: any) => sum + (Number(t.payment_amount) || 0),
					0,
				),
		[transactions],
	);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="bg-white border-emerald-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
							<DollarSign className="h-6 w-6 text-emerald-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Total Pago
							</span>
							<p className="text-2xl font-bold text-slate-900">
								R$ {totalPaid.toFixed(2)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white border-amber-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
							<CreditCard className="h-6 w-6 text-amber-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Pendente
							</span>
							<p className="text-2xl font-bold text-slate-900">
								R$ {totalPending.toFixed(2)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-white border-blue-100 shadow-sm rounded-xl overflow-hidden">
					<CardContent className="p-5 flex items-center gap-4">
						<div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
							<CalendarIcon className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
								Total Sessões
							</span>
							<p className="text-2xl font-bold text-slate-900">
								{transactions.length}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="bg-white border-blue-100 shadow-sm rounded-xl">
				<CardHeader className="pb-3 border-b border-blue-50">
					<CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
						<DollarSign className="w-4 h-4 text-blue-600" />
						Histórico de Pagamentos
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-4">
					{transactions.length === 0 ? (
						<div className="text-center py-8">
							<CreditCard className="h-10 w-10 mx-auto mb-3 text-slate-200" />
							<p className="text-sm font-medium text-slate-500">
								Nenhuma transação registrada
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{transactions.map((tx: any) => (
								<div
									key={tx.id}
									className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 transition-colors group"
								>
									<div className="flex items-center gap-4">
										<div
											className={cn(
												"h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
												tx.payment_status === "paid_single" ||
													tx.payment_status === "paid_package"
													? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
													: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
											)}
										>
											<CreditCard className="h-5 w-5" />
										</div>
										<div>
											<p className="font-semibold text-sm text-slate-800">
												{format(
													parseResponseDate(tx.appointment_date),
													"dd 'de' MMM, yyyy",
													{ locale: ptBR },
												)}
											</p>
											<p className="text-xs text-slate-500 mt-0.5">
												{tx.type} • {tx.payment_method || "Pendente"}
												{tx.installments > 1 && ` • ${tx.installments}x`}
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="font-bold text-slate-900">
											R$ {Number(tx.payment_amount || 0).toFixed(2)}
										</p>
										<Badge
											variant="outline"
											className={cn(
												"mt-1 px-2 py-0 text-[10px] font-bold uppercase tracking-wider",
												tx.payment_status === "paid_single" ||
													tx.payment_status === "paid_package"
													? "border-emerald-100 bg-emerald-50 text-emerald-700"
													: "border-amber-100 bg-amber-50 text-amber-700",
											)}
										>
											{tx.payment_status === "paid_single" ||
											tx.payment_status === "paid_package"
												? "Pago"
												: "Pendente"}
										</Badge>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
