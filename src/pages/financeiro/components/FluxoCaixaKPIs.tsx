import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

interface Props {
	stats: {
		totalEntradas: number;
		totalSaidas: number;
		saldoAcumulado: number;
		mesesCount: number;
	};
}

export function FluxoCaixaKPIs({ stats }: Props) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
						<TrendingUp className="h-3 w-3 text-emerald-500" />
						Total Entradas
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-black text-emerald-600">
						R${" "}
						{stats.totalEntradas.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
						<TrendingDown className="h-3 w-3 text-red-500" />
						Total Saídas
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-black text-red-600">
						R${" "}
						{stats.totalSaidas.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
						<DollarSign className="h-3 w-3" />
						Saldo Acumulado
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className={`text-2xl font-black ${stats.saldoAcumulado >= 0 ? "text-emerald-600" : "text-red-600"}`}
					>
						R${" "}
						{stats.saldoAcumulado.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
						<Calendar className="h-3 w-3 text-primary" />
						Amostragem
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
						{stats.mesesCount} meses analisados
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
