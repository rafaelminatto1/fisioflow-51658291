import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { NewEventoModal } from "@/components/eventos/NewEventoModal";
import { EditEventoModal } from "@/components/eventos/EditEventoModal";
import { useEventos, useDeleteEvento } from "@/hooks/useEventos";
import { useRealtimeEventos } from "@/hooks/useRealtimeEventos";
import { usePermissions } from "@/hooks/usePermissions";
import { EventosStatsWidget } from "@/components/eventos/EventosStatsWidget";
import {
	MapPin,
	Users,
	Plus,
	Search,
	MoreVertical,
	Eye,
	Edit,
	Trash2,
	CalendarDays,
	ChevronRight,
	TrendingUp,
	LayoutGrid,
	ListFilter,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventPlannerAI } from "@/components/eventos/EventPlannerAI";
import { cn } from "@/lib/utils";

interface Evento {
	id: string;
	nome: string;
	descricao?: string;
	status: string;
	categoria: string;
	data_inicio: string;
	data_fim?: string;
	hora_inicio?: string | null;
	hora_fim?: string | null;
	local: string;
	gratuito: boolean;
}

export default function Eventos() {
	const navigate = useNavigate();
	const [busca, setBusca] = useState("");
	const [filtroStatus, setFiltroStatus] = useState<string>("todos");
	const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
	const [newEventoOpen, setNewEventoOpen] = useState(false);
	const [editEventoOpen, setEditEventoOpen] = useState(false);
	const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);

	// Permissões e segurança
	const { canWrite, canDelete } = usePermissions();

	// Habilitar atualizações em tempo real
	useRealtimeEventos();

	const { data: eventos = [], isLoading } = useEventos({
		status: filtroStatus,
		categoria: filtroCategoria,
		busca,
	});

	const deleteEvento = useDeleteEvento();

	const handleDelete = async () => {
		if (eventoToDelete) {
			await deleteEvento.mutateAsync(eventoToDelete);
			setDeleteDialogOpen(false);
			setEventoToDelete(null);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "AGENDADO":
				return "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50";
			case "EM_ANDAMENTO":
				return "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50";
			case "CONCLUIDO":
				return "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50";
			case "CANCELADO":
				return "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-900/50";
			default:
				return "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/50";
		}
	};

	const getCategoriaIcon = (categoria: string) => {
		switch (categoria) {
			case "corrida":
				return "🏃";
			case "corporativo":
				return "🏢";
			case "ativacao":
				return "🎯";
			case "workshop":
				return "📚";
			default:
				return "📌";
		}
	};

	const eventosFiltrados = eventos;

	return (
		<MainLayout>
			<NewEventoModal open={newEventoOpen} onOpenChange={setNewEventoOpen} />
			{selectedEvento && (
				<EditEventoModal
					open={editEventoOpen}
					onOpenChange={setEditEventoOpen}
					evento={selectedEvento}
				/>
			)}

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="rounded-3xl">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-black text-2xl tracking-tight">
							Confirmar exclusão
						</AlertDialogTitle>
						<AlertDialogDescription className="font-medium">
							Tem certeza que deseja excluir este evento? Esta ação não pode ser
							desfeita e todos os dados relacionados (prestadores,
							participantes, checklist) serão removidos permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-2xl font-bold">
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive hover:bg-destructive/90 rounded-2xl font-bold"
						>
							Confirmar Exclusão
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="space-y-4 animate-fade-in pb-20 md:pb-0">
				{/* Compact header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
							<CalendarDays className="h-4 w-4 text-primary" />
						</div>
						<h1 className="text-base sm:text-lg font-semibold leading-tight">
							Eventos
						</h1>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => navigate("/eventos/analytics")}
						>
							<TrendingUp className="w-4 h-4" />
							Analytics
						</Button>
						{canWrite("eventos") && (
							<Button
								size="sm"
								className="gap-1.5"
								onClick={() => setNewEventoOpen(true)}
							>
								<Plus className="w-4 h-4" />
								Novo Evento
							</Button>
						)}
					</div>
				</div>

				{/* Dashboard Section */}
				<div className="space-y-6">
					<EventPlannerAI />
					<EventosStatsWidget />
				</div>

				{/* Toolbar & Filters */}
				<div className="flex flex-col gap-4">
					<div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-[2.5rem] border border-border/40 shadow-sm">
						<div className="relative flex-1 w-full lg:w-auto">
							<Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
							<Input
								placeholder="Buscar por nome, local ou descrição..."
								value={busca}
								onChange={(e) => setBusca(e.target.value)}
								className="pl-12 h-14 bg-white dark:bg-slate-950 border-none rounded-[2rem] text-base font-medium shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20"
							/>
						</div>

						<div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 px-2 lg:px-0">
							<Select value={filtroStatus} onValueChange={setFiltroStatus}>
								<SelectTrigger className="h-12 w-[180px] rounded-2xl border-none bg-white dark:bg-slate-950 shadow-sm font-bold">
									<div className="flex items-center gap-2">
										<ListFilter className="w-4 h-4 text-primary" />
										<SelectValue placeholder="Status" />
									</div>
								</SelectTrigger>
								<SelectContent className="rounded-2xl border-border/40">
									<SelectItem value="todos" className="font-bold">
										📋 Todos
									</SelectItem>
									<SelectItem value="AGENDADO">🕐 Agendados</SelectItem>
									<SelectItem value="EM_ANDAMENTO">⚡ Ativos</SelectItem>
									<SelectItem value="CONCLUIDO">✅ Concluídos</SelectItem>
									<SelectItem value="CANCELADO">❌ Cancelados</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={filtroCategoria}
								onValueChange={setFiltroCategoria}
							>
								<SelectTrigger className="h-12 w-[180px] rounded-2xl border-none bg-white dark:bg-slate-950 shadow-sm font-bold">
									<div className="flex items-center gap-2">
										<LayoutGrid className="w-4 h-4 text-primary" />
										<SelectValue placeholder="Categoria" />
									</div>
								</SelectTrigger>
								<SelectContent className="rounded-2xl border-border/40">
									<SelectItem value="todos" className="font-bold">
										🏷️ Categorias
									</SelectItem>
									<SelectItem value="corrida">🏃 Corridas</SelectItem>
									<SelectItem value="corporativo">🏢 Corporativo</SelectItem>
									<SelectItem value="ativacao">🎯 Ativações</SelectItem>
									<SelectItem value="workshop">📚 Workshops</SelectItem>
									<SelectItem value="outro">📌 Outros</SelectItem>
								</SelectContent>
							</Select>

							{(filtroStatus !== "todos" ||
								filtroCategoria !== "todos" ||
								busca) && (
								<Button
									variant="ghost"
									size="icon"
									className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 shrink-0"
									onClick={() => {
										setBusca("");
										setFiltroStatus("todos");
										setFiltroCategoria("todos");
									}}
								>
									<Trash2 className="w-5 h-5" />
								</Button>
							)}
						</div>
					</div>

					{(filtroStatus !== "todos" ||
						filtroCategoria !== "todos" ||
						busca) && (
						<div className="px-6 flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
							<span className="text-xs font-black uppercase tracking-widest text-primary/60">
								Filtros Ativos:
							</span>
							<div className="flex items-center gap-2">
								{filtroStatus !== "todos" && (
									<Badge
										variant="outline"
										className="rounded-full bg-primary/5 border-primary/20 text-primary font-bold"
									>
										Status: {filtroStatus}
									</Badge>
								)}
								{filtroCategoria !== "todos" && (
									<Badge
										variant="outline"
										className="rounded-full bg-primary/5 border-primary/20 text-primary font-bold"
									>
										Categoria: {filtroCategoria}
									</Badge>
								)}
								<span className="text-xs font-bold text-slate-400 ml-2">
									{eventosFiltrados.length} resultados
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Content Area */}
				{isLoading ? (
					<div className="space-y-4">
						<LoadingSkeleton type="card" rows={3} />
					</div>
				) : eventosFiltrados.length === 0 ? (
					<div className="py-12">
						<EmptyState
							icon={CalendarDays}
							title="Nenhum evento encontrado"
							description={
								busca || filtroStatus !== "todos" || filtroCategoria !== "todos"
									? "Não encontramos eventos com os critérios selecionados. Tente limpar os filtros."
									: "Sua agenda de eventos está vazia. Comece planejando sua próxima ativação agora mesmo."
							}
							action={
								!busca &&
								filtroStatus === "todos" &&
								filtroCategoria === "todos" &&
								canWrite("eventos")
									? {
											label: "Criar Primeiro Evento",
											onClick: () => setNewEventoOpen(true),
										}
									: {
											label: "Limpar Filtros",
											onClick: () => {
												setBusca("");
												setFiltroStatus("todos");
												setFiltroCategoria("todos");
											},
										}
							}
						/>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
						{eventosFiltrados.map((evento, index) => (
							<Card
								key={evento.id}
								className="group relative overflow-hidden border-border/40 hover:border-primary/40 hover:shadow-premium transition-all duration-500 hover:-translate-y-2 rounded-[2.5rem] bg-white dark:bg-slate-900"
								style={{ animationDelay: `${index * 50}ms` }}
							>
								{/* Status Bar Top */}
								<div
									className={cn(
										"h-2 w-full",
										evento.status === "EM_ANDAMENTO"
											? "bg-amber-500"
											: evento.status === "CONCLUIDO"
												? "bg-emerald-500"
												: evento.status === "CANCELADO"
													? "bg-rose-500"
													: "bg-primary",
									)}
								/>

								<CardHeader className="p-8 pb-4">
									<div className="flex justify-between items-start gap-4 mb-4">
										<div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-border/50 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
											<span className="text-2xl">
												{getCategoriaIcon(evento.categoria)}
											</span>
										</div>

										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className={cn(
													"rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-wider border",
													getStatusColor(evento.status),
												)}
											>
												{evento.status.replace("_", " ")}
											</Badge>

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
													>
														<MoreVertical className="w-4 h-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="end"
													className="w-56 p-2 rounded-2xl border-border/40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
												>
													<DropdownMenuItem
														onClick={() => navigate(`/eventos/${evento.id}`)}
														className="rounded-xl p-3 font-bold"
													>
														<Eye className="w-4 h-4 mr-3 text-primary" />
														Detalhes Operacionais
													</DropdownMenuItem>
													{canWrite("eventos") && (
														<DropdownMenuItem
															onClick={() => {
																setSelectedEvento(evento);
																setEditEventoOpen(true);
															}}
															className="rounded-xl p-3 font-bold"
														>
															<Edit className="w-4 h-4 mr-3 text-amber-500" />
															Editar Informações
														</DropdownMenuItem>
													)}
													{canDelete("eventos") && (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																className="rounded-xl p-3 font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-950/20"
																onClick={() => {
																	setEventoToDelete(evento.id);
																	setDeleteDialogOpen(true);
																}}
															>
																<Trash2 className="w-4 h-4 mr-3" />
																Excluir Evento
															</DropdownMenuItem>
														</>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>

									<CardTitle className="text-2xl font-black tracking-tight group-hover:text-primary transition-colors line-clamp-1">
										{evento.nome}
									</CardTitle>
									{evento.descricao && (
										<p className="text-slate-500 text-sm font-medium line-clamp-2 mt-2 leading-relaxed">
											{evento.descricao}
										</p>
									)}
								</CardHeader>

								<CardContent className="p-8 pt-4">
									<div className="grid grid-cols-2 gap-4 mb-8">
										<div className="space-y-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
												Quando
											</p>
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-primary" />
												<p className="font-bold text-sm">
													{format(new Date(evento.data_inicio), "dd 'de' MMM", {
														locale: ptBR,
													})}
												</p>
											</div>
										</div>
										<div className="space-y-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
												Onde
											</p>
											<div className="flex items-center gap-2 min-w-0">
												<MapPin className="h-3 w-3 text-primary shrink-0" />
												<p
													className="font-bold text-sm truncate"
													title={evento.local}
												>
													{evento.local}
												</p>
											</div>
										</div>
									</div>

									<div className="flex items-center justify-between pt-6 border-t border-border/40">
										<div className="flex -space-x-3">
											{[1, 2, 3].map((i) => (
												<div
													key={i}
													className="w-9 h-9 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black shadow-sm"
												>
													<Users className="w-3.5 h-3.5 text-slate-500" />
												</div>
											))}
											<div className="w-9 h-9 rounded-full border-4 border-white dark:border-slate-900 bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shadow-sm">
												+0
											</div>
										</div>

										<Button
											onClick={() => navigate(`/eventos/${evento.id}`)}
											className="rounded-2xl h-12 w-12 p-0 bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white transition-all duration-300 border-none group/btn"
										>
											<ChevronRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</MainLayout>
	);
}
