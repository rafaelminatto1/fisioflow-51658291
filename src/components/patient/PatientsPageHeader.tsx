import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Plus,
	Search,
	Users,
	Download,
	Activity,
	AlertTriangle,
	Clock,
	Sparkles,
	CheckCircle2,
	ArrowUpDown,
	FileText,
	PieChart,
	Zap,
} from "lucide-react";
import type { PatientClassification } from "@/hooks/usePatientStats";
import { cn } from "@/lib/utils";
import { PatientPageInsights } from "./PatientPageInsights";

export interface PatientsPageHeaderStats {
	totalCount: number;
	currentPage: number;
	totalPages: number;
	activeCount: number;
	newCount: number;
	completedCount: number;
	activeByClassification: number;
	inactive7: number;
	inactive30: number;
	inactive60: number;
	noShowRisk: number;
	hasUnpaid: number;
	newPatients: number;
}

export interface PatientsPageHeaderProps {
	stats: PatientsPageHeaderStats;
	onNewPatient: () => void;
	onExport: () => void;
	onToggleAnalytics: () => void;
	showAnalytics: boolean;
	searchTerm: string;
	onSearchChange: (value: string) => void;
	statusFilter: string;
	onStatusFilterChange: (value: string) => void;
	conditionFilter: string;
	onConditionFilterChange: (value: string) => void;
	uniqueConditions: string[];
	sortBy: string;
	onSortByChange: (value: string) => void;
	activeAdvancedFiltersCount: number;
	totalFilteredLabel?: string;
	onClearAllFilters: () => void;
	hasActiveFilters: boolean;
	classificationFilter?: PatientClassification | "all";
	onClassificationFilterChange?: (
		classification: PatientClassification | "all",
	) => void;
	children?: React.ReactNode;
}

