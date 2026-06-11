import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Resumo {
	totalReceber: number;
	receberAtrasado: number;
	totalPagar: number;
	pagarAtrasado: number;
	receberHoje: number;
	pagarHoje: number;
}

interface Props {
	resumo?: Resumo;
}

export function ContasResumoCards({ resumo }: Props) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
						A Receber
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-black text-emerald-600">
						R${" "}
						{resumo?.totalReceber.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						}) || "0,00"}
					</div>
					{(resumo?.receberAtrasado || 0) > 0 && (
						<p className="text-[10px] font-bold text-destructive uppercase mt-1">
							{resumo?.receberAtrasado} atrasados
						</p>
					)}
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
						A Pagar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-black text-red-600">
						R${" "}
						{resumo?.totalPagar.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						}) || "0,00"}
					</div>
					{(resumo?.pagarAtrasado || 0) > 0 && (
						<p className="text-[10px] font-bold text-destructive uppercase mt-1">
							{resumo?.pagarAtrasado} atrasados
						</p>
					)}
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
						Vencendo Hoje
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-black text-amber-500">
						{(resumo?.receberHoje || 0) + (resumo?.pagarHoje || 0)}
					</div>
					<p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
						Lançamentos
					</p>
				</CardContent>
			</Card>
			<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
				<CardHeader className="pb-2">
					<CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
						Projetado
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className={`text-2xl font-black ${(resumo?.totalReceber || 0) - (resumo?.totalPagar || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
					>
						R${" "}
						{(
							(resumo?.totalReceber || 0) - (resumo?.totalPagar || 0)
						).toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
						})}
					</div>
					<p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
						Saldo Final
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
