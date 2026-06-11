import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DemonstrativoData } from "@/hooks/useDemonstrativoMensalLogic";

interface Props {
	demoData: DemonstrativoData;
}

export function CategorySummaryTable({ demoData }: Props) {
	const allCategories = Array.from(
		new Set([
			...Object.keys(demoData.entradasPorCategoria),
			...Object.keys(demoData.saidasPorCategoria),
		]),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Resumo por Categoria</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Categoria</TableHead>
							<TableHead className="text-right">Entradas</TableHead>
							<TableHead className="text-right">Saídas</TableHead>
							<TableHead className="text-right">% do Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{allCategories.map((cat) => {
							const entrada = demoData.entradasPorCategoria[cat] || 0;
							const saida = demoData.saidasPorCategoria[cat] || 0;
							return (
								<TableRow key={cat}>
									<TableCell className="font-medium">{cat}</TableCell>
									<TableCell className="text-right text-green-600">
										{entrada > 0
											? `R$ ${entrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
											: "-"}
									</TableCell>
									<TableCell className="text-right text-red-600">
										{saida > 0
											? `R$ ${saida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
											: "-"}
									</TableCell>
									<TableCell className="text-right">
										{demoData.entradas > 0
											? ((entrada / demoData.entradas) * 100).toFixed(1)
											: 0}
										%
									</TableCell>
								</TableRow>
							);
						})}
						<TableRow className="bg-muted/50 font-semibold">
							<TableCell>Total</TableCell>
							<TableCell className="text-right text-green-600">
								R${" "}
								{demoData.entradas.toLocaleString("pt-BR", {
									minimumFractionDigits: 2,
								})}
							</TableCell>
							<TableCell className="text-right text-red-600">
								R${" "}
								{demoData.saidas.toLocaleString("pt-BR", {
									minimumFractionDigits: 2,
								})}
							</TableCell>
							<TableCell className="text-right">100%</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
