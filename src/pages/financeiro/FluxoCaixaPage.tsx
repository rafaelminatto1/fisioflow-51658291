import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LineChart as LineChartIcon } from "lucide-react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";

import { useFluxoCaixaLogic } from "@/hooks/useFluxoCaixaLogic";
import { FluxoCaixaKPIs } from "./components/FluxoCaixaKPIs";
import { FluxoCaixaChart } from "./components/FluxoCaixaChart";
import { CaixaDiarioView } from "./components/CaixaDiarioView";

export function FluxoCaixaContent() {
	const {
		dataCaixa,
		setDataCaixa,
		periodoView,
		setPeriodoView,
		caixaDiario,
		chartDataComAcumulado,
		stats,
		isLoading,
	} = useFluxoCaixaLogic();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<LineChartIcon className="h-6 w-6 text-primary" />
						Fluxo de Caixa
					</h2>
					<p className="text-muted-foreground mt-1">
						Análise de saúde financeira e projeções
					</p>
				</div>
				<Select
					value={periodoView}
					onValueChange={(v) => setPeriodoView(v as "mensal" | "diario")}
				>
					<SelectTrigger className="w-[180px] rounded-xl font-bold text-xs h-10">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="rounded-xl">
						<SelectItem value="mensal">Visão Mensal</SelectItem>
						<SelectItem value="diario">Caixa Diário</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<div className="text-center py-20 text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
					Sincronizando Fluxos...
				</div>
			) : periodoView === "mensal" ? (
				<>
					<FluxoCaixaKPIs stats={stats} />
					<FluxoCaixaChart data={chartDataComAcumulado} />
				</>
			) : (
				<CaixaDiarioView
					dataCaixa={dataCaixa}
					setDataCaixa={setDataCaixa}
					caixaDiario={caixaDiario}
				/>
			)}
		</div>
	);
}

export default function FluxoCaixaPage() {
	return (
		<PageLayout>
			<PageContainer>
				<div className="p-6 max-w-7xl mx-auto">
					<FluxoCaixaContent />
				</div>
			</PageContainer>
		</PageLayout>
	);
}
