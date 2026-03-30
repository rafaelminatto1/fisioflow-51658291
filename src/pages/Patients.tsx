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
} from "@/components/patients";
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

	if (isLoading && patients.length === 0) {
		return (
			<MainLayout>
				<LoadingSkeleton type="card" rows={4} />
			</MainLayout>
		);
	}

	const activeAdvancedFiltersCount = countActiveFilters({
		classification:
			filtersState.classification !== "all"
				? (filtersState.classification as any)
				: undefined,
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
		!!filtersState.search;

	return (
		<MainLayout>
			<div
				className="space-y-4 animate-fade-in pb-20 sm:space-y-5 md:pb-0"
				data-testid="patients-page"
			>
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
									"h-10 w-10 shrink-0",
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
						<PopoverContent className="w-[320px] p-4" align="end">
							<PatientAdvancedFilters
								onFilterChange={(f) => updateSearchParams(f as any)}
								activeFiltersCount={activeAdvancedFiltersCount}
								onClearFilters={() =>
									updateSearchParams({ classification: undefined })
								}
							/>
						</PopoverContent>
					</Popover>
				</PatientsPageHeader>

				<Tabs
					value={activeTab}
					onValueChange={(v) => updateSearchParams({ tab: v })}
					className="w-full"
				>
					<TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
						<TabsTrigger
							value="list"
							className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
						>
							Gestão de Pacientes
						</TabsTrigger>
						<TabsTrigger
							value="birthdays"
							className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider gap-2"
						>
							<Cake className="h-3.5 w-3.5 text-pink-500" />
							Aniversariantes
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="list"
						className="space-y-4 animate-in fade-in-50 duration-300"
					>
						<IncompleteRegistrationAlert />

						<PatientPageInsights
							totalPatients={patients.length}
							classificationStats={filteredStats}
						/>

						{/* Analytics Dashboard */}
						{showAnalytics && (
							<LazyComponent
								placeholder={
									<div className="h-[300px] w-full bg-muted/50 rounded-xl animate-pulse" />
								}
							>
								<PatientAnalytics
									totalPatients={totalCount}
									classificationStats={filteredStats}
								/>
							</LazyComponent>
						)}

						{patients.length === 0 ? (
							<EmptyState
								icon={Users}
								title={
									hasActiveFilters
										? "Nenhum paciente encontrado"
										: "Nenhum paciente cadastrado"
								}
								description={
									hasActiveFilters
										? "Nenhum paciente corresponde aos filtros aplicados. Tente ajustar ou limpar os filtros."
										: "Comece adicionando seu primeiro paciente."
								}
								action={
									hasActiveFilters
										? {
												label: "Limpar filtros",
												onClick: handleClearAllFilters,
											}
										: {
												label: "Novo Paciente",
												onClick: () => updateSearchParams({ modal: "create" }),
											}
								}
							/>
						) : (
							<>
								<div
									className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in"
									data-testid="patient-list"
								>
									{patients.map((patient) => {
										const patientStats = statsMap[patient.id];
										return (
											<LazyComponent
												key={patient.id}
												placeholder={
													<div className="h-[140px] w-full bg-muted/50 rounded-xl animate-pulse" />
												}
												rootMargin="200px"
												className="h-full"
											>
												<PatientListItem
													patient={patient}
													stats={patientStats}
													onClick={() => navigate(`/patients/${patient.id}`)}
												/>
											</LazyComponent>
										);
									})}
								</div>

								{totalPages > 1 && (
									<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
										<p className="text-sm text-muted-foreground order-2 sm:order-1">
											Mostrando {(currentPage - 1) * pageSize + 1}–
											{Math.min(currentPage * pageSize, totalCount)} de{" "}
											{totalCount}
										</p>
										<Pagination className="order-1 sm:order-2">
											<PaginationContent>
												<PaginationItem>
													<PaginationPrevious
														onClick={() =>
															updateSearchParams({
																page: String(currentPage - 1),
															})
														}
														className={
															currentPage <= 1
																? "pointer-events-none opacity-50"
																: "cursor-pointer"
														}
													/>
												</PaginationItem>
												{Array.from(
													{ length: Math.min(5, totalPages) },
													(_, i) => {
														const pageNum =
															totalPages <= 5
																? i + 1
																: currentPage <= 3
																	? i + 1
																	: currentPage >= totalPages - 2
																		? totalPages - 4 + i
																		: currentPage - 2 + i;
														return (
															<PaginationItem key={pageNum}>
																<PaginationLink
																	onClick={() =>
																		updateSearchParams({
																			page: String(pageNum),
																		})
																	}
																	isActive={currentPage === pageNum}
																	className="cursor-pointer"
																>
																	{pageNum}
																</PaginationLink>
															</PaginationItem>
														);
													},
												)}
												<PaginationItem>
													<PaginationNext
														onClick={() =>
															updateSearchParams({
																page: String(currentPage + 1),
															})
														}
														className={
															currentPage >= totalPages
																? "pointer-events-none opacity-50"
																: "cursor-pointer"
														}
													/>
												</PaginationItem>
											</PaginationContent>
										</Pagination>
									</div>
								)}
							</>
						)}
					</TabsContent>

					<TabsContent
						value="birthdays"
						className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
					>
						<AniversariantesContent />
					</TabsContent>
				</Tabs>
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
