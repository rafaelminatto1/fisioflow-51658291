import { useState, useMemo, memo } from "react";
import {
	useExerciseProtocols,
	type ExerciseProtocol,
} from "@/hooks/useExerciseProtocols";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	Search,
	ChevronRight,
	Clock,
	Target,
	Milestone,
	Activity,
	Trash2,
	Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { motion, AnimatePresence } from "framer-motion";
import { NewProtocolModal } from "@/components/modals/NewProtocolModal";
import ProtocolDetailView from "./ProtocolDetailView";

export const ProtocolsManager = memo(function ProtocolsManager() {
	const [activeTab, setActiveTab] = useState<"patologia" | "pos_operatorio">(
		"pos_operatorio",
	);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const [viewProtocol, setViewProtocol] = useState<ExerciseProtocol | null>(
		null,
	);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [editingProtocol, setEditingProtocol] =
		useState<ExerciseProtocol | null>(null);

	const {
		protocols,
		loading,
		createProtocol,
		updateProtocol,
		deleteProtocol,
		isCreating,
		isUpdating,
		isDeleting,
	} = useExerciseProtocols();

	const filteredProtocols = useMemo(
		() =>
			protocols.filter(
				(p) =>
					(p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
						p.condition_name
							?.toLowerCase()
							.includes(debouncedSearch.toLowerCase())) &&
					p.protocol_type === activeTab,
			),
		[protocols, debouncedSearch, activeTab],
	);

	// Agrupar por condição
	const groupedProtocols = useMemo(
		() =>
			filteredProtocols.reduce(
				(acc, protocol) => {
					const key = protocol.condition_name || "Geral";
					if (!acc[key]) {
						acc[key] = [];
					}
					acc[key].push(protocol);
					return acc;
				},
				{} as Record<string, ExerciseProtocol[]>,
			),
		[filteredProtocols],
	);

	const handleDelete = () => {
		if (deleteId) {
			deleteProtocol(deleteId);
			setDeleteId(null);
		}
	};

	const handleNewProtocol = () => {
		setEditingProtocol(null);
		setShowModal(true);
	};

	const handleEditProtocol = (protocol: ExerciseProtocol) => {
		setEditingProtocol(protocol);
		setViewProtocol(null);
		setShowModal(true);
	};

	const handleSubmit = (data: any) => {
		if (editingProtocol) {
			updateProtocol({ id: editingProtocol.id, ...data });
		} else {
			createProtocol(data);
		}
	};

	return (
		<div className="space-y-6 animate-fade-in p-4 max-w-7xl mx-auto">
			{/* Header Deck - System Style */}
			<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-white to-white p-6 sm:p-8 border border-border shadow-premium-sm">
				<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-1">
						<h2 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
							<div className="bg-primary/10 p-2 rounded-xl">
								<Layers className="h-8 w-8 text-primary" />
							</div>
							PROTOCOLOS
						</h2>
						<p className="text-muted-foreground text-base max-w-lg leading-relaxed">
							Diretrizes clínicas de reabilitação e progressão funcional baseadas em
							evidência para suporte à decisão terapêutica.
						</p>
					</div>
					<Button
						onClick={handleNewProtocol}
						className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 rounded-xl shadow-lg hover:shadow-primary/20 transition-all group shrink-0"
					>
						<Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
						NOVO PROTOCOLO
					</Button>
				</div>
				{/* Decorative elements */}
				<div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
			</div>

			{/* Horizontal Filter Bar */}
			<div className="sticky top-0 z-20 flex flex-col md:flex-row items-center gap-4 bg-background/80 backdrop-blur-md py-4 border-b border-border/50">
				<div className="relative w-full md:w-80">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
					<Input
						placeholder="Buscar protocolo..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="bg-white border-border text-foreground pl-10 h-11 rounded-xl focus-visible:ring-primary shadow-sm"
					/>
				</div>

				<div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as any)}
						className="w-full md:w-auto shrink-0"
					>
						<TabsList className="bg-muted/50 p-1 h-11 rounded-xl border border-border/50">
							<TabsTrigger
								value="pos_operatorio"
								className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all"
							>
								Pós-Operatório
							</TabsTrigger>
							<TabsTrigger
								value="patologia"
								className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all"
							>
								Patologias
							</TabsTrigger>
						</TabsList>
					</Tabs>
					
					<div className="h-6 w-px bg-border mx-2 hidden md:block" />
					
					<div className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-xl border border-border/50 whitespace-nowrap">
						<Activity className="w-4 h-4 text-primary" />
						<span className="text-xs font-bold text-muted-foreground">
							{filteredProtocols.length}{" "}
							{filteredProtocols.length === 1 ? "Protocolo" : "Protocolos"}
						</span>
					</div>
				</div>
			</div>

			{/* Main Content Area - Better Distribution */}
			<div className="space-y-8 pb-20">
				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
							<div key={i} className="bg-white p-6 rounded-2xl border border-border shadow-sm h-48 space-y-4">
								<Skeleton className="h-6 w-3/4 bg-muted" />
								<Skeleton className="h-4 w-1/2 bg-muted" />
								<div className="mt-8 flex gap-2">
									<Skeleton className="h-10 grow bg-muted" />
								</div>
							</div>
						))}
					</div>
				) : Object.keys(groupedProtocols).length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-border border-dashed border-2 shadow-sm"
					>
						<div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
							<Target className="h-10 w-10 text-muted-foreground/30" />
						</div>
						<h3 className="text-xl font-bold text-foreground mb-2">
							Nenhum protocolo encontrado
						</h3>
						<p className="text-muted-foreground mb-8 max-w-sm text-center">
							Refine sua busca ou crie um novo protocolo clínico para começar.
						</p>
						<Button
							onClick={handleNewProtocol}
							variant="outline"
							className="rounded-xl border-border hover:bg-secondary"
						>
							<Plus className="w-4 h-4 mr-2" /> Criar Protocolo
						</Button>
					</motion.div>
				) : (
					<div className="space-y-12">
						<AnimatePresence mode="popLayout">
							{Object.entries(groupedProtocols).map(
								([condition, protocols], groupIdx) => (
									<motion.div
										layout
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95 }}
										transition={{ delay: groupIdx * 0.1 }}
										key={condition}
										className="space-y-6"
									>
										<div className="flex items-center gap-4 px-2">
											<h3 className="text-base font-black text-muted-foreground tracking-widest flex items-center gap-2 shrink-0">
												<span className="w-1.5 h-1.5 rounded-full bg-primary" />
												{condition.toUpperCase()}
											</h3>
											<div className="h-px grow bg-border/50" />
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
											{protocols.map((protocol) => (
												<motion.div
													key={protocol.id}
													whileHover={{ y: -4 }}
													className="group relative"
												>
													<div
														className="bg-white p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-premium-md transition-all cursor-pointer h-full flex flex-col justify-between overflow-hidden shadow-sm"
														onClick={() => setViewProtocol(protocol)}
													>
														<div className="space-y-3 mb-6 relative z-10">
															<div className="flex items-start justify-between gap-2">
																<h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
																	{protocol.name}
																</h4>
																<ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
															</div>
															<div className="flex flex-wrap gap-2">
																<Badge
																	variant="secondary"
																	className="bg-secondary/80 border-transparent text-[10px] text-muted-foreground px-2 py-0 h-5"
																>
																	<Clock className="w-3 h-3 mr-1" />{" "}
																	{protocol.weeks_total} semanas
																</Badge>
																{Array.isArray(protocol.milestones) &&
																	protocol.milestones.length > 0 && (
																		<Badge
																			variant="secondary"
																			className="bg-primary/5 border-primary/10 text-[10px] text-primary px-2 py-0 h-5"
																		>
																			<Milestone className="w-3 h-3 mr-1" />{" "}
																			{protocol.milestones.length} marcos
																		</Badge>
																	)}
															</div>
														</div>

														<div className="flex items-center justify-between mt-auto relative z-10 pt-4 border-t border-border/50">
															<div className="flex items-center gap-1">
																<div className="w-1 h-1 rounded-full bg-primary/30" />
																<p className="text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] uppercase">
																	FISIOFLOW PROTOCOL
																</p>
															</div>
															<div className="flex gap-1.5">
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleEditProtocol(protocol);
																	}}
																	className="p-1.5 rounded-lg bg-secondary hover:bg-primary/10 text-muted-foreground/60 hover:text-primary transition-all"
																	title="Editar"
																>
																	<Activity className="w-4 h-4" />
																</button>
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		setDeleteId(protocol.id);
																	}}
																	className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-all"
																	title="Excluir"
																>
																	<Trash2 className="w-4 h-4" />
																</button>
															</div>
														</div>
													</div>
												</motion.div>
											))}
										</div>
									</motion.div>
								),
							)}
						</AnimatePresence>
					</div>
				)}
			</div>

			{/* Protocol Details Full View */}
			<AnimatePresence>
				{viewProtocol && (
					<ProtocolDetailView
						protocol={viewProtocol}
						onClose={() => setViewProtocol(null)}
						onEdit={handleEditProtocol}
					/>
				)}
			</AnimatePresence>

			{/* Delete Confirmation */}
			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent className="bg-white border-border rounded-3xl overflow-hidden max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-xl font-black text-foreground">
							CONFIRMAR EXCLUSÃO
						</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground text-sm">
							Você está prestes a remover permanentemente o protocolo de
							reabilitação. Esta ação é irreversível.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-8 gap-3 sm:gap-2">
						<AlertDialogCancel className="bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80 rounded-xl h-11 px-6">
							CANCELAR
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl h-11 px-8 flex items-center gap-2"
						>
							{isDeleting ? "EXCLUINDO..." : "CONFIRMAR EXCLUSÃO"}
							<Trash2 className="w-4 h-4" />
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Protocol Create/Edit Modal */}
			<NewProtocolModal
				open={showModal}
				onOpenChange={(open: boolean) => {
					setShowModal(open);
					if (!open) setEditingProtocol(null);
				}}
				onSubmit={handleSubmit}
				protocol={editingProtocol || undefined}
				isLoading={isCreating || isUpdating}
			/>
		</div>
	);
});
