import {
	Cake,
	Filter,
	Users,
	Plus,
	Download,
	LayoutDashboard,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LazyComponent } from "@/components/common/LazyComponent";
import { IncompleteRegistrationAlert } from "@/components/dashboard/IncompleteRegistrationAlert";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import {
	countActiveFilters,
	PatientAdvancedFilters,
	PatientAnalytics,
	PatientCreateModal,
	PatientsPageHeader,
	type HeaderFilterChip,
} from "@/components/patient";
import { PatientBirthdaysBanner } from "@/components/patient/PatientBirthdaysBanner";
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
		pendingEvaluation: 0, // Placeholder
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
		const addChip = (
			key: string,
			label: string,
			update: Record<string, any>,
		) => {
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

		if (filtersState.search)
			addChip("search", `Busca: ${filtersState.search}`, { q: undefined });
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
				`Origem: ${PATIENT_ORIGIN_LABELS[filtersState.origin] ?? filtersState.origin}`,
				{ origin: "all" },
			);
		if (filtersState.partnerCompany !== "all")
			addChip("partnerCompany", `Parceria: ${filtersState.partnerCompany}`, {
				partnerCompany: "all",
			});
		if (filtersState.hasSurgery)
			addChip("hasSurgery", "Com cirurgia", { hasSurgery: undefined });

		for (const pathology of filtersState.pathologies) {
			addChip(`pathology-${pathology}`, `Patologia: ${pathology}`, {
				pathologies: filtersState.pathologies.filter(
					(value) => value !== pathology,
				),
			});
		}

		for (const profile of filtersState.careProfiles) {
			addChip(
				`careProfile-${profile}`,
				`Perfil: ${PATIENT_CARE_PROFILE_LABELS[profile] ?? profile}`,
				{
					careProfiles: filtersState.careProfiles.filter(
						(value) => value !== profile,
					),
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
		<PageLayout>
			<PageContainer className="pb-20" data-testid="patients-page">
				<PageHeader
					title="Gestão de Pacientes"
					subtitle="Visualize e gerencie a base clínica e operacional"
					icon={Users}
					actions={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={() => exportPatients(patients, {})}
								className="h-11 rounded-xl border-slate-200 dark:border-slate-800 font-black uppercase tracking-wider text-[10px]"
							>
								<Download className="mr-2 h-4 w-4" />
								Exportar
							</Button>
							<Button
								onClick={() => updateSearchParams({ modal: "create" })}
								className="h-11 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px]"
							>
								<Plus className="mr-2 h-4 w-4" />
								Novo Paciente
							</Button>
						</div>
					}
				/>

				<div className="space-y-6 mt-6">
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
						onStatusFilterChange={(value) =>
							updateSearchParams({ status: value })
						}
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
							hasActiveFilters
								? `${totalCount} paciente(s) encontrados`
								: undefined
						}
						onClearAllFilters={handleClearAllFilters}
						hasActiveFilters={hasActiveFilters}
						classificationFilter={filtersState.classification}
						onClassificationFilterChange={handleClassificationToggle}
						activeFilterChips={activeFilterChips}
						isSimplified
					>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className={cn(
										"h-14 w-14 rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
										activeAdvancedFiltersCount > 0 &&
											"border-primary text-primary bg-primary/5",
									)}
								>
									<Filter className="h-5 w-5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-[380px] rounded-[1.75rem] p-4 shadow-2xl"
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
									onFilterChange={(nextFilters) =>
										updateSearchParams(nextFilters)
									}
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

					<Tabs
						value={activeTab}
						onValueChange={(value) => updateSearchParams({ tab: value })}
						className="w-full"
					>
						<div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
							<div className="premium-glass p-1.5 rounded-2xl border-primary/10">
								<TabsList className="h-12 bg-transparent p-0 gap-1">
									<TabsTrigger
										value="list"
										className="rounded-xl px-6 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
									>
										<LayoutDashboard className="mr-2 h-3.5 w-3.5" />
										Cockpit Clínico
									</TabsTrigger>
									<TabsTrigger
										value="birthdays"
										className="rounded-xl px-6 text-[10px] font-black uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
									>
										<Cake className="mr-2 h-3.5 w-3.5" />
										Aniversariantes
									</TabsTrigger>
								</TabsList>
							</div>

							<div className="px-5 py-2.5 rounded-2xl premium-glass border-primary/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
								<span className="text-primary font-black">{totalCount}</span>{" "}
								pacientes encontrados
							</div>
						</div>

						<TabsContent value="list" className="mt-6 space-y-6">
							<PatientBirthdaysBanner />

							{showAnalytics && (
								<div className="bento-card p-4 bg-primary/5 border-primary/10">
									<LazyComponent
										placeholder={
											<div className="h-[240px] w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
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
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
									{Array.from({ length: 6 }).map((_, index) => (
										<div
											key={index}
											className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
										/>
									))}
								</div>
							) : patients.length === 0 ? (
								<div className="py-20 bento-card">
									<EmptyState
										icon={Users}
										title={
											hasActiveFilters
												? "Nenhum paciente encontrado"
												: "Nenhum paciente cadastrado"
										}
										description={
											hasActiveFilters
												? "Ajuste os filtros clínicos para ampliar a busca."
												: "Comece cadastrando seu primeiro paciente."
										}
										action={
											hasActiveFilters
												? {
														label: "Limpar filtros",
														onClick: handleClearAllFilters,
													}
												: {
														label: "Cadastrar paciente",
														onClick: () =>
															updateSearchParams({ modal: "create" }),
													}
										}
									/>
								</div>
							) : (
								<div className="space-y-8">
									<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
										<div className="flex flex-col items-center justify-between gap-4 py-6 border-t border-slate-200 dark:border-slate-800 sm:flex-row">
											<p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
												Página {pagination.currentPage} de{" "}
												{pagination.totalPages}
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
																"rounded-xl border-slate-200 dark:border-slate-800",
																pagination.currentPage <= 1 &&
																	"pointer-events-none opacity-40",
															)}
														/>
													</PaginationItem>
													<PaginationItem>
														<div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-black text-primary">
															{pagination.currentPage}
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
																"rounded-xl border-slate-200 dark:border-slate-800",
																pagination.currentPage >=
																	pagination.totalPages &&
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

						<TabsContent value="birthdays" className="mt-8">
							<div className="bento-card overflow-hidden">
								<AniversariantesContent />
							</div>
						</TabsContent>
					</Tabs>
				</div>

				<PatientCreateModal
					open={isNewPatientModalOpen}
					onOpenChange={(open) =>
						updateSearchParams({ modal: open ? "create" : undefined })
					}
				/>
			</PageContainer>
		</PageLayout>
	);
};

export default Patients;
