import React, { useState } from "react";
import {
	Receipt,
	TrendingUp,
	AlertCircle,
	CheckCircle2,
	Clock,
	Search,
	Filter,
	Download,
	Plus,
	MoreHorizontal,
	ArrowUpRight,
	Calendar as CalendarIcon,
	DollarSign,
	CreditCard,
	Building2,
	User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialRecord {
	id: string;
	patient_id: string;
	tomador_nome: string;
	valor_servico: number;
	data_emissao: string;
	status: "autorizado" | "rascunho" | "erro" | "cancelado" | "enviado";
	numero_nfse?: string;
	link_nfse?: string;
}

export const FinancialWorkbench: React.FC = () => {
	const [activeFilter, setActiveFilter] = useState<string>("all");
	const [searchTerm, setSearchTerm] = useState("");

	// Mock data for initial UI implementation
	const records: FinancialRecord[] = [
		{
			id: "1",
			patient_id: "p1",
			tomador_nome: "Maria Oliveira",
			valor_servico: 250.0,
			data_emissao: new Date().toISOString(),
			status: "autorizado",
			numero_nfse: "20260401",
			link_nfse: "#",
		},
		{
			id: "2",
			patient_id: "p2",
			tomador_nome: "João Silva",
			valor_servico: 180.0,
			data_emissao: new Date(Date.now() - 86400000).toISOString(),
			status: "rascunho",
		},
		{
			id: "3",
			patient_id: "p3",
			tomador_nome: "Ricardo Santos",
			valor_servico: 320.0,
			data_emissao: new Date(Date.now() - 172800000).toISOString(),
			status: "erro",
		},
	];

	const stats = {
		totalMonthly: 4520.0,
		pendingNfse: 5,
		authorizedToday: 12,
		failedNfse: 2,
	};

	return (
		<div className="flex flex-col gap-6 p-6 animate-fade-in">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
						<div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
							<Receipt className="w-7 h-7 text-white" />
						</div>
						Financial Workbench
					</h1>
					<p className="text-slate-500 font-medium mt-1">
						Gestão de faturamento particular e emissão de NFS-e Mooca
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						className="h-11 px-6 border-slate-200 shadow-sm font-bold text-xs uppercase tracking-widest"
					>
						<Download className="w-4 h-4 mr-2" /> Exportar
					</Button>
					<Button className="h-11 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
						<Plus className="w-4 h-4 mr-2" /> Nova Nota
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-none shadow-premium bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
					<CardContent className="pt-6">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
									Faturamento Mensal
								</p>
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									R$ {stats.totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
								</h3>
							</div>
							<div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
								<TrendingUp className="w-4 h-4 text-emerald-600" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1.5">
							<Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">
								+12.5%
							</Badge>
							<span className="text-[10px] text-slate-400 font-bold">vs mês anterior</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-premium bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
					<CardContent className="pt-6">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
									Notas Pendentes
								</p>
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{stats.pendingNfse}
								</h3>
							</div>
							<div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
								<Clock className="w-4 h-4 text-amber-600" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1.5">
							<span className="text-[10px] text-slate-400 font-bold">Aguardando emissão</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-premium bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
					<CardContent className="pt-6">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
									Autorizadas Hoje
								</p>
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{stats.authorizedToday}
								</h3>
							</div>
							<div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
								<CheckCircle2 className="w-4 h-4 text-blue-600" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1.5">
							<span className="text-[10px] text-slate-400 font-bold">Processadas com sucesso</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-premium bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
					<CardContent className="pt-6">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
									Erros de Sincronia
								</p>
								<h3 className="text-2xl font-black text-rose-600">
									{stats.failedNfse}
								</h3>
							</div>
							<div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
								<AlertCircle className="w-4 h-4 text-rose-600" />
							</div>
						</div>
						<div className="mt-4 flex items-center gap-1.5">
							<span className="text-[10px] text-slate-400 font-bold">Requer atenção manual</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters & Table Section */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
					<div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
						{["all", "autorizado", "rascunho", "erro"].map((f) => (
							<button
								key={f}
								onClick={() => setActiveFilter(f)}
								className={cn(
									"px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
									activeFilter === f
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
										: "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
								)}
							>
								{f === "all" ? "Todos" : f}
							</button>
						))}
					</div>
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<Input
							placeholder="Buscar nota ou paciente..."
							className="pl-10 h-10 bg-white/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl text-xs font-medium"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				<Card className="border-none shadow-premium overflow-hidden bg-white/80 backdrop-blur-xl dark:bg-slate-950/80">
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-slate-100 dark:border-slate-800">
									<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente / Tomador</th>
									<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
									<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Emissão</th>
									<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
									<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NFS-e</th>
									<th className="px-6 py-4 text-right"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50 dark:divide-slate-900">
								{records.map((record) => (
									<tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
													{record.tomador_nome.slice(0, 2).toUpperCase()}
												</div>
												<div>
													<p className="text-sm font-bold text-slate-800 dark:text-slate-100">{record.tomador_nome}</p>
													<p className="text-[10px] text-slate-400 font-medium uppercase">Particular</p>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<p className="text-sm font-black text-slate-900 dark:text-white">
												R$ {record.valor_servico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</p>
										</td>
										<td className="px-6 py-4">
											<p className="text-xs font-medium text-slate-600 dark:text-slate-400">
												{format(new Date(record.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
											</p>
										</td>
										<td className="px-6 py-4">
											<Badge
												className={cn(
													"px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
													record.status === "autorizado" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
													record.status === "rascunho" ? "bg-slate-100 text-slate-600 border-slate-200" :
													record.status === "erro" ? "bg-rose-50 text-rose-700 border-rose-100" :
													"bg-blue-50 text-blue-700 border-blue-100"
												)}
											>
												{record.status}
											</Badge>
										</td>
										<td className="px-6 py-4">
											{record.numero_nfse ? (
												<p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
													#{record.numero_nfse}
												</p>
											) : (
												<span className="text-[10px] text-slate-300 font-bold uppercase">N/A</span>
											)}
										</td>
										<td className="px-6 py-4 text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
														<MoreHorizontal className="w-4 h-4 text-slate-400" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl border-slate-200">
													<DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Ações</DropdownMenuLabel>
													<DropdownMenuItem className="rounded-lg gap-2 font-bold text-xs p-2">
														<ArrowUpRight className="w-3.5 h-3.5" /> Ver Detalhes
													</DropdownMenuItem>
													{record.link_nfse && (
														<DropdownMenuItem className="rounded-lg gap-2 font-bold text-xs p-2 text-blue-600">
															<Download className="w-3.5 h-3.5" /> Baixar PDF
														</DropdownMenuItem>
													)}
													<DropdownMenuSeparator />
													<DropdownMenuItem className="rounded-lg gap-2 font-bold text-xs p-2 text-rose-600">
														<AlertCircle className="w-3.5 h-3.5" /> Cancelar Nota
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</div>
	);
};
