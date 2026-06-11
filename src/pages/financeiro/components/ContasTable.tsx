import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ContaFinanceira } from "@/hooks/useContasFinanceiras";

interface Props {
	contas: ContaFinanceira[];
	tab: "receber" | "pagar";
	handleQuitar: (conta: ContaFinanceira) => void;
}

export function ContasTable({ contas, tab, handleQuitar }: Props) {
	const getStatusBadge = (status: string, vencimento: string) => {
		const hoje = new Date().toISOString().split("T")[0];
		if (status === "pago")
			return (
				<Badge className="bg-green-500 text-white">
					<CheckCircle className="h-3 w-3 mr-1" />
					Pago
				</Badge>
			);
		if (status === "cancelado")
			return <Badge variant="secondary">Cancelado</Badge>;
		if (vencimento < hoje)
			return (
				<Badge variant="destructive">
					<AlertCircle className="h-3 w-3 mr-1" />
					Atrasado
				</Badge>
			);
		if (vencimento === hoje)
			return (
				<Badge className="bg-yellow-500 text-white">
					<Clock className="h-3 w-3 mr-1" />
					Hoje
				</Badge>
			);
		return <Badge variant="outline">Pendente</Badge>;
	};

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
					<TableRow className="border-none">
						<TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
							Descrição
						</TableHead>
						<TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
							Categoria
						</TableHead>
						<TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
							Vencimento
						</TableHead>
						<TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
							Valor
						</TableHead>
						<TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
							Status
						</TableHead>
						<TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">
							Ações
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{contas.map((conta) => (
						<TableRow
							key={conta.id}
							className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border-slate-50 dark:border-slate-800/50"
						>
							<TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white">
								{conta.descricao}
							</TableCell>
							<TableCell className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
								{conta.categoria || "-"}
							</TableCell>
							<TableCell className="px-6 py-4 text-xs font-mono text-slate-500">
								{format(new Date(conta.data_vencimento), "dd/MM/yyyy", {
									locale: ptBR,
								})}
							</TableCell>
							<TableCell
								className={`px-6 py-4 font-black ${tab === "receber" ? "text-emerald-600" : "text-red-600"}`}
							>
								R${" "}
								{Number(conta.valor).toLocaleString("pt-BR", {
									minimumFractionDigits: 2,
								})}
							</TableCell>
							<TableCell className="px-6 py-4">
								{getStatusBadge(conta.status, conta.data_vencimento)}
							</TableCell>
							<TableCell className="px-6 py-4 text-right">
								{conta.status === "pendente" && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleQuitar(conta)}
										className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold text-[10px] uppercase tracking-wider"
									>
										<CheckCircle className="h-3.5 w-3.5 mr-1.5" />
										Quitar
									</Button>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