export function PatientsPageHeader({
	stats,
	onNewPatient,
	onExport,
	onToggleAnalytics,
	showAnalytics,
	searchTerm,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	conditionFilter,
	onConditionFilterChange,
	uniqueConditions,
	sortBy,
	onSortByChange,
	activeAdvancedFiltersCount,
	totalFilteredLabel,
	onClearAllFilters,
	hasActiveFilters,
	classificationFilter = "all",
	onClassificationFilterChange,
	children,
}: PatientsPageHeaderProps) {
	return (
		<div className="space-y-6" data-testid="patients-page-header">
			{/* Main Header Container - Ultra Premium Glassmorphism */}
			<div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-800/30 shadow-2xl shadow-primary/5 p-6 md:p-8">
				{/* Top Row: Title + Quick Actions */}
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
					<div className="flex items-center gap-4">
						<div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner shadow-primary/20">
							<Users className="h-7 w-7 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
								Pacientes
							</h1>
							<p className="text-sm font-medium text-muted-foreground/80 flex items-center gap-2">
								<span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
								{stats.totalCount} registros na base clínica
							</p>
						</div>
					</div>

					{/* Quick Actions - "Itens Rápidos" */}
					<div className="flex flex-wrap items-center gap-3">
						<Button
							onClick={onNewPatient}
							className="h-14 px-8 rounded-3xl bg-primary text-white shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95 gap-3 font-black text-xs uppercase tracking-widest border-b-4 border-primary-foreground/20"
						>
							<div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
								<Plus className="h-4 w-4" />
							</div>
							<span>Novo Paciente</span>
						</Button>

						<div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-[1.75rem] border border-white/50 dark:border-white/10 backdrop-blur-xl shadow-inner">
							<QuickActionButton
								icon={Download}
								label="Exportar"
								onClick={onExport}
								title="Exportar base de pacientes"
							/>
							<div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
							<QuickActionButton
								icon={PieChart}
								label="Análises"
								onClick={onToggleAnalytics}
								active={showAnalytics}
								title={showAnalytics ? "Ocultar análises" : "Ver análises clínicas"}
							/>
							<QuickActionButton
								icon={Zap}
								label="Insights"
								onClick={() => {}} 
								variant="premium"
								title="IA Clinical Insights"
							/>
						</div>
					</div>
				</div>

				{/* Dashboard Cards Row - Moved from sidebar to top section */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
					<HeaderStatCard
						label="Ativos"
						value={stats.activeByClassification}
						icon={CheckCircle2}
						color="emerald"
						isSelected={classificationFilter === "active"}
						onClick={() => onClassificationFilterChange?.("active")}
					/>
					<HeaderStatCard
						label="Novos"
						value={stats.newPatients}
						icon={Sparkles}
						color="blue"
						isSelected={classificationFilter === "new_patient"}
						onClick={() => onClassificationFilterChange?.("new_patient")}
					/>
					<HeaderStatCard
						label="Em Risco"
						value={stats.noShowRisk}
						icon={AlertTriangle}
						color="orange"
						isSelected={classificationFilter === "no_show_risk"}
						onClick={() => onClassificationFilterChange?.("no_show_risk")}
					/>
					<HeaderStatCard
						label="Finalizados"
						value={stats.completedCount}
						icon={CheckCircle2}
						color="purple"
						isSelected={classificationFilter === "completed" as any}
						onClick={() => {}}
					/>
				</div>

				{/* Search & Filter Row - Refactored for better flow */}
				<div className="flex flex-col xl:flex-row items-center gap-5">
					<div className="relative flex-1 w-full group">
						<div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
							<Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
						</div>
						<input
							type="search"
							placeholder="Buscar por nome, patologia ou contato..."
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							className="h-16 w-full rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 pl-14 pr-6 text-sm font-bold ring-offset-background transition-all placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/40 shadow-inner"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
						<Select value={statusFilter} onValueChange={onStatusFilterChange}>
							<SelectTrigger className="h-16 w-full sm:w-[180px] text-xs font-black uppercase tracking-widest rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 focus:ring-primary/10">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent className="rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-2xl p-2">
								<SelectItem value="all" className="rounded-xl font-bold">Todos status</SelectItem>
								<SelectItem value="Inicial" className="rounded-xl font-bold">Inicial</SelectItem>
								<SelectItem value="Em Tratamento" className="rounded-xl font-bold">Em Tratamento</SelectItem>
								<SelectItem value="Recuperação" className="rounded-xl font-bold">Recuperação</SelectItem>
								<SelectItem value="Concluído" className="rounded-xl font-bold">Concluído</SelectItem>
							</SelectContent>
						</Select>

						<Select value={conditionFilter} onValueChange={onConditionFilterChange}>
							<SelectTrigger className="h-16 w-full sm:w-[200px] text-xs font-black uppercase tracking-widest rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 focus:ring-primary/10">
								<SelectValue placeholder="Condição" />
							</SelectTrigger>
							<SelectContent className="rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-2xl p-2">
								<SelectItem value="all" className="rounded-xl font-bold">Todas condições</SelectItem>
								{uniqueConditions.map((c) => (
									<SelectItem key={String(c)} value={String(c)} className="rounded-xl font-bold">
										{String(c)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={sortBy} onValueChange={onSortByChange}>
							<SelectTrigger className="h-16 w-full sm:w-[200px] text-xs font-black uppercase tracking-widest rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 focus:ring-primary/10">
								<div className="flex items-center gap-3">
									<ArrowUpDown className="h-4 w-4 text-primary" />
									<SelectValue placeholder="Ordenar" />
								</div>
							</SelectTrigger>
							<SelectContent className="rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-2xl p-2">
								<SelectItem value="created_at_desc" className="rounded-xl font-bold">Mais recentes</SelectItem>
								<SelectItem value="created_at_asc" className="rounded-xl font-bold">Mais antigos</SelectItem>
								<SelectItem value="name_asc" className="rounded-xl font-bold">Nome (A-Z)</SelectItem>
								<SelectItem value="name_desc" className="rounded-xl font-bold">Nome (Z-A)</SelectItem>
								<SelectItem value="main_condition_asc" className="rounded-xl font-bold">Patologia (A-Z)</SelectItem>
								<SelectItem value="main_condition_desc" className="rounded-xl font-bold">Patologia (Z-A)</SelectItem>
							</SelectContent>
						</Select>

						{children}
					</div>
				</div>

				{/* Integrated Insights Pill */}
				<div className="mt-8">
					<PatientPageInsights
						totalPatients={stats.totalCount}
						classificationStats={stats as any}
					/>
				</div>

				{/* Active Filter Clearances */}
				{hasActiveFilters && (
					<div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-6 animate-in fade-in slide-in-from-top-2 duration-500">
						<div className="flex items-center gap-4">
							<div className="flex -space-x-2">
								<div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-white dark:border-slate-900 flex items-center justify-center">
									<Activity className="h-4 w-4 text-primary" />
								</div>
							</div>
							<p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
								{totalFilteredLabel ?? "Base Filtrada"}
							</p>
						</div>
						<button
							type="button"
							onClick={onClearAllFilters}
							className="group text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-white transition-all bg-red-50 hover:bg-red-500 dark:bg-red-950/20 px-6 py-2.5 rounded-full border border-red-100 dark:border-red-900/30 flex items-center gap-2"
						>
							<Plus className="h-3 w-3 rotate-45 transition-transform group-hover:scale-125" />
							Limpar Filtros
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function QuickActionButton({
	icon: Icon,
	label,
	onClick,
	active,
	variant = "default",
	title,
}: {
	icon: any;
	label: string;
	onClick: () => void;
	active?: boolean;
	variant?: "default" | "premium";
	title: string;
}) {
	if (variant === "premium") {
		return (
			<Button
				variant="ghost"
				size="sm"
				onClick={onClick}
				className={cn(
					"h-11 px-4 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-wider transition-all relative overflow-hidden",
					"bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
				)}
				title={title}
			>
				<Icon className="h-4 w-4 animate-pulse" />
				<span className="hidden sm:inline">{label}</span>
				<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={onClick}
			className={cn(
				"h-11 px-4 rounded-2xl gap-2 text-[10px] font-black uppercase tracking-wider transition-all",
				active
					? "bg-white dark:bg-slate-900 text-primary shadow-xl shadow-primary/10 border border-primary/20 scale-105"
					: "text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-primary",
			)}
			title={title}
		>
			<Icon className={cn("h-4 w-4", active && "animate-bounce")} />
			<span className="hidden sm:inline">{label}</span>
		</Button>
	);
}

function HeaderStatCard({
	label,
	value,
	icon: Icon,
	color,
	isSelected,
	onClick,
}: {
	label: string;
	value: number;
	icon: any;
	color: "emerald" | "blue" | "orange" | "purple";
	isSelected?: boolean;
	onClick?: () => void;
}) {
	const colorMap = {
		emerald: {
			bg: "from-emerald-500/10 to-emerald-500/[0.02]",
			border: "border-emerald-500/20",
			hoverBorder: "hover:border-emerald-500/40",
			text: "text-emerald-600",
			val: "text-emerald-700 dark:text-emerald-400",
			iconBg: "bg-emerald-500/20",
			indicator: "bg-emerald-500/20",
		},
		blue: {
			bg: "from-blue-500/10 to-blue-500/[0.02]",
			border: "border-blue-500/20",
			hoverBorder: "hover:border-blue-500/40",
			text: "text-blue-600",
			val: "text-blue-700 dark:text-blue-400",
			iconBg: "bg-blue-500/20",
			indicator: "bg-blue-500/20",
		},
		orange: {
			bg: "from-orange-500/10 to-orange-500/[0.02]",
			border: "border-orange-500/20",
			hoverBorder: "hover:border-orange-500/40",
			text: "text-orange-600",
			val: "text-orange-700 dark:text-orange-400",
			iconBg: "bg-orange-500/20",
			indicator: "bg-orange-500/20",
		},
		purple: {
			bg: "from-purple-500/10 to-purple-500/[0.02]",
			border: "border-purple-500/20",
			hoverBorder: "hover:border-purple-500/40",
			text: "text-purple-600",
			val: "text-purple-700 dark:text-purple-400",
			iconBg: "bg-purple-500/20",
			indicator: "bg-purple-500/20",
		},
	};

	const c = colorMap[color];

	return (
		<div
			onClick={onClick}
			className={cn(
				"p-4 rounded-3xl bg-gradient-to-br border space-y-1 group transition-all duration-300 cursor-pointer relative overflow-hidden",
				c.bg,
				c.border,
				c.hoverBorder,
				isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
				!isSelected && "hover:scale-[1.02] active:scale-95",
			)}
		>
			<div className="flex items-center justify-between">
				<p className={cn("text-[9px] font-black uppercase tracking-[0.15em]", c.text)}>
					{label}
				</p>
				<div className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-transform group-hover:rotate-12", c.iconBg)}>
					<Icon className={cn("h-3.5 w-3.5", c.text)} />
				</div>
			</div>
			<p className={cn("text-3xl font-black tabular-nums", c.val)}>
				{value}
			</p>
			<div className={cn("h-1 w-12 rounded-full transition-all group-hover:w-full", c.indicator)} />
			
			{/* Subtle decorative background icon */}
			<Icon className={cn("absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] transition-all group-hover:scale-110", c.text)} />
		</div>
	);
}
