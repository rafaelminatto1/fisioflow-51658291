/**
 * Aniversariantes Page Content - Refactored for Hub
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Cake, Gift, Phone, Mail, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { patientsApi, type PatientRow } from "@/api/v2";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Aniversariante {
	id: string;
	name: string;
	birth_date: string;
	dia: number;
	idade: number;
	phone: string | null;
	email: string | null;
}

export function AniversariantesContent() {
	const [search, setSearch] = useState("");
	const [mesSelecionado, setMesSelecionado] = useState(
		new Date().getMonth() + 1,
	);

	const { data: aniversariantes = [], isLoading } = useQuery({
		queryKey: ["aniversariantes", mesSelecionado],
		queryFn: async () => {
			const res = await patientsApi.list({ status: "ativo", limit: 1000 });
			const patients = (res?.data ?? []) as PatientRow[];

			return patients
				.filter((p) => {
					if (!p.birth_date) return false;
					const birthDate = new Date(p.birth_date);
					// Fix for possible timezone shift during date creation
					const birthMonth = birthDate.getUTCMonth() + 1;
					return birthMonth === mesSelecionado;
				})
				.map((p) => {
					const birthDate = new Date(p.birth_date!);
					return {
						id: p.id,
						name: p.name ?? p.full_name ?? "Paciente",
						birth_date: p.birth_date!,
						phone: p.phone ?? null,
						email: p.email ?? null,
						dia: birthDate.getUTCDate(),
						idade: new Date().getFullYear() - birthDate.getUTCFullYear(),
					};
				})
				.sort((a, b) => a.dia - b.dia) as Aniversariante[];
		},
	});

	const filteredAniversariantes = aniversariantes.filter((a) =>
		a.name.toLowerCase().includes(search.toLowerCase()),
	);

	const meses = [
		"Janeiro",
		"Fevereiro",
		"Março",
		"Abril",
		"Maio",
		"Junho",
		"Julho",
		"Agosto",
		"Setembro",
		"Outubro",
		"Novembro",
		"Dezembro",
	];

	const hoje = new Date().getUTCDate();
	const mesAtual = new Date().getUTCMonth() + 1;
	const aniversariantesHoje = aniversariantes.filter(
		(a) => a.dia === hoje && mesSelecionado === mesAtual,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<Cake className="h-6 w-6 text-primary" />
						Aniversariantes do Mês
					</h2>
					<p className="text-muted-foreground mt-1">
						Fortaleça o relacionamento com seus pacientes
					</p>
				</div>
			</div>

			{aniversariantesHoje.length > 0 && (
				<Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-none shadow-premium-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
							<Gift className="h-4 w-4 text-primary" />
							Aniversariantes de Hoje! 🎉
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-3">
							{aniversariantesHoje.map((a) => (
								<div
									key={a.id}
									className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl p-3 border border-primary/10 shadow-sm"
								>
									<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
										{a.name[0]}
									</div>
									<div>
										<p className="font-bold text-sm leading-none">{a.name}</p>
										<p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
											{a.idade} anos
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
				{meses.map((mes, idx) => (
					<Button
						key={mes}
						variant={mesSelecionado === idx + 1 ? "default" : "ghost"}
						size="sm"
						onClick={() => setMesSelecionado(idx + 1)}
						className={cn(
							"rounded-lg h-8 px-3 text-[10px] font-black uppercase tracking-widest",
							mesSelecionado === idx + 1
								? "bg-white text-primary shadow-sm dark:bg-slate-900"
								: "text-slate-500",
						)}
					>
						{mes.substring(0, 3)}
					</Button>
				))}
			</div>

			<Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
				<CardHeader className="p-6 border-b border-slate-50 dark:border-slate-800/50">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
							Pacientes em {meses[mesSelecionado - 1]}
						</CardTitle>
						<div className="relative w-full sm:w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								placeholder="Filtrar por nome..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9 rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-bold text-xs"
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="text-center py-20 text-muted-foreground text-xs font-black uppercase tracking-[0.2em] animate-pulse">
							Carregando...
						</div>
					) : filteredAniversariantes.length === 0 ? (
						<div className="text-center py-20 text-muted-foreground text-xs font-black uppercase tracking-[0.2em]">
							Nenhum registro encontrado
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
									<TableRow className="border-none">
										<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest w-20">
											Dia
										</TableHead>
										<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
											Nome do Paciente
										</TableHead>
										<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
											Idade
										</TableHead>
										<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
											Contato
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredAniversariantes.map((a) => (
										<TableRow
											key={a.id}
											className={cn(
												"hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border-slate-50 dark:border-slate-800/50",
												a.dia === hoje &&
													mesSelecionado === mesAtual &&
													"bg-primary/5",
											)}
										>
											<TableCell className="px-6 py-4">
												<div
													className={cn(
														"w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm",
														a.dia === hoje && mesSelecionado === mesAtual
															? "bg-primary text-white"
															: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
													)}
												>
													{a.dia}
												</div>
											</TableCell>
											<TableCell className="px-6 py-4">
												<p className="font-bold text-slate-900 dark:text-white">
													{a.name}
												</p>
												<p className="text-[10px] font-medium text-slate-400">
													{format(new Date(a.birth_date), "dd/MM/yyyy", {
														locale: ptBR,
													})}
												</p>
											</TableCell>
											<TableCell className="px-6 py-4">
												<Badge
													variant="outline"
													className="rounded-lg font-bold text-xs"
												>
													{a.idade} anos
												</Badge>
											</TableCell>
											<TableCell className="px-6 py-4">
												<div className="flex items-center gap-3">
													{a.phone && (
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
															asChild
														>
															<a
																href={`https://wa.me/55${a.phone.replace(/\D/g, "")}`}
																target="_blank"
																rel="noreferrer"
															>
																<Phone className="h-3.5 w-3.5" />
															</a>
														</Button>
													)}
													{a.email && (
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
															asChild
														>
															<a href={`mailto:${a.email}`}>
																<Mail className="h-3.5 w-3.5" />
															</a>
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function AniversariantesPage() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto">
				<AniversariantesContent />
			</div>
		</MainLayout>
	);
}
