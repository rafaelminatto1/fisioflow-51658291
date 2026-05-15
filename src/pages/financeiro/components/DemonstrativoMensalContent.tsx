import { addMonths, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Download,
	Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useDemonstrativoMensalLogic } from "@/hooks/useDemonstrativoMensalLogic";
import { CategorySummaryTable } from "./CategorySummaryTable";
import { DemonstrativoKPIs } from "./DemonstrativoKPIs";
import { FinancialCharts } from "./FinancialCharts";
import { RevenueFunnel } from "./RevenueFunnel";

export function DemonstrativoMensalContent() {
	const {
		demoData,
		growth,
		historicoData,
		isLoading,
		mesSelecionado,
		setMesSelecionado,
		anoSelecionado,
		setAnoSelecionado,
	} = useDemonstrativoMensalLogic();

	const currentDate = new Date(
		parseInt(anoSelecionado, 10),
		parseInt(mesSelecionado, 10) - 1,
		1,
	);

	const handlePrevMonth = () => {
		const prev = subMonths(currentDate, 1);
		setMesSelecionado(format(prev, "MM"));
		setAnoSelecionado(format(prev, "yyyy"));
	};

	const handleNextMonth = () => {
		const next = addMonths(currentDate, 1);
		setMesSelecionado(format(next, "MM"));
		setAnoSelecionado(format(next, "yyyy"));
	};

	const handleExportCSV = () => {
		if (!demoData) return;

		const headers = ["Categoria", "Entradas", "Saídas"];
		const rows = Object.keys({
			...demoData.entradasPorCategoria,
			...demoData.saidasPorCategoria,
		}).map((cat) => [
			cat,
			(demoData.entradasPorCategoria[cat] || 0).toString(),
			(demoData.saidasPorCategoria[cat] || 0).toString(),
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((r) => r.join(",")),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`demonstrativo-${anoSelecionado}-${mesSelecionado}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (isLoading || !demoData) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
					Gerando Inteligência Financeira...
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="icon"
						onClick={handlePrevMonth}
						className="rounded-full h-10 w-10 border-none shadow-sm bg-white dark:bg-slate-900"
					>
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<div className="flex flex-col items-center min-w-[150px]">
						<div className="flex items-center gap-2 text-slate-400">
							<Calendar className="h-3 w-3" />
							<span className="text-[10px] font-black uppercase tracking-widest">
								Período de Análise
							</span>
						</div>
						<h2 className="text-xl font-black capitalize tracking-tight">
							{format(currentDate, "MMMM yyyy", { locale: ptBR })}
						</h2>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={handleNextMonth}
						className="rounded-full h-10 w-10 border-none shadow-sm bg-white dark:bg-slate-900"
					>
						<ChevronRight className="h-5 w-5" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() => window.print()}
						className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 border-none shadow-sm bg-white dark:bg-slate-900"
					>
						<Printer className="h-4 w-4 mr-2" />
						Imprimir
					</Button>
					<Button
						variant="outline"
						onClick={handleExportCSV}
						className="rounded-xl font-bold text-xs uppercase tracking-wider h-10 border-none shadow-sm bg-white dark:bg-slate-900"
					>
						<Download className="h-4 w-4 mr-2" />
						Exportar CSV
					</Button>
				</div>
			</div>

			<DemonstrativoKPIs demoData={demoData} growth={growth} />

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				<Card className="xl:col-span-2 rounded-[32px] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
					<CardContent className="p-8">
						<div className="flex items-center justify-between mb-8">
							<div>
								<h3 className="text-lg font-black tracking-tight">
									Tendência de Performance
								</h3>
								<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
									Histórico de Receitas vs Despesas (6 meses)
								</p>
							</div>
						</div>
						<FinancialCharts
							demoData={demoData}
							historicoData={historicoData}
						/>
					</CardContent>
				</Card>

				<RevenueFunnel demoData={demoData} />
			</div>

			<Card className="rounded-[32px] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
				<CardContent className="p-8">
					<div className="mb-8">
						<h3 className="text-lg font-black tracking-tight">
							Detalhamento por Categoria
						</h3>
						<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
							Análise granular de entradas e saídas no mês corrente
						</p>
					</div>
					<CategorySummaryTable demoData={demoData} />
				</CardContent>
			</Card>
		</div>
	);
}
