/**
 * Patients Page - React Router v7 Library Mode
 *
 * Migrated from Framework Mode to Library Mode.
 * Uses React Query for data fetching via usePatientsPageData hook.
 *
 * @version 2.0.0 - Library Mode
 */

import { Cake, Filter, Users, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LazyComponent } from "@/components/common/LazyComponent";
import { IncompleteRegistrationAlert } from "@/components/dashboard/IncompleteRegistrationAlert";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	countActiveFilters,
	PatientAdvancedFilters,
	PatientAnalytics,
	PatientCreateModal,
	PatientPageInsights,
	PatientsPageHeader,
} from "@/components/patient";
import { PatientListItem } from "@/components/patient/PatientListItem";
import { EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientsPageData } from "@/hooks/usePatientsPage";
import { patientRoutes } from "@/lib/routing/appRoutes";
import { cn } from "@/lib/utils";
import { AniversariantesContent } from "./relatorios/AniversariantesPage";

// Refactored hooks
import { usePatientsExport } from "./patients/usePatientsExport";
import { usePatientsStats } from "./patients/usePatientsStats";
import { usePatientsUrlState } from "./patients/usePatientsUrlState";

const Patients = () => {
	const navigate = useNavigate();

	// Custom hook for URL state and filters
	const {
		filters,
		filtersState,
		searchTerm,
		setSearchTerm,
		updateSearchParams,
		handleClearAllFilters,
		isNewPatientModalOpen,
		showAnalytics,
		activeTab,
		pageParam,
	} = usePatientsUrlState();

	// Data fetching
	const { data, isLoading } = usePatientsPageData(filters);
	const { patients, totalCount, statsMap, uniqueConditions } = data;

	// Export logic
	const { exportPatients } = usePatientsExport();

	// Calculate stats
	const filteredStats = usePatientsStats(patients, statsMap, totalCount);

	const pagination = useMemo(
		() => ({
			currentPage: pageParam,
			totalPages: Math.ceil(totalCount / 20),
			pageSize: 20,
		}),
		[pageParam, totalCount],
	);

	const { currentPage, totalPages, pageSize } = pagination;

	const activeAdvancedFiltersCount = countActiveFilters({
		classification:
			filtersState.classification !== "all"
				? (filtersState.classification as any)
				: undefined,
		hasSurgery: filtersState.hasSurgery,
	});

	const headerStats = {
		totalCount,
		currentPage,
		totalPages,
		activeCount: filteredStats.active,
		newCount: filteredStats.newPatients,
		completedCount: filteredStats.completed,
		activeByClassification: filteredStats.active,
		inactive7: filteredStats.inactive7,
		inactive30: filteredStats.inactive30,
		inactive60: filteredStats.inactive60,
		noShowRisk: filteredStats.noShowRisk,
		hasUnpaid: filteredStats.hasUnpaid,
		newPatients: filteredStats.newPatients,
	};

	const hasActiveFilters =
		filtersState.status !== "all" ||
		filtersState.condition !== "all" ||
		filtersState.classification !== "all" ||
		filtersState.hasSurgery ||
		!!filtersState.search;

	return (
		<MainLayout>
			<div
				className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-8"
				data-testid="patients-page"
			>
				{/* Refactored Header - Now contains all dashboard stats and search */}
				<PatientsPageHeader
					stats={headerStats}
					onNewPatient={() => updateSearchParams({ modal: "create" })}
					onExport={() => exportPatients(patients, statsMap)}
					onToggleAnalytics={() =>
						updateSearchParams({
							analytics: showAnalytics ? undefined : "true",
						})
					}
					showAnalytics={showAnalytics}
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					statusFilter={filtersState.status}
					onStatusFilterChange={(s) => updateSearchParams({ status: s })}
					conditionFilter={filtersState.condition}
					onConditionFilterChange={(c) => updateSearchParams({ condition: c })}
					uniqueConditions={uniqueConditions}
					sortBy={filtersState.sortBy}
					onSortByChange={(s) => updateSearchParams({ sortBy: s })}
					activeAdvancedFiltersCount={activeAdvancedFiltersCount}
					totalFilteredLabel={
						hasActiveFilters ? `${totalCount} encontrado(s)` : undefined
					}
					onClearAllFilters={handleClearAllFilters}
					hasActiveFilters={hasActiveFilters}
					classificationFilter={filtersState.classification as any}
					onClassificationFilterChange={(c) =>
						updateSearchParams({ classification: c })
					}
				>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className={cn(
									"h-14 w-14 rounded-[1.25rem] border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 shrink-0",
									activeAdvancedFiltersCount > 0 &&
										"border-primary bg-primary/5 text-primary",
								)}
								title="Filtros avançados"
							>
								<div className="relative">
									<Filter className="h-5 w-5" />
									{activeAdvancedFiltersCount > 0 && (
										<span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shadow-lg shadow-primary/30">
											{activeAdvancedFiltersCount}
										</span>
									)}
								</div>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[320px] p-4 rounded-3xl shadow-premium border-border/40 backdrop-blur-xl" align="end">
							<PatientAdvancedFilters
								currentFilters={{
									classification: filtersState.classification as any,
									hasSurgery: filtersState.hasSurgery,
								}}
								onFilterChange={(f) => updateSearchParams(f as any)}
								activeFiltersCount={activeAdvancedFiltersCount}
								onClearFilters={handleClearAllFilters}
							/>
						</PopoverContent>
					</Popover>
				</PatientsPageHeader>

				{/* Main Content Area - Full Width / Centered */}
				<div className="space-y-8">
					<Tabs
						value={activeTab}
						onValueChange={(v) => updateSearchParams({ tab: v })}
						className="w-full"
					>
						<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
							<div className="relative p-1.5 rounded-[2rem] bg-slate-100/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/10 backdrop-blur-xl shadow-inner flex items-center gap-1">
								<TabsList className="bg-transparent h-14 p-0 gap-1">
									<TabsTrigger
										value="list"
										className="rounded-[1.5rem] px-10 h-11 font-black text-[11px] uppercase tracking-[0.2em] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-500 hover:text-primary/70"
									>
										Gestão Clínica
									</TabsTrigger>
									<TabsTrigger
										value="birthdays"
										className="rounded-[1.5rem] px-10 h-11 font-black text-[11px] uppercase tracking-[0.2em] gap-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-500 hover:text-primary/70"
									>
										<Cake className="h-4 w-4 text-pink-500" />
										Aniversariantes
									</TabsTrigger>
								</TabsList>
								
								{/* Decorative indicator line - hidden in mobile */}
								<div className="hidden lg:block absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/20 rounded-full blur-[1px]" />
							</div>

							<div className="flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 px-6 py-3 rounded-[1.5rem] border border-white/20 dark:border-slate-800/30 backdrop-blur-md shadow-premium-sm">
								<div className="flex -space-x-2">
									{[1, 2, 3].map((i) => (
										<div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
									))}
								</div>
								<p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
									<span className="text-primary">{totalCount}</span> Pacientes Ativos
								</p>
							</div>
						</div>

						<TabsContent
							value="list"
							className="space-y-8 mt-0 focus-visible:outline-none"
						>
							{/* Analytics Dashboard with enhanced glass effect */}
							{showAnalytics && (
								<div className="animate-in fade-in slide-in-from-top-6 duration-700">
									<LazyComponent
										placeholder={
											<div className="h-[240px] w-full bg-muted/20 rounded-[2.5rem] animate-pulse border border-border/20" />
										}
									>
										<div className="p-1 rounded-[2.5rem] border border-border/20 bg-gradient-to-br from-background/40 to-secondary/10 backdrop-blur-md shadow-inner shadow-white/10">
											<PatientAnalytics
												totalPatients={totalCount}
												classificationStats={filteredStats}
											/>
										</div>
									</LazyComponent>
								</div>
							)}

							<IncompleteRegistrationAlert />

							{isLoading && patients.length === 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="h-48 w-full bg-muted/20 rounded-3xl animate-pulse border border-border/20" />
									))}
								</div>
							) : patients.length === 0 ? (
								<div className="py-20">
									<EmptyState
										icon={Users}
										title={
											hasActiveFilters
												? "Busca sem resultados"
												: "Nenhum paciente cadastrado"
										}
										description={
											hasActiveFilters
												? "Tente remover alguns filtros para encontrar o que procura."
												: "Sua base de pacientes está vazia. Comece adicionando o primeiro!"
										}
										action={
											hasActiveFilters
												? {
														label: "Ver Todos os Pacientes",
														onClick: handleClearAllFilters,
													}
												: {
														label: "Cadastrar Primeiro Paciente",
														onClick: () => updateSearchParams({ modal: "create" }),
													}
										}
									/>
								</div>
							) : (
								<div className="space-y-10">
									<div
										className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
										data-testid="patient-list"
									>
										{patients.map((patient, index) => {
											const patientStats = statsMap[patient.id];
											return (
												<div 
													key={patient.id} 
													className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both"
													style={{ animationDelay: `${index * 80}ms` }}
												>
													<LazyComponent
														placeholder={
															<div className="h-[160px] w-full bg-muted/20 rounded-3xl animate-pulse border border-border/20" />
														}
														rootMargin="150px"
													>
														<PatientListItem
															patient={patient}
															stats={patientStats}
															onClick={() => {
																const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
																if (patient.id && UUID_REGEX.test(patient.id)) {
																	navigate(patientRoutes.profile(patient.id));
																}
															}}
														/>
													</LazyComponent>
												</div>
											);
										})}
									</div>

									{totalPages > 1 && (
										<div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-10 border-t border-border/20">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 bg-secondary/20 px-6 py-2.5 rounded-full backdrop-blur-sm border border-border/10">
												Exibindo {Math.min(currentPage * pageSize, totalCount)} de {totalCount} pacientes
											</p>
											<Pagination className="w-auto ml-auto mr-0">
												<PaginationContent className="gap-3">
													<PaginationItem>
														<PaginationPrevious
															onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
															className={cn(
																"h-12 w-12 rounded-2xl border-border/20 hover:bg-background shadow-sm transition-all",
																currentPage <= 1 && "pointer-events-none opacity-30"
															)}
														/>
													</PaginationItem>
													
													<div className="flex items-center gap-2 bg-secondary/10 p-1.5 rounded-2xl border border-border/10">
														<span className="text-sm font-black px-4 py-1.5 bg-background rounded-xl shadow-premium text-primary">
															{currentPage}
														</span>
														<span className="text-[10px] font-black text-muted-foreground px-2 uppercase tracking-tighter opacity-50">
															/ {totalPages}
														</span>
													</div>

													<PaginationItem>
														<PaginationNext
															onClick={() => updateSearchParams({ page: String(currentPage + 1) })}
															className={cn(
																"h-12 w-12 rounded-2xl border-border/20 hover:bg-background shadow-sm transition-all",
																currentPage >= totalPages && "pointer-events-none opacity-30"
															)}
														/>
													</PaginationItem>
												</PaginationContent>
											</Pagination>
										</div>
									)}
								</div>
							)}
						</TabsContent>

						<TabsContent
							value="birthdays"
							className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-right-8 duration-700"
						>
							<div className="p-1 rounded-[2.5rem] border border-border/20 bg-gradient-to-br from-secondary/10 to-background/5 backdrop-blur-md overflow-hidden shadow-inner shadow-white/5">
								<AniversariantesContent />
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
			<PatientCreateModal
				open={isNewPatientModalOpen}
				onOpenChange={(open) =>
					updateSearchParams({ modal: open ? "create" : undefined })
				}
			/>
		</MainLayout>
	);
};

export default Patients;
