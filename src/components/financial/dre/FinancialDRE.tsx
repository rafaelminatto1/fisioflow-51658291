import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { financialApi } from "@/api/v2/financial";
import type { Transacao } from "@/types/workers";

interface DREData {
	receitaBruta: number;
	deducoes: number; // impostos sobre vendas, devoluções
	receitaLiquida: number; // Receita Bruta - Deduções
	custosOperacionais: number; // CPV / CSP (Custos dos serviços prestados)
	lucroBruto: number; // Receita Liquida - Custos
	despesasOperacionais: number; // Despesas administrativas, vendas
	lucroOperacional: number; // Lucro Bruto - Despesas
	resultadoFinanceiro: number; // Receitas financeiras - Despesas financeiras (juros, taxas de cartão)
	lucroLiquido: number; // Lucro Operacional + Resultado Financeiro
}

export const FinancialDRE: React.FC = () => {
	const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
		return format(new Date(), "yyyy-MM");
	});

	const { data: transactions, isLoading } = useQuery({
		queryKey: ["financial-transactions-dre", selectedMonth],
		queryFn: async () => {
			const response = await financialApi.transacoes.list({ limit: 10000 });
			const allTransactions = response.data || [];

			// Filtrar pelo mês selecionado e apenas transações concluídas
			const [year, month] = selectedMonth.split("-").map(Number);
			const startDate = startOfMonth(new Date(year, month - 1));
			const endDate = endOfMonth(new Date(year, month - 1));

			return allTransactions.filter((t: Transacao) => {
				if (t.status !== "concluido" || !t.data_transacao) return false;
				const tDate = new Date(t.data_transacao);
				return tDate >= startDate && tDate <= endDate;
			});
		},
	});

	const dreData = useMemo<DREData>(() => {
		if (!transactions) return {
			receitaBruta: 0, deducoes: 0, receitaLiquida: 0, custosOperacionais: 0,
			lucroBruto: 0, despesasOperacionais: 0, lucroOperacional: 0,
			resultadoFinanceiro: 0, lucroLiquido: 0
		};

		let receitaBruta = 0;
		let deducoes = 0;
		let custosOperacionais = 0;
		let despesasOperacionais = 0;
		let despesasFinanceiras = 0;
		let receitasFinanceiras = 0;

		transactions.forEach((t: Transacao) => {
			const valor = Number(t.valor);
			const desc = t.descricao?.toLowerCase() || "";

			// Usa a categoria DRE do banco se existir
			const dreCategoriaStr = t.dre_categoria?.toLowerCase() || "";

			if (t.tipo === "receita") {
				if (dreCategoriaStr === "receitas_financeiras" || desc.includes("juros") || desc.includes("rendimento")) {
					receitasFinanceiras += valor;
				} else {
					receitaBruta += valor;
				}
			} else if (t.tipo === "despesa") {
				if (dreCategoriaStr === "despesas_financeiras" || (desc.includes("cartão") || desc.includes("cartao") || desc.includes("bancária") || desc.includes("bancaria"))) {
					despesasFinanceiras += valor;
				} else if (dreCategoriaStr === "deducoes" || desc.includes("imposto") || desc.includes("taxa") || desc.includes("simples") || desc.includes("iss")) {
					deducoes += valor;
				} else if (dreCategoriaStr === "custos_operacionais" || desc.includes("salário") || desc.includes("salario") || desc.includes("material") || desc.includes("insumo")) {
					custosOperacionais += valor;
				} else {
					despesasOperacionais += valor;
				}
			}
		});

		const receitaLiquida = receitaBruta - deducoes;
		const lucroBruto = receitaLiquida - custosOperacionais;
		const lucroOperacional = lucroBruto - despesasOperacionais;
		const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
		const lucroLiquido = lucroOperacional + resultadoFinanceiro;

		return {
			receitaBruta,
			deducoes,
			receitaLiquida,
			custosOperacionais,
			lucroBruto,
			despesasOperacionais,
			lucroOperacional,
			resultadoFinanceiro,
			lucroLiquido
		};
	}, [transactions]);

	const monthOptions = useMemo(() => {
		const options = [];
		const currentDate = new Date();
		for (let i = 0; i < 12; i++) {
			const date = subMonths(currentDate, i);
			options.push({
				value: format(date, "yyyy-MM"),
				label: format(date, "MMMM yyyy", { locale: ptBR }),
			});
		}
		return options;
	}, []);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-48" />
				<Card>
					<CardContent className="p-6">
						<Skeleton className="h-[400px] w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	const renderDRELine = (label: string, value: number, type: 'total' | 'subtotal' | 'detail' = 'detail', isNegative = false) => {
		const displayValue = isNegative && value > 0 ? -value : value;

		let rowClass = "";
		let textClass = "";

		if (type === 'total') {
			rowClass = "bg-primary/10 font-bold border-t-2 border-primary/20";
			textClass = "text-primary";
		} else if (type === 'subtotal') {
			rowClass = "bg-muted/50 font-semibold border-t";
			textClass = "";
		} else {
			rowClass = "";
			textClass = "text-muted-foreground";
		}

		return (
			<TableRow className={rowClass}>
				<TableCell className={`pl-${type === 'detail' ? '8' : '4'} ${textClass}`}>{label}</TableCell>
				<TableCell className={`text-right ${textClass}`}>
					{formatCurrency(displayValue)}
				</TableCell>
			</TableRow>
		);
	};

	const marginPercentage = dreData.receitaLiquida > 0
		? ((dreData.lucroLiquido / dreData.receitaLiquida) * 100).toFixed(1)
		: "0.0";

	return (
		<div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
				<div>
					<h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.1em] flex items-center gap-2">
						<BarChart3 className="h-5 w-5 text-primary" />
						DRE - Demonstração do Resultado do Exercício
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Análise de rentabilidade baseada no regime de caixa (transações pagas/recebidas).
					</p>
				</div>

				<Select value={selectedMonth} onValueChange={setSelectedMonth}>
					<SelectTrigger className="w-[200px] h-10 rounded-xl font-bold">
						<SelectValue placeholder="Selecione o mês" />
					</SelectTrigger>
					<SelectContent>
						{monthOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} className="capitalize">
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Receita Bruta</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-emerald-600">
							{formatCurrency(dreData.receitaBruta)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Despesas Totais</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							{formatCurrency(dreData.deducoes + dreData.custosOperacionais + dreData.despesasOperacionais - dreData.resultadoFinanceiro)}
						</div>
					</CardContent>
				</Card>
				<Card className={dreData.lucroLiquido >= 0 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-red-200 bg-red-50 dark:bg-red-950/20"}>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Lucro Líquido / Margem</CardTitle>
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold flex items-center gap-2 ${dreData.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"}`}>
							{formatCurrency(dreData.lucroLiquido)}
							<span className="text-sm font-medium px-2 py-1 rounded-md bg-background/50">
								{marginPercentage}%
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="border-none shadow-premium-sm overflow-hidden rounded-2xl">
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow>
							<TableHead className="w-[70%] font-bold">Estrutura do DRE</TableHead>
							<TableHead className="text-right font-bold">Valor (R$)</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{renderDRELine("1. Receita Bruta de Serviços", dreData.receitaBruta, "subtotal")}
						{renderDRELine("(-) Deduções, Impostos e Taxas sobre Vendas", dreData.deducoes, "detail", true)}

						{renderDRELine("2. Receita Líquida", dreData.receitaLiquida, "total")}

						{renderDRELine("(-) Custos dos Serviços Prestados (CPV/CSP)", dreData.custosOperacionais, "detail", true)}

						{renderDRELine("3. Lucro Bruto", dreData.lucroBruto, "total")}

						{renderDRELine("(-) Despesas Operacionais / Administrativas", dreData.despesasOperacionais, "detail", true)}

						{renderDRELine("4. Lucro Operacional (EBITDA / LAJIDA)", dreData.lucroOperacional, "total")}

						{renderDRELine("(+/-) Resultado Financeiro", dreData.resultadoFinanceiro, "detail")}

						{renderDRELine("5. Lucro Líquido", dreData.lucroLiquido, "total")}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
};

export default FinancialDRE;
