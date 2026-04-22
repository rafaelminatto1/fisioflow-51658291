/**
 * Patients Page - React Router v7 Library Mode
 *
 * Migrated from Framework Mode to Library Mode.
 * Uses React Query for data fetching via usePatientsPageData hook.
 *
 * @version 2.0.0 - Library Mode
 */

import { Cake, Filter, Users } from "lucide-react";
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
				className="space-y-6 animate-fade-in pb-20 md:pb-8"
				data-testid="patients-page"
			>
				{/* Modern Sticky Glass Header Container */}
				<div className="sticky top-0 z-30 -mx-4 px-4 py-4 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-300">
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
										"h-8 w-8 rounded-lg shrink-0",
										activeAdvancedFiltersCount > 0 &&
											"border-primary bg-primary/5 text-primary",
									)}
									title="Filtros avançados"
								>
									<div className="relative">
										<Filter className="h-4 w-4" />
										{activeAdvancedFiltersCount > 0 && (
											<span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground font-bold">
												{activeAdvancedFiltersCount}
											</span>
										)}
									</div>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[320px] p-4 rounded-2xl shadow-premium border-border/40" align="end">
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
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-1">
					{/* Sidebar / Stats Side - Premium Polished Cards */}
					<div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit">
						<div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
							<div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] border border-emerald-500/20 space-y-1 group hover:border-emerald-500/40 transition-all cursor-default">
								<div className="flex items-center justify-between">
									<p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ativos</p>
									<div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
										<CheckCircle2 className="h-3 w-3 text-emerald-600" />
									</div>
								</div>
								<p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{headerStats.activeCount}</p>
								<div className="h-1 w-12 bg-emerald-500/20 rounded-full" />
							</div>

							<div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/[0.02] border border-blue-500/20 space-y-1 group hover:border-blue-500/40 transition-all cursor-default">
								<div className="flex items-center justify-between">
									<p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Novos</p>
									<div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
										<Sparkles className="h-3 w-3 text-blue-600" />
									</div>
								</div>
								<p className="text-2xl font-black text-blue-700 dark:text-blue-400">{headerStats.newCount}</p>
								<div className="h-1 w-12 bg-blue-500/20 rounded-full" />
							</div>

							<div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/[0.02] border border-orange-500/20 space-y-1 group hover:border-orange-500/40 transition-all cursor-default">
								<div className="flex items-center justify-between">
									<p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Em Risco</p>
									<div className="h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center">
										<AlertTriangle className="h-3 w-3 text-orange-600" />
									</div>
								</div>
								<p className="text-2xl font-black text-orange-700 dark:text-orange-400">{headerStats.noShowRisk}</p>
								<div className="h-1 w-12 bg-orange-500/20 rounded-full" />
							</div>

							<div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/[0.02] border border-purple-500/20 space-y-1 group hover:border-purple-500/40 transition-all cursor-default">
								<div className="flex items-center justify-between">
									<p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Finalizados</p>
									<div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center">
										<CheckCircle2 className="h-3 w-3 text-purple-600" />
									</div>
								</div>
								<p className="text-2xl font-black text-purple-700 dark:text-purple-400">{headerStats.completedCount}</p>
								<div className="h-1 w-12 bg-purple-500/20 rounded-full" />
							</div>
						</div>

						<PatientPageInsights
							totalPatients={patients.length}
							classificationStats={filteredStats}
						/>
					</div>

					{/* Main Content Area */}
					<div className="lg:col-span-3 space-y-6">
						<Tabs
							value={activeTab}
							onValueChange={(v) => updateSearchParams({ tab: v })}
							className="w-full"
						>
							<div className="flex items-center justify-between mb-6">
								<TabsList className="bg-secondary/40 p-1 rounded-2xl h-11 border border-border/30">
									<TabsTrigger
										value="list"
										className="rounded-xl px-6 h-9 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-premium data-[state=active]:text-primary transition-all"
									>
										Gestão Clínica
									</TabsTrigger>
									<TabsTrigger
										value="birthdays"
										className="rounded-xl px-6 h-9 font-bold text-[10px] uppercase tracking-wider gap-2 data-[state=active]:bg-background data-[state=active]:shadow-premium data-[state=active]:text-primary transition-all"
									>
										<Cake className="h-3 w-3 text-pink-500" />
										Aniversariantes
									</TabsTrigger>
								</TabsList>

								<div className="hidden sm:flex items-center gap-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
										{totalCount} Registros
									</p>
								</div>
							</div>

							<TabsContent
								value="list"
								className="space-y-6 mt-0 focus-visible:outline-none"
							>
								{/* Analytics Dashboard with enhanced glass effect */}
								{showAnalytics && (
									<div className="animate-in fade-in slide-in-from-top-4 duration-500">
										<LazyComponent
											placeholder={
												<div className="h-[200px] w-full bg-muted/20 rounded-3xl animate-pulse border border-border/30" />
											}
										>
											<div className="p-4 rounded-3xl border border-border/30 bg-gradient-to-br from-background/40 to-secondary/10 backdrop-blur-sm shadow-sm">
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
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{Array.from({ length: 4 }).map((_, i) => (
											<div key={i} className="h-40 w-full bg-muted/20 rounded-2xl animate-pulse border border-border/20" />
										))}
									</div>
								) : patients.length === 0 ? (
									<div className="py-12">
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
									<div className="space-y-8">
										<div
											className="grid grid-cols-1 md:grid-cols-2 gap-5"
											data-testid="patient-list"
										>
											{patients.map((patient, index) => {
												const patientStats = statsMap[patient.id];
												return (
													<div 
														key={patient.id} 
														className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
														style={{ animationDelay: `${index * 50}ms` }}
													>
														<LazyComponent
															placeholder={
																<div className="h-[140px] w-full bg-muted/20 rounded-2xl animate-pulse border border-border/20" />
															}
															rootMargin="100px"
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
											<div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-border/30">
												<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-secondary/40 px-3 py-1.5 rounded-full">
													Exibindo {Math.min(currentPage * pageSize, totalCount)} de {totalCount} pacientes
												</p>
												<Pagination className="w-auto ml-auto mr-0">
													<PaginationContent className="gap-2">
														<PaginationItem>
															<PaginationPrevious
																onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
																className={cn(
																	"h-9 rounded-xl border-border/40 hover:bg-background transition-all",
																	currentPage <= 1 && "pointer-events-none opacity-40"
																)}
															/>
														</PaginationItem>
														
														<div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-xl">
															<span className="text-xs font-bold px-3 py-1 bg-background rounded-lg shadow-sm text-primary">
																{currentPage}
															</span>
															<span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-tighter">
																de {totalPages}
															</span>
														</div>

														<PaginationItem>
															<PaginationNext
																onClick={() => updateSearchParams({ page: String(currentPage + 1) })}
																className={cn(
																	"h-9 rounded-xl border-border/40 hover:bg-background transition-all",
																	currentPage >= totalPages && "pointer-events-none opacity-40"
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
								className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500"
							>
								<div className="p-1 rounded-3xl border border-border/30 bg-gradient-to-br from-secondary/30 to-background/20 backdrop-blur-sm overflow-hidden">
									<AniversariantesContent />
								</div>
							</TabsContent>
						</Tabs>
					</div>
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
