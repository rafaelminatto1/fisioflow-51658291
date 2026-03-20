import { useState, useEffect } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Search,
	Trophy,
	Flame,
	Star,
	Eye,
	RefreshCw,
	Download,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PatientGamificationDetails } from "./PatientGamificationDetails";
import { useGamificationAdmin } from "@/hooks/useGamificationAdmin";

/**
 * LeaderboardTable Component
 * Displays ranked patients with filtering, sorting, and pagination
 */
export const LeaderboardTable: React.FC = () => {
	const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const {
		leaderboard,
		totalCount,
		totalPages,
		isLoading,
		filters,
		setFilters,
		exportToCSV,
		refresh,
	} = useLeaderboard();

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Update filters when debounced search changes
	useEffect(() => {
		setFilters({ search: debouncedSearch || undefined });
	}, [debouncedSearch, setFilters]);

	const { adjustXp, resetStreak } = useGamificationAdmin();

	// Memoized column header for sorting
	const SortableHeader = ({
		column,
		label,
	}: {
		column: string;
		label: string;
	}) => {
		const isSorted = filters.sortBy === column;
		const direction = isSorted ? filters.order : "desc";

		return (
			<TableHead
				className="cursor-pointer hover:bg-accent/50 transition-colors"
				aria-sort={
					isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"
				}
				onClick={() => {
					if (isSorted) {
						setFilters({
							sortBy: column as string,
							order: direction === "asc" ? "desc" : "asc",
						});
					} else {
						setFilters({ sortBy: column as string, order: "desc" });
					}
				}}
			>
				<div className="flex items-center gap-1">
					{label}
					{isSorted && (
						<span className="text-xs text-primary">
							{direction === "asc" ? "↑" : "↓"}
						</span>
					)}
				</div>
			</TableHead>
		);
	};

	const getRankIcon = (rank: number) => {
		if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
		if (rank === 2) return <Trophy className="h-5 w-5 text-gray-500" />;
		if (rank === 3) return <Trophy className="h-5 w-5 text-amber-700" />;
		return (
			<span className="text-sm font-bold text-muted-foreground">#{rank}</span>
		);
	};

	const handlePageChange = (newPage: number) => {
		setFilters({ page: newPage });
	};

	const podium = leaderboard.slice(0, 3);

	const getPodiumColor = (rank: number) => {
		if (rank === 1) return "from-yellow-400 to-yellow-600 shadow-yellow-500/20";
		if (rank === 2) return "from-slate-300 to-slate-500 shadow-slate-500/20";
		if (rank === 3) return "from-amber-600 to-amber-800 shadow-amber-800/20";
		return "from-primary/10 to-primary/20";
	};

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* Podium Section */}
			{filters.page === 1 && leaderboard.length >= 3 && !isLoading && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 pb-2">
					{/* 2nd Place */}
					<div className="order-2 md:order-1 flex flex-col items-center justify-end h-full pt-8">
						<div
							className="relative group cursor-pointer w-full"
							onClick={() => setSelectedPatient(podium[1].patient_id)}
						>
							<div
								className={cn(
									"absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center transition-transform group-hover:scale-110",
								)}
							>
								<div className="w-16 h-16 rounded-full border-4 border-slate-300 bg-slate-100 flex items-center justify-center shadow-lg overflow-hidden">
									<span className="text-xl font-black text-slate-500">
										{podium[1].patient_name.charAt(0)}
									</span>
								</div>
								<Badge className="mt-2 bg-slate-500 text-white border-none px-3">
									2º Lugar
								</Badge>
							</div>
							<div
								className={cn(
									"h-32 w-full rounded-t-2xl bg-gradient-to-b flex flex-col items-center justify-center p-4 text-white text-center shadow-xl",
									getPodiumColor(2),
								)}
							>
								<p className="font-bold text-lg leading-tight mt-4 truncate w-full px-2">
									{podium[1].patient_name}
								</p>
								<div className="flex items-center gap-1 mt-1">
									<Star className="h-3 w-3 fill-white" />
									<span className="text-sm font-medium">
										{podium[1].total_xp.toLocaleString()} XP
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 1st Place */}
					<div className="order-1 md:order-2 flex flex-col items-center justify-end h-full">
						<div
							className="relative group cursor-pointer w-full"
							onClick={() => setSelectedPatient(podium[0].patient_id)}
						>
							<div
								className={cn(
									"absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center transition-transform group-hover:scale-110 z-10",
								)}
							>
								<div className="relative">
									<div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-yellow-50 flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-yellow-400/20">
										<span className="text-3xl font-black text-yellow-600">
											{podium[0].patient_name.charAt(0)}
										</span>
									</div>
									<div className="absolute -top-6 left-1/2 -translate-x-1/2">
										<Trophy className="h-10 w-10 text-yellow-500 drop-shadow-md animate-bounce" />
									</div>
								</div>
								<Badge className="mt-2 bg-yellow-500 text-white border-none px-4 py-1 text-sm font-bold shadow-lg shadow-yellow-500/40">
									CAMPEÃO
								</Badge>
							</div>
							<div
								className={cn(
									"h-48 w-full rounded-t-2xl bg-gradient-to-b flex flex-col items-center justify-center p-4 text-white text-center shadow-2xl ring-1 ring-white/20",
									getPodiumColor(1),
								)}
							>
								<p className="font-black text-xl leading-tight mt-12 truncate w-full px-2">
									{podium[0].patient_name}
								</p>
								<div className="flex items-center gap-1.5 mt-2 bg-black/10 px-3 py-1 rounded-full">
									<Star className="h-4 w-4 fill-white" />
									<span className="text-base font-bold">
										{podium[0].total_xp.toLocaleString()} XP
									</span>
								</div>
								<div className="mt-2 flex items-center gap-1 opacity-90">
									<Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
									<span className="text-xs font-bold">
										{podium[0].current_streak} dias de sequência
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* 3rd Place */}
					<div className="order-3 flex flex-col items-center justify-end h-full pt-12">
						<div
							className="relative group cursor-pointer w-full"
							onClick={() => setSelectedPatient(podium[2].patient_id)}
						>
							<div
								className={cn(
									"absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-transform group-hover:scale-110",
								)}
							>
								<div className="w-14 h-14 rounded-full border-4 border-amber-700 bg-amber-50 flex items-center justify-center shadow-lg overflow-hidden">
									<span className="text-lg font-black text-amber-800">
										{podium[2].patient_name.charAt(0)}
									</span>
								</div>
								<Badge className="mt-2 bg-amber-700 text-white border-none px-3">
									3º Lugar
								</Badge>
							</div>
							<div
								className={cn(
									"h-24 w-full rounded-t-2xl bg-gradient-to-b flex flex-col items-center justify-center p-4 text-white text-center shadow-lg",
									getPodiumColor(3),
								)}
							>
								<p className="font-bold text-base leading-tight mt-4 truncate w-full px-2">
									{podium[2].patient_name}
								</p>
								<div className="flex items-center gap-1 mt-1">
									<Star className="h-3 w-3 fill-white" />
									<span className="text-xs font-medium">
										{podium[2].total_xp.toLocaleString()} XP
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Filters Header */}
			<Card className="border-none shadow-xl shadow-primary/5 bg-background/60 backdrop-blur-xl ring-1 ring-border/50 overflow-hidden">
				<CardHeader>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Trophy className="h-5 w-5 text-yellow-500" />
								Ranking de Gamificação
							</CardTitle>
							<CardDescription>
								{totalCount} {totalCount === 1 ? "paciente" : "pacientes"} no
								sistema
							</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={exportToCSV}
							className="gap-2"
						>
							<Download className="h-4 w-4" />
							Exportar CSV
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row gap-4">
						{/* Search */}
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por nome..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="pl-10"
							/>
						</div>

						{/* Period Filter */}
						<Select
							value={filters.period}
							onValueChange={(value) => setFilters({ period: value as string })}
						>
							<SelectTrigger className="w-full md:w-[180px]">
								<SelectValue placeholder="Período" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos os tempos</SelectItem>
								<SelectItem value="week">Última semana</SelectItem>
								<SelectItem value="month">Último mês</SelectItem>
							</SelectContent>
						</Select>

						{/* Category Filter */}
						<Select
							value={filters.category}
							onValueChange={(value) =>
								setFilters({
									category: value as string,
									sortBy: value as string,
								})
							}
						>
							<SelectTrigger className="w-full md:w-[180px]">
								<SelectValue placeholder="Ordenar por" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="level">Nível</SelectItem>
								<SelectItem value="xp">XP Total</SelectItem>
								<SelectItem value="streak">Streak Atual</SelectItem>
								<SelectItem value="achievements">Conquistas</SelectItem>
							</SelectContent>
						</Select>

						{/* Refresh */}
						<Button
							variant="outline"
							size="icon"
							onClick={refresh}
							disabled={isLoading}
						>
							<RefreshCw
								className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Table */}
			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="p-6">
							<LoadingSkeleton type="list" rows={5} />
						</div>
					) : leaderboard.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
							<Trophy className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold text-foreground mb-2">
								Nenhum paciente encontrado
							</h3>
							<p className="text-sm text-muted-foreground max-w-sm mx-auto">
								Tente ajustar os filtros ou aguarde os pacientes começarem a
								usar o sistema de gamificação
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-16 text-center">#</TableHead>
											<SortableHeader column="patient_name" label="Paciente" />
											<SortableHeader column="level" label="Nível" />
											<SortableHeader column="total_xp" label="XP Total" />
											<SortableHeader column="current_streak" label="Streak" />
											<SortableHeader column="longest_streak" label="Recorde" />
											<SortableHeader
												column="achievements_count"
												label="Conquistas"
											/>
											<TableHead className="w-24 text-center">Ações</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{leaderboard.map((entry, _index) => (
											<TableRow
												key={entry.patient_id}
												className="hover:bg-accent/50 cursor-pointer"
												onClick={() => setSelectedPatient(entry.patient_id)}
											>
												<TableCell className="text-center">
													<div className="flex justify-center">
														{getRankIcon(entry.rank!)}
													</div>
												</TableCell>
												<TableCell>
													<div>
														<p className="font-medium">{entry.patient_name}</p>
														{entry.email && (
															<p className="text-xs text-muted-foreground truncate max-w-[150px]">
																{entry.email}
															</p>
														)}
													</div>
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="font-bold">
														Lvl {entry.level}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<Star className="h-3 w-3 text-yellow-500" />
														<span className="font-semibold">
															{entry.total_xp.toLocaleString()}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<Flame className="h-3 w-3 text-orange-500" />
														<span>{entry.current_streak}</span>
													</div>
												</TableCell>
												<TableCell>
													<span className="text-muted-foreground">
														{entry.longest_streak}
													</span>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">
														{entry.achievements_count}
													</Badge>
												</TableCell>
												<TableCell className="text-center">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={(e) => {
															e.stopPropagation();
															setSelectedPatient(entry.patient_id);
														}}
													>
														<Eye className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between px-6 py-4 border-t">
									<p className="text-sm text-muted-foreground">
										Página {filters.page} de {totalPages} ({totalCount}{" "}
										registros)
									</p>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="icon"
											onClick={() => handlePageChange(filters.page - 1)}
											disabled={filters.page === 1}
											aria-label="Página anterior"
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<div className="flex items-center gap-1">
											{Array.from(
												{ length: Math.min(5, totalPages) },
												(_, i) => {
													let pageNum;
													if (totalPages <= 5) {
														pageNum = i + 1;
													} else if (filters.page <= 3) {
														pageNum = i + 1;
													} else if (filters.page >= totalPages - 2) {
														pageNum = totalPages - 4 + i;
													} else {
														pageNum = filters.page - 2 + i;
													}

													return (
														<Button
															key={pageNum}
															variant={
																filters.page === pageNum ? "default" : "outline"
															}
															size="icon"
															className="h-8 w-8"
															onClick={() => handlePageChange(pageNum)}
															aria-label={`Página ${pageNum}`}
															aria-current={
																filters.page === pageNum ? "page" : undefined
															}
														>
															{pageNum}
														</Button>
													);
												},
											)}
										</div>
										<Button
											variant="outline"
											size="icon"
											onClick={() => handlePageChange(filters.page + 1)}
											disabled={filters.page === totalPages}
											aria-label="Próxima página"
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Patient Details Sheet */}
			{selectedPatient && (
				<PatientGamificationDetails
					patientId={selectedPatient}
					open={!!selectedPatient}
					onOpenChange={(open) => !open && setSelectedPatient(null)}
					onAdjustXp={adjustXp.mutateAsync}
					onResetStreak={resetStreak.mutateAsync}
				/>
			)}
		</div>
	);
};

export default LeaderboardTable;
