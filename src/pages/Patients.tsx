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
	PatientsPageHeader,
	type HeaderFilterChip,
} from "@/components/patient";
import { PatientListItem } from "@/components/patient/PatientListItem";
import { EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
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
import {
	PATIENT_CARE_PROFILE_LABELS,
	PATIENT_CLASSIFICATION_LABELS,
	PATIENT_FINANCIAL_STATUS_LABELS,
	PATIENT_ORIGIN_LABELS,
	PATIENT_PATHOLOGY_STATUS_LABELS,
	PATIENT_PAYER_MODEL_LABELS,
	PATIENT_THERAPY_FOCUS_LABELS,
} from "@/lib/constants/patient-directory";
import { patientRoutes } from "@/lib/routing/appRoutes";
import { cn } from "@/lib/utils";
import { AniversariantesContent } from "./relatorios/AniversariantesPage";
import { usePatientsExport } from "./patients/usePatientsExport";
import { usePatientsUrlState } from "./patients/usePatientsUrlState";

const Patients = () => {
	const navigate = useNavigate();
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

	const { data, isLoading } = usePatientsPageData(filters);
	const { patients, totalCount, summary, facets } = data;
	const { exportPatients } = usePatientsExport();

	const pagination = useMemo(
		() => ({
			currentPage: pageParam,
			totalPages: Math.max(1, Math.ceil(totalCount / 20)),
			pageSize: 20,
		}),
		[pageParam, totalCount],
	);

	const activeAdvancedFiltersCount = countActiveFilters({
		hasSurgery: filtersState.hasSurgery,
		pathologyStatus: filtersState.pathologyStatus,
		pathologies: filtersState.pathologies,
		careProfiles: filtersState.careProfiles,
		sports: filtersState.sports,
		therapyFocuses: filtersState.therapyFocuses,
		paymentModel: filtersState.paymentModel,
		financialStatus: filtersState.financialStatus,
		origin: filtersState.origin,
		partnerCompany: filtersState.partnerCompany,
	});

	const headerStats = {
		totalCount,
		currentPage: pagination.currentPage,
		totalPages: pagination.totalPages,
		activeCount: summary.active,
		newCount: summary.newPatients,
		atRiskCount: summary.atRisk,
		completedCount: summary.completed,
		inactive7: summary.inactive7,
		inactive30: summary.inactive30,
		inactive60: summary.inactive60,
		noShowRisk: summary.noShowRisk,
		hasUnpaid: summary.hasUnpaid,
	};

	const hasActiveFilters =
		filtersState.status !== "all" ||
		filtersState.condition !== "all" ||
		filtersState.classification !== "all" ||
		filtersState.pathologyStatus !== "all" ||
		filtersState.paymentModel !== "all" ||
		filtersState.financialStatus !== "all" ||
		filtersState.origin !== "all" ||
		filtersState.partnerCompany !== "all" ||
		Boolean(filtersState.search) ||
		Boolean(filtersState.hasSurgery) ||
		filtersState.pathologies.length > 0 ||
		filtersState.careProfiles.length > 0 ||
		filtersState.sports.length > 0 ||
		filtersState.therapyFocuses.length > 0;

	const handleClassificationToggle = (value: string) => {
		updateSearchParams({
			classification: filtersState.classification === value ? "all" : value,
		});
	};

	const activeFilterChips = useMemo<HeaderFilterChip[]>(() => {
		const chips: HeaderFilterChip[] = [];
		const addChip = (key: string, label: string, update: Record<string, any>) => {
			chips.push({
				key,
				label,
				onRemove: () => updateSearchParams(update),
			});
		};

		if (filtersState.classification !== "all") {
			addChip(
				"classification",
				PATIENT_CLASSIFICATION_LABELS[
					filtersState.classification as keyof typeof PATIENT_CLASSIFICATION_LABELS
				] ?? filtersState.classification,
				{ classification: "all" },
			);
		}

		if (filtersState.search) addChip("search", `Busca: ${filtersState.search}`, { q: undefined });
		if (filtersState.status !== "all")
			addChip("status", `Status: ${filtersState.status}`, { status: "all" });
		if (filtersState.condition !== "all")
			addChip("condition", `Patologia: ${filtersState.condition}`, {
				condition: "all",
			});
		if (filtersState.pathologyStatus !== "all")
			addChip(
				"pathologyStatus",
				`Status clínico: ${
					PATIENT_PATHOLOGY_STATUS_LABELS[
						filtersState.pathologyStatus as keyof typeof PATIENT_PATHOLOGY_STATUS_LABELS
					] ?? filtersState.pathologyStatus
				}`,
				{ pathologyStatus: "all" },
			);
		if (filtersState.paymentModel !== "all")
			addChip(
				"paymentModel",
				`Pagamento: ${
					PATIENT_PAYER_MODEL_LABELS[filtersState.paymentModel] ??
					filtersState.paymentModel
				}`,
				{ paymentModel: "all" },
			);
		if (filtersState.financialStatus !== "all")
			addChip(
				"financialStatus",
				`Financeiro: ${
					PATIENT_FINANCIAL_STATUS_LABELS[filtersState.financialStatus] ??
					filtersState.financialStatus
				}`,
				{ financialStatus: "all" },
			);
		if (filtersState.origin !== "all")
			addChip(
				"origin",
				`Origem: ${
					PATIENT_ORIGIN_LABELS[filtersState.origin] ?? filtersState.origin
				}`,
				{ origin: "all" },
			);
		if (filtersState.partnerCompany !== "all")
			addChip(
				"partnerCompany",
				`Parceria: ${filtersState.partnerCompany}`,
				{ partnerCompany: "all" },
			);
		if (filtersState.hasSurgery)
			addChip("hasSurgery", "Com cirurgia", { hasSurgery: undefined });

		for (const pathology of filtersState.pathologies) {
			addChip(`pathology-${pathology}`, `Patologia: ${pathology}`, {
				pathologies: filtersState.pathologies.filter((value) => value !== pathology),
			});
		}

		for (const profile of filtersState.careProfiles) {
			addChip(
				`careProfile-${profile}`,
				`Perfil: ${PATIENT_CARE_PROFILE_LABELS[profile] ?? profile}`,
				{
					careProfiles: filtersState.careProfiles.filter((value) => value !== profile),
				},
			);
		}

		for (const sport of filtersState.sports) {
			addChip(`sport-${sport}`, `Esporte: ${sport}`, {
				sports: filtersState.sports.filter((value) => value !== sport),
			});
		}

		for (const focus of filtersState.therapyFocuses) {
			addChip(
				`focus-${focus}`,
				`Foco: ${PATIENT_THERAPY_FOCUS_LABELS[focus] ?? focus}`,
				{
					therapyFocuses: filtersState.therapyFocuses.filter(
						(value) => value !== focus,
					),
				},
			);
		}

		return chips;
	}, [filtersState, updateSearchParams]);

	return (
		<MainLayout>
			<div
				className="mx-auto max-w-7xl space-y-8 pb-20 md:pb-8"
				data-testid="patients-page"
			>
				<PatientsPageHeader
					stats={headerStats}
					onNewPatient={() => updateSearchParams({ modal: "create" })}
					onExport={() => exportPatients(patients, {})}
					onToggleAnalytics={() =>
						updateSearchParams({
							analytics: showAnalytics ? undefined : "true",
						})
					}
					showAnalytics={showAnalytics}
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					statusFilter={filtersState.status}
					onStatusFilterChange={(value) => updateSearchParams({ status: value })}
					pathologyFilter={filtersState.condition}
					onPathologyFilterChange={(value) =>
						updateSearchParams({ condition: value })
					}
					pathologyOptions={facets.pathologies}
					pathologyStatusFilter={filtersState.pathologyStatus}
					onPathologyStatusFilterChange={(value) =>
						updateSearchParams({ pathologyStatus: value })
					}
					paymentModelFilter={filtersState.paymentModel}
					onPaymentModelFilterChange={(value) =>
						updateSearchParams({ paymentModel: value })
					}
					financialStatusFilter={filtersState.financialStatus}
					onFinancialStatusFilterChange={(value) =>
						updateSearchParams({ financialStatus: value })
					}
					sortBy={filtersState.sortBy}
					onSortByChange={(value) => updateSearchParams({ sortBy: value })}
					activeAdvancedFiltersCount={activeAdvancedFiltersCount}
					totalFilteredLabel={
						hasActiveFilters ? `${totalCount} paciente(s) encontrados` : undefined
					}
					onClearAllFilters={handleClearAllFilters}
					hasActiveFilters={hasActiveFilters}
					classificationFilter={filtersState.classification}
					onClassificationFilterChange={handleClassificationToggle}
					activeFilterChips={activeFilterChips}
				>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className={cn(
									"h-14 w-14 rounded-[1.2rem] border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/60",
									activeAdvancedFiltersCount > 0 &&
										"border-primary/30 bg-primary/5 text-primary",
								)}
								title="Filtros avançados"
							>
								<div className="relative">
									<Filter className="h-5 w-5" />
									{activeAdvancedFiltersCount > 0 && (
										<span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
											{activeAdvancedFiltersCount}
										</span>
									)}
								</div>
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[380px] rounded-[1.75rem] p-4"
							align="end"
						>
							<PatientAdvancedFilters
								currentFilters={{
									hasSurgery: filtersState.hasSurgery,
									pathologyStatus: filtersState.pathologyStatus,
									pathologies: filtersState.pathologies,
									careProfiles: filtersState.careProfiles,
									sports: filtersState.sports,
									therapyFocuses: filtersState.therapyFocuses,
									paymentModel: filtersState.paymentModel,
									financialStatus: filtersState.financialStatus,
									origin: filtersState.origin,
									partnerCompany: filtersState.partnerCompany,
								}}
								onFilterChange={(nextFilters) => updateSearchParams(nextFilters)}
								activeFiltersCount={activeAdvancedFiltersCount}
								onClearFilters={() =>
									updateSearchParams({
										hasSurgery: undefined,
										pathologyStatus: "all",
										pathologies: [],
										careProfiles: [],
										sports: [],
										therapyFocuses: [],
										paymentModel: "all",
										financialStatus: "all",
										origin: "all",
										partnerCompany: "all",
									})
								}
								facets={facets}
							/>
						</PopoverContent>
					</Popover>
				</PatientsPageHeader>

				<div className="space-y-8">
					<Tabs
						value={activeTab}
						onValueChange={(value) => updateSearchParams({ tab: value })}
						className="w-full"
					>
						<div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
							<div className="rounded-[1.75rem] border border-white/50 bg-white/70 p-1.5 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/40">
								<TabsList className="h-14 gap-1 bg-transparent p-0">
									<TabsTrigger
										value="list"
										className="rounded-[1.25rem] px-8 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
									>
										Cockpit Clínico
									</TabsTrigger>
									<TabsTrigger
										value="birthdays"
										className="rounded-[1.25rem] px-8 text-[11px] font-black uppercase tracking-[0.18em] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
									>
										<Cake className="mr-2 h-4 w-4 text-pink-500" />
										Aniversariantes
									</TabsTrigger>
								</TabsList>
							</div>

							<div className="rounded-[1.35rem] border border-white/50 bg-white/70 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
								<span className="text-primary">{totalCount}</span> pacientes nesta visão
							</div>
						</div>

						<TabsContent value="list" className="mt-0 space-y-8">
							{showAnalytics && (
								<div className="rounded-[2rem] border border-white/40 bg-white/60 p-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35">
									<LazyComponent
										placeholder={
											<div className="h-[240px] w-full animate-pulse rounded-[1.5rem] bg-muted/20" />
										}
									>
										<PatientAnalytics
											totalPatients={totalCount}
											classificationStats={{
												active: summary.active,
												inactive7: summary.inactive7,
												inactive30: summary.inactive30,
												inactive60: summary.inactive60,
												noShowRisk: summary.noShowRisk,
												hasUnpaid: summary.hasUnpaid,
												newPatients: summary.newPatients,
												completed: summary.completed,
											}}
										/>
									</LazyComponent>
								</div>
							)}

							<IncompleteRegistrationAlert />

							{isLoading && patients.length === 0 ? (
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
									{Array.from({ length: 6 }).map((_, index) => (
										<div
											key={index}
											className="h-[260px] animate-pulse rounded-[2rem] border border-border/20 bg-muted/20"
										/>
									))}
								</div>
							) : patients.length === 0 ? (
								<div className="py-20">
									<EmptyState
										icon={Users}
										title={
											hasActiveFilters
												? "Nenhum paciente encontrado"
												: "Nenhum paciente cadastrado"
										}
										description={
											hasActiveFilters
												? "Ajuste os filtros clínicos, operacionais ou financeiros para ampliar a busca."
												: "Sua base ainda está vazia. Cadastre o primeiro paciente para começar."
										}
										action={
											hasActiveFilters
												? {
														label: "Limpar filtros",
														onClick: handleClearAllFilters,
													}
												: {
														label: "Cadastrar paciente",
														onClick: () => updateSearchParams({ modal: "create" }),
													}
										}
									/>
								</div>
							) : (
								<div className="space-y-8">
									<div
										className="grid grid-cols-1 gap-6 xl:grid-cols-2"
										data-testid="patient-list"
									>
										{patients.map((patient) => (
											<PatientListItem
												key={patient.id}
												patient={patient}
												onClick={() => {
													const UUID_REGEX =
														/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
													if (patient.id && UUID_REGEX.test(patient.id)) {
														navigate(patientRoutes.profile(patient.id));
													}
												}}
											/>
										))}
									</div>

									{pagination.totalPages > 1 && (
										<div className="flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-6 sm:flex-row">
											<p className="text-[11px] font-semibold text-muted-foreground">
												Exibindo {Math.min(pagination.currentPage * pagination.pageSize, totalCount)} de {totalCount} pacientes
											</p>
											<Pagination className="mx-0 w-auto">
												<PaginationContent className="gap-2">
													<PaginationItem>
														<PaginationPrevious
															onClick={() =>
																updateSearchParams({
																	page: String(pagination.currentPage - 1),
																})
															}
															className={cn(
																"rounded-xl",
																pagination.currentPage <= 1 &&
																	"pointer-events-none opacity-40",
															)}
														/>
													</PaginationItem>
													<PaginationItem>
														<div className="rounded-xl border border-border/30 px-4 py-2 text-sm font-bold">
															{pagination.currentPage} / {pagination.totalPages}
														</div>
													</PaginationItem>
													<PaginationItem>
														<PaginationNext
															onClick={() =>
																updateSearchParams({
																	page: String(pagination.currentPage + 1),
																})
															}
															className={cn(
																"rounded-xl",
																pagination.currentPage >= pagination.totalPages &&
																	"pointer-events-none opacity-40",
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

						<TabsContent value="birthdays" className="mt-0">
							<div className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/60 p-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35">
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
