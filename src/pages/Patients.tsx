/**
 * Patients Page - React Router v7 Library Mode
 *
 * Migrated from Framework Mode to Library Mode.
 * Uses React Query for data fetching via usePatientsPageData hook.
 *
 * @version 2.0.0 - Library Mode
 */

import { PatientCard } from "@fisioflow/ui";
import { Cake, Filter, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LazyComponent } from "@/components/common/LazyComponent";
import { IncompleteRegistrationAlert } from "@/components/dashboard/IncompleteRegistrationAlert";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	countActiveFilters,
	PatientActions,
	PatientAdvancedFilters,
	PatientAnalytics,
	PatientCreateModal,
	type PatientFilters,
	PatientPageInsights,
	PatientsPageHeader,
} from "@/components/patients";
import { EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
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
import { usePrefetchPatientOnHover } from "@/hooks/performance";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { toast } from "@/hooks/use-toast";
import { useNavPreload } from "@/hooks/useIntelligentPreload";
import {
	type PatientsFilters,
	usePatientsPageData,
} from "@/hooks/usePatientsPage";
import { calculateAge, cn, exportToCSV } from "@/lib/utils";
import { PatientHelpers } from "@/types";
import { AniversariantesContent } from "./relatorios/AniversariantesPage";

// ============================================================================================
// COMPONENTS
// ============================================================================================

const PatientListItem = ({
	patient,
	stats,
	onClick,
}: {
	patient: any;
	stats: any;
	onClick: () => void;
}) => {
	const { prefetch } = usePrefetchPatientOnHover(patient.id);
	const { preloadRoute } = useNavPreload();

	const handleMouseEnter = () => {
		prefetch();
		preloadRoute(`/patients/${patient.id}`);
	};

	const patientName = PatientHelpers.getName(patient);

	return (
		<button
			type="button"
			onMouseEnter={handleMouseEnter}
			data-testid={`patient-card-${patient.id}`}
			data-patient-id={patient.id}
			className="h-full"
		>
			<PatientCard
				name={patientName || "Sem Nome"}
				condition={patient.main_condition}
				status={patient.status}
				stats={{
					sessionsCompleted: stats?.sessionsCompleted || 0,
					nextAppointment: stats?.nextAppointmentDate
						? new Date(stats.nextAppointmentDate).toLocaleDateString("pt-BR")
						: undefined,
				}}
				onClick={onClick}
				actions={<PatientActions patient={patient} />}
				className="h-full"
			/>
		</button>
	);
};

const Patients = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const searchParam = searchParams.get("q") || "";
	const statusParam = searchParams.get("status") || "all";
	const conditionParam = searchParams.get("condition") || "all";
	const classificationParam = searchParams.get("classification") || "all";
	const pageParam = parseInt(searchParams.get("page") || "1", 10);

	const [searchTerm, setSearchTerm] = useState(searchParam);
	const debouncedSearch = useDebounce(searchTerm, 300);

	const isNewPatientModalOpen = searchParams.get("modal") === "create";
	const showAnalytics = searchParams.get("analytics") === "true";
	const activeTab = (searchParams.get("tab") as "list" | "birthdays") || "list";

	const filters: PatientsFilters = useMemo(
		() => ({
			search: debouncedSearch,
			status: statusParam,
			condition: conditionParam,
			classification: classificationParam,
			page: pageParam,
			pageSize: 20,
		}),
		[
			debouncedSearch,
			statusParam,
			conditionParam,
			classificationParam,
			pageParam,
		],
	);

	const { data, mutations, isLoading } = usePatientsPageData(filters);

	const { patients, totalCount, statsMap, uniqueConditions } = data;

	const pagination = useMemo(
		() => ({
			currentPage: pageParam,
			totalPages: Math.ceil(totalCount / 20),
			pageSize: 20,
		}),
		[pageParam, totalCount],
	);

	const filtersState = useMemo(
		() => ({
			search: searchParam,
			status: statusParam,
			condition: conditionParam,
			classification: classificationParam,
		}),
		[searchParam, statusParam, conditionParam, classificationParam],
	);

	// Sync debounced search to URL
	useEffect(() => {
		const params = new URLSearchParams(searchParams);
		if (debouncedSearch) {
			params.set("q", debouncedSearch);
		} else {
			params.delete("q");
		}
		if (debouncedSearch !== searchParam) {
			params.set("page", "1"); // Reset page on search change
			setSearchParams(params, { replace: true });
		}
	}, [debouncedSearch, searchParam, setSearchParams, searchParams]);

	useEffect(() => {
		if (isNewPatientModalOpen) {
			// Close modal after successful creation (handled by mutation toast)
		}
	}, [isNewPatientModalOpen]);

	const { currentPage, totalPages, pageSize } = pagination;

	const filteredStats = useMemo(() => {
		const stats = {
			total: totalCount,
			active: 0,
			inactive7: 0,
			inactive30: 0,
			inactive60: 0,
			noShowRisk: 0,
			hasUnpaid: 0,
			newPatients: 0,
			completed: 0,
		};

		Object.values(statsMap).forEach((patientStats: any) => {
			switch (patientStats.classification) {
				case "active":
					stats.active++;
					break;
				case "inactive_7":
					stats.inactive7++;
					break;
				case "inactive_30":
					stats.inactive30++;
					break;
				case "inactive_custom":
					stats.inactive60++;
					break;
				case "no_show_risk":
					stats.noShowRisk++;
					break;
				case "has_unpaid":
					stats.hasUnpaid++;
					break;
				case "new_patient":
					stats.newPatients++;
					break;
			}
		});

		patients.forEach((p) => {
			if (p.status === "Concluído") stats.completed++;
		});

		return stats;
	}, [patients, statsMap, totalCount]);

	const updateSearchParams = (updates: Record<string, string | undefined>) => {
		const params = new URLSearchParams(searchParams);
		Object.entries(updates).forEach(([key, value]) => {
			if (value === undefined || value === "all") {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		});

		// Reset page when filtering, unless explicitly setting page
		if (updates.page === undefined && !updates.q) {
			params.set("page", "1");
		}

		setSearchParams(params);
	};

	const handleClearAllFilters = () => {
		setSearchTerm("");
		setSearchParams(new URLSearchParams());
	};

	const exportPatients = () => {
		const data = patients.map((patient) => {
			const patientName = PatientHelpers.getName(patient);
			const patientStats = statsMap[patient.id];
			return {
				name: patientName || "Sem nome",
				email: patient.email || "",
				phone: patient.phone || "",
				age: calculateAge(patient.birth_date),
				gender: patient.gender || "",
				condition: patient.main_condition || "",
				status: patient.status || "",
				progress: patient.progress || 0,
				sessions: patientStats?.sessionsCompleted || 0,
				firstEvaluation: patientStats?.firstEvaluationDate || "",
			};
		});

		const headers = [
			"Nome",
			"Email",
			"Telefone",
			"Idade",
			"Gênero",
			"Condição Principal",
			"Status",
			"Progresso",
			"Sessões",
			"Primeira Avaliação",
		];
		const success = exportToCSV(data, "pacientes.csv", headers);

		if (success) {
			toast({
				title: "Exportação concluída!",
				description: "Lista de pacientes exportada com sucesso.",
			});
		} else {
			toast({
				title: "Erro na exportação",
				description: "Não foi possível exportar a lista de pacientes.",
				variant: "destructive",
			});
		}
	};

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
					onExport={exportPatients}
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
									className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in"
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
