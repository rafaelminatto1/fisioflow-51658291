import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import type { DemonstrativoData } from "@/hooks/useDemonstrativoMensalLogic";

interface Props {
	demoData: DemonstrativoData;
	growth: { revenue: number; balance: number };
}

export function DemonstrativoKPIs({ demoData, growth }: Props) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			<Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
						<TrendingUp className="h-4 w-4" />
						Total de Entradas
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold text-green-700 dark:text-green-400">
						R${" "}
						{demoData.entradas.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
					{growth.revenue !== 0 && (
						<div
							className={`flex items-center text-xs mt-1 ${growth.revenue > 0 ? "text-green-600" : "text-red-600"}`}
						>
							{growth.revenue > 0 ? (
								<TrendingUp className="h-3 w-3 mr-1" />
							) : (
								<TrendingDown className="h-3 w-3 mr-1" />
							)}
							{growth.revenue > 0 ? "+" : ""}
							{growth.revenue.toFixed(1)}% vs mês anterior
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
						<TrendingDown className="h-4 w-4" />
						Total de Saídas
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold text-red-700 dark:text-red-400">
						R${" "}
						{demoData.saidas.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{((demoData.saidas / (demoData.entradas || 1)) * 100).toFixed(1)}%
						das entradas
					</div>
				</CardContent>
			</Card>

			<Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						Saldo do Período
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className={`text-3xl font-bold ${demoData.saldo >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
					>
						R${" "}
						{demoData.saldo.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
					{growth.balance !== 0 && (
						<div
							className={`flex items-center text-xs mt-1 ${growth.balance > 0 ? "text-green-600" : "text-red-600"}`}
						>
							{growth.balance > 0 ? (
								<TrendingUp className="h-3 w-3 mr-1" />
							) : (
								<TrendingDown className="h-3 w-3 mr-1" />
							)}
							{growth.balance > 0 ? "+" : ""}
							{growth.balance.toFixed(1)}% vs mês anterior
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
						<Target className="h-4 w-4" />
						Ticket Médio
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
						R${" "}
						{demoData.ticketMedio.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{demoData.totalAtendimentos} atendimentos
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
