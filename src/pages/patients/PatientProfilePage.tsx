/**
 * Patient Profile Page - Migrated to Neon/Cloudflare
 * Optimized with usePatientProfileOptimized for better performance
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PatientHelpers, Patient } from "@/types";
import { APP_ROUTES, patientRoutes } from "@/lib/routing/appRoutes";
import { PatientProfileHeader } from "@/components/patient/PatientProfileHeader";
import { PersonalDataTab } from "@/components/patient/PersonalDataTab";
import { PatientClinicalHistoryTab } from "@/components/patient/PatientClinicalHistoryTab";
import { PatientFinancialTab } from "@/components/patient/PatientFinancialTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PatientTimeline } from "@/components/patient/PatientTimeline";
import {
	Calendar as CalendarIcon,
	Activity,
	Trophy,
	Files,
	Trash,
	Download,
	File as FileIcon,
	Brain,
	Sparkles,
	Gift,
	History,
} from "lucide-react";
import EditPatientModal from "@/components/modals/EditPatientModal";

// Hooks Otimizados
import {
	usePatientProfileOptimized,
	type ProfileTab,
} from "@/hooks/usePatientProfileOptimized";
import { useGamification } from "@/hooks/useGamification";
import { usePatientEvolutionReport } from "@/hooks/usePatientEvolutionReport";
import {
	useUploadDocument,
	useDeleteDocument,
	useDownloadDocument,
	type PatientDocument,
} from "@/hooks/usePatientDocuments";
import { useEvaluationForms } from "@/hooks/useEvaluationForms";
import { usePatientLifecycleSummary } from "@/hooks/usePatientAnalytics";

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// Lazy loading para componentes de abas pesadas
const LazyPatientDashboard360 = lazy(() =>
	import("@/components/patient/dashboard/PatientDashboard360").then((m) => ({
		default: m.PatientDashboard360,
	})),
);
const LazyMedicalReturnCard = lazy(() =>
	import("@/components/evolution/MedicalReturnCard").then((m) => ({
		default: m.MedicalReturnCard,
	})),
);
const LazySurgeriesCard = lazy(() =>
	import("@/components/evolution/SurgeriesCard").then((m) => ({
		default: m.SurgeriesCard,
	})),
);
const LazyMetasCard = lazy(() =>
	import("@/components/evolution/MetasCard").then((m) => ({
		default: m.MetasCard,
	})),
);
const LazyProgressAnalysisCard = lazy(() =>
	import("@/components/patient/ProgressAnalysisCard").then((m) => ({
		default: m.ProgressAnalysisCard,
	})),
);
const LazyPatientEvolutionDashboard = lazy(() =>
	import("@/components/patient/PatientEvolutionDashboard").then((m) => ({
		default: m.PatientEvolutionDashboard,
	})),
);
const LazyPatientAnalyticsDashboard = lazy(() =>
	import("@/components/patient/analytics/PatientAnalyticsDashboard").then(
		(m) => ({ default: m.PatientAnalyticsDashboard }),
	),
);
const LazyAIAssistantPanel = lazy(() =>
	import("@/components/patient/analytics/AIAssistantPanel").then((m) => ({
		default: m.AIAssistantPanel,
	})),
);
const LazyPatientAIChat = lazy(() =>
	import("@/components/ai/PatientAIChat").then((m) => ({
		default: m.PatientAIChat,
	})),
);
const LazyPatientSmartSummary = lazy(() =>
	import("@/components/ai/PatientSmartSummary").then((m) => ({
		default: m.PatientSmartSummary,
	})),
);
const LazyDoctorReferralReportGenerator = lazy(() =>
	import("@/components/reports/DoctorReferralReportGenerator").then((m) => ({
		default: m.DoctorReferralReportGenerator,
	})),
);
const LazyPatientLifecycleChart = lazy(() =>
	import("@/components/patient/analytics/PatientLifecycleChart").then((m) => ({
		default: m.PatientLifecycleChart,
	})),
);
const LazyPatientInsightsPanel = lazy(() =>
	import("@/components/patient/analytics/PatientInsightsPanel").then((m) => ({
		default: m.PatientInsightsPanel,
	})),
);
const LazyGamificationHeader = lazy(
	() => import("@/components/gamification/GamificationHeader"),
);
const LazyStreakCalendar = lazy(
	() => import("@/components/gamification/StreakCalendar"),
);
const LazyLevelJourneyMap = lazy(
	() => import("@/components/gamification/LevelJourneyMap"),
);
const LazyLeaderboard = lazy(() =>
	import("@/components/gamification/Leaderboard").then((m) => ({
		default: m.Leaderboard,
	})),
);
const LazyRewardShop = lazy(() =>
	import("@/components/gamification/RewardShop").then((m) => ({
		default: m.RewardShop,
	})),
);
const LazyPatientActivityLabTab = lazy(() =>
	import("@/components/patient/PatientActivityLabTab").then((m) => ({
		default: m.PatientActivityLabTab,
	})),
);
const LazyDocumentScanner = lazy(() =>
	import("@/components/patient/DocumentScanner").then((m) => ({
		default: m.DocumentScanner,
	})),
);

const OverviewTab = ({
	patient,
	upcomingAppointments,
	invalidateTab,
}: {
	patient: Patient;
	upcomingAppointments: any[];
	invalidateTab: (tab: ProfileTab) => void;
}) => {
	const { data: evolutionData } = usePatientEvolutionReport(patient.id);

	return (
		<div className="space-y-6">
			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyPatientDashboard360
					patient={{
						id: patient.id,
						full_name: patient.full_name || patient.name,
						email: patient.email || undefined,
						phone: patient.phone || undefined,
						birth_date: patient.birth_date || patient.birthDate,
						address: patient.address || undefined,
						city: patient.city || undefined,
						state: patient.state || undefined,
						gender: patient.gender,
						status: patient.status,
					}}
					appointments={upcomingAppointments}
					onAction={() => {}}
				/>
			</Suspense>

			{/* Evolution Management Cards */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazyMedicalReturnCard
						patient={patient}
						patientId={patient.id}
						onPatientUpdated={() => invalidateTab("overview")}
					/>
				</Suspense>
				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazySurgeriesCard patientId={patient.id} />
				</Suspense>
			</div>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyMetasCard patientId={patient.id} />
			</Suspense>

			{/* Evolution charts below */}
			{evolutionData && evolutionData.sessions.length > 0 && (
				<div className="space-y-6">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyProgressAnalysisCard sessions={evolutionData.sessions} />
					</Suspense>
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyPatientEvolutionDashboard
							patientId={patient.id}
							patientName={patient.full_name || patient.name}
							sessions={evolutionData.sessions}
							currentPainLevel={evolutionData.currentPainLevel}
							initialPainLevel={evolutionData.initialPainLevel}
							totalSessions={evolutionData.totalSessions}
							averageImprovement={evolutionData.averageImprovement}
						/>
					</Suspense>
				</div>
			)}
		</div>
	);
};

const DocumentsTab = ({
	patientId,
	documents,
	isLoading,
}: {
	patientId: string;
	documents: PatientDocument[];
	isLoading: boolean;
}) => {
	const uploadDocument = useUploadDocument();
	const deleteDocument = useDeleteDocument();
	const downloadDocument = useDownloadDocument();
	const [uploading, setUploading] = useState(false);
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [selectedCategory, setSelectedCategory] =
		useState<PatientDocument["category"]>("outro");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [description, setDescription] = useState("");

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedFile(file);
			setUploadDialogOpen(true);
		}
	};

	const handleUploadConfirm = async () => {
		if (!selectedFile) return;

		setUploading(true);
		try {
			await uploadDocument.mutateAsync({
				patient_id: patientId,
				file: selectedFile,
				category: selectedCategory,
				description: description || undefined,
			});
			setUploadDialogOpen(false);
			setSelectedFile(null);
			setSelectedCategory("outro");
			setDescription("");
		} finally {
			setUploading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="p-8 text-center">
				<Skeleton className="h-40 w-full mx-auto" />
			</div>
		);
	}

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / (1024 * 1024)).toFixed(1) + " MB";
	};

	const categoryLabels: Record<PatientDocument["category"], string> = {
		laudo: "Laudo",
		exame: "Exame",
		receita: "Receita",
		termo: "Termo",
		outro: "Outro",
	};

	return (
		<div className="space-y-6">
			<Suspense fallback={<Skeleton className="h-20 w-full rounded-xl" />}>
				<LazyDocumentScanner
					onScanComplete={(text) =>
						alert("Texto extraído: " + text.substring(0, 100) + "...")
					}
				/>
			</Suspense>

			<Card className="border-2 border-dashed border-blue-200 bg-blue-50/10 hover:bg-blue-50/30 transition-colors rounded-xl shadow-sm">
				<CardContent className="p-8">
					<div className="flex flex-col items-center justify-center">
						<div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							<Files className="h-8 w-8 text-blue-600" />
						</div>
						<p className="text-slate-600 font-medium mb-1">
							Arraste arquivos aqui ou clique para selecionar
						</p>
						<p className="text-xs text-slate-400 mb-6">
							Suporta PDF, JPG, PNG e outros formatos comuns.
						</p>
						<input
							type="file"
							onChange={handleFileSelect}
							disabled={uploading}
							className="hidden"
							id="file-upload"
						/>
						<Label htmlFor="file-upload">
							<Button
								variant="outline"
								disabled={uploading}
								className="border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
								asChild
							>
								<span>{uploading ? "Enviando..." : "Selecionar Arquivo"}</span>
							</Button>
						</Label>
					</div>
				</CardContent>
			</Card>

			{documents && documents.length > 0 ? (
				<div className="space-y-3">
					{documents.map((doc: PatientDocument) => (
						<Card
							key={doc.id}
							className="bg-white border-blue-100 shadow-sm rounded-xl hover:shadow-md transition-shadow group"
						>
							<CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
								<div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
									<div className="p-3 bg-blue-50 rounded-xl shrink-0 group-hover:bg-blue-100 transition-colors">
										<FileIcon className="h-6 w-6 text-blue-600" />
									</div>
									<div className="min-w-0 flex-1">
										<p
											className="font-bold text-sm text-slate-800 truncate"
											title={doc.file_name}
										>
											{doc.file_name}
										</p>
										<div className="flex flex-wrap items-center gap-2 mt-1">
											<Badge
												variant="secondary"
												className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0 text-[10px]"
											>
												{categoryLabels[doc.category]}
											</Badge>
											<span className="text-[10px] text-slate-400 font-medium">
												{formatFileSize(doc.file_size)} •{" "}
												{new Date(doc.created_at).toLocaleDateString("pt-BR")}
											</span>
										</div>
										{doc.description && (
											<p
												className="text-xs text-slate-500 mt-1 truncate"
												title={doc.description}
											>
												{doc.description}
											</p>
										)}
									</div>
								</div>
								<div className="flex gap-2 w-full sm:w-auto justify-end">
									<Button
										variant="outline"
										size="sm"
										onClick={() => downloadDocument.mutate(doc)}
										className="border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
									>
										<Download className="h-4 w-4 mr-2" />
										Baixar
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => deleteDocument.mutate(doc)}
										className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
									>
										<Trash className="h-4 w-4" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<Card className="bg-slate-50 border-dashed border-slate-200 shadow-none rounded-xl">
					<CardContent className="p-8 text-center flex flex-col items-center">
						<Files className="h-10 w-10 text-slate-300 mb-3" />
						<p className="text-slate-500 font-medium">Nenhum arquivo anexado</p>
					</CardContent>
				</Card>
			)}

			<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Categorizar Documento</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Arquivo selecionado</Label>
							<p className="text-sm text-muted-foreground">
								{selectedFile?.name}
							</p>
						</div>
						<div className="space-y-2">
							<Label>Categoria</Label>
							<Select
								value={selectedCategory}
								onValueChange={(v) =>
									setSelectedCategory(v as PatientDocument["category"])
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="laudo">Laudo</SelectItem>
									<SelectItem value="exame">Exame</SelectItem>
									<SelectItem value="receita">Receita</SelectItem>
									<SelectItem value="termo">Termo</SelectItem>
									<SelectItem value="outro">Outro</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Descrição (opcional)</Label>
							<Input
								id="description"
								placeholder="Adicione uma descrição para o documento..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setUploadDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleUploadConfirm} disabled={uploading}>
							{uploading ? "Enviando..." : "Enviar"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

const AnalyticsTab = ({
	patientId,
	patientName,
	birthDate,
	condition,
}: {
	patientId: string;
	patientName: string;
	birthDate?: string;
	condition: string;
}) => {
	const { data: lifecycleSummary, isLoading: lifecycleLoading } =
		usePatientLifecycleSummary(patientId);
	const { data: records = [] } = useSoapRecordsV2(patientId);

	const summaryHistory = useMemo(
		() =>
			records.map((r) => ({
				date: r.recordDate,
				subjective: r.subjective,
				objective: r.objective,
			})),
		[records],
	);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyPatientSmartSummary
							patientId={patientId}
							patientName={patientName}
							condition={condition}
							history={summaryHistory}
						/>
					</Suspense>
				</div>
				<div className="lg:col-span-1">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyDoctorReferralReportGenerator
							patientId={patientId}
							patientName={patientName}
							birthDate={birthDate}
							condition={condition}
						/>
					</Suspense>
				</div>
			</div>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyPatientAnalyticsDashboard
					patientId={patientId}
					patientName={patientName}
				/>
			</Suspense>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyAIAssistantPanel patientId={patientId} patientName={patientName} />
			</Suspense>

			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyPatientAIChat patientId={patientId} patientName={patientName} />
			</Suspense>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazyPatientLifecycleChart
						summary={lifecycleSummary || null}
						isLoading={lifecycleLoading}
					/>
				</Suspense>

				<Suspense fallback={<LoadingSkeleton type="card" />}>
					<LazyPatientInsightsPanel
						patientId={patientId}
						limit={5}
						showHeader={true}
					/>
				</Suspense>
			</div>
		</div>
	);
};

const GamificationTab = ({ patientId }: { patientId: string }) => {
	const { profile, xpPerLevel, currentXp, streak } = useGamification(patientId);

	if (!profile) {
		return (
			<div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
				<Trophy className="h-10 w-10 text-muted-foreground mb-2" />
				<p className="text-muted-foreground">
					Gamificação não iniciada para este paciente
				</p>
				<Button variant="outline" size="sm" className="mt-4">
					Iniciar Gamificação
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<Suspense fallback={<Skeleton className="h-32 w-full" />}>
				<LazyGamificationHeader
					level={profile.level}
					currentXp={currentXp}
					xpPerLevel={xpPerLevel}
					streak={streak}
				/>
			</Suspense>

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
				<div className="xl:col-span-2 space-y-8">
					<div>
						<h3 className="text-xl font-bold mb-4 flex items-center gap-2">
							<Gift className="w-5 h-5 text-primary" />
							Loja de Vantagens
						</h3>
						<Suspense fallback={<LoadingSkeleton type="card" />}>
							<LazyRewardShop />
						</Suspense>
					</div>

					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<LazyLevelJourneyMap currentLevel={profile.level} />
					</Suspense>
				</div>

				<div className="space-y-8">
					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyLeaderboard />
					</Suspense>

					<Suspense fallback={<LoadingSkeleton type="card" />}>
						<LazyStreakCalendar
							todayActivity={false}
							activeDates={
								profile.last_activity_date ? [profile.last_activity_date] : []
							}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
};

export const PatientProfilePage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	// Valid tab values
	const validTabs = [
		"overview",
		"analytics",
		"personal",
		"clinical",
		"financial",
		"gamification",
		"documents",
	] as const;
	type TabValue = (typeof validTabs)[number];

	const [activeTab, setActiveTab] = useState<TabValue>(() => {
		const tabFromUrl = searchParams.get("tab");
		return tabFromUrl && validTabs.includes(tabFromUrl as TabValue)
			? (tabFromUrl as TabValue)
			: "overview";
	});

	// OTIMIZAÇÃO: Hook centralizado para carregar dados do perfil com cache inteligente e prefetch
	const {
		patient,
		appointments,
		documents,
		isLoading,
		isLoadingDocuments,
		invalidateTab,
	} = usePatientProfileOptimized({
		patientId: id || "",
		activeTab:
			activeTab === "personal" || activeTab === "clinical"
				? "overview"
				: (activeTab as any),
	});

	const [editingPatient, setEditingPatient] = useState<boolean>(false);
	const [evaluationModalOpen, setEvaluationModalOpen] =
		useState<boolean>(false);

	const { data: evaluationForms = [] } = useEvaluationForms();

	useEffect(() => {
		if (patient && (patient as any).incomplete_registration) {
			setEditingPatient(true);
		}
	}, [patient]);

	const handleStartEvaluation = () => {
		setEvaluationModalOpen(true);
	};

	const handleSelectTemplate = (templateId: string) => {
		setEvaluationModalOpen(false);
		if (!id) return;
		navigate(`${patientRoutes.profile(id)}/evaluations/new/${templateId}`);
	};

	if (isLoading) {
		return (
			<MainLayout>
				<LoadingSkeleton type="card" rows={4} />
			</MainLayout>
		);
	}

	if (!patient) {
		return (
			<MainLayout>
				<div className="flex flex-col items-center justify-center h-[50vh] gap-4">
					<h2 className="text-2xl font-bold">Paciente não encontrado</h2>
					<Button onClick={() => navigate(APP_ROUTES.PATIENTS)}>
						Voltar para lista
					</Button>
				</div>
			</MainLayout>
		);
	}

	const patientName = PatientHelpers.getName(patient as any);
	const initials = patientName
		.split(" ")
		.map((n: string) => n[0])
		.join("")
		.substring(0, 2)
		.toUpperCase();

	return (
		<MainLayout>
			<div className="space-y-6 pb-20 fade-in relative">
				<PatientProfileHeader
					patient={patient}
					patientName={patientName}
					initials={initials}
					onBack={() => navigate(APP_ROUTES.PATIENTS)}
					onOpenReport={() => navigate(`/patient-evolution-report/${id}`)}
					onEdit={() => setEditingPatient(true)}
					onEvaluate={handleStartEvaluation}
					onSchedule={() => navigate(APP_ROUTES.AGENDA)}
				/>

				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as TabValue)}
					className="w-full"
				>
					<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-1 pt-2 -mx-4 px-4 border-b border-blue-50">
						<TabsList className="w-full justify-start h-auto p-0 bg-transparent overflow-x-auto flex-nowrap scrollbar-hide gap-6">
							<TabsTrigger
								value="overview"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Visão Geral
							</TabsTrigger>
							<TabsTrigger
								value="timeline"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
							>
								<History className="h-4 w-4" />
								Linha do Tempo
							</TabsTrigger>
							<TabsTrigger
								value="analytics"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold gap-2 transition-all"
							>
								<Brain className="h-4 w-4" />
								Analytics & IA
							</TabsTrigger>
							<TabsTrigger
								value="personal"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Dados Pessoais
							</TabsTrigger>
							<TabsTrigger
								value="clinical"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Histórico Clínico
							</TabsTrigger>
							<TabsTrigger
								value="activity-lab"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all gap-2"
							>
								<Activity className="h-4 w-4" />
								Biomecânica
							</TabsTrigger>
							<TabsTrigger
								value="financial"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Financeiro
							</TabsTrigger>
							<TabsTrigger
								value="gamification"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Gamificação
							</TabsTrigger>
							<TabsTrigger
								value="documents"
								className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent border-b-2 border-transparent px-0 py-2 text-sm font-semibold transition-all"
							>
								Arquivos
							</TabsTrigger>
						</TabsList>
					</div>

					<div className="mt-6 min-h-[500px]">
						<TabsContent
							value="overview"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<OverviewTab
								patient={patient as any}
								upcomingAppointments={appointments}
								invalidateTab={invalidateTab}
							/>
						</TabsContent>

						<TabsContent
							value="timeline"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<div className="bg-white rounded-3xl p-8 border border-blue-100 shadow-premium-sm">
								<h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2">
									<History className="h-5 w-5 text-blue-600" />
									Linha do Tempo de Atividades
								</h3>
								<PatientTimeline patientId={id} />
							</div>
						</TabsContent>

						<TabsContent
							value="analytics"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<AnalyticsTab
								patientId={id || ""}
								patientName={patientName}
								birthDate={(patient as any).birth_date}
								condition={(patient as any).main_condition || "Não informada"}
							/>
						</TabsContent>

						<TabsContent
							value="personal"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<PersonalDataTab patient={patient as any} />
						</TabsContent>

						<TabsContent
							value="clinical"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<PatientClinicalHistoryTab patientId={id || ""} />
						</TabsContent>

						<TabsContent
							value="activity-lab"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<Suspense fallback={<LoadingSkeleton />}>
								<LazyPatientActivityLabTab patientId={id || ""} />
							</Suspense>
						</TabsContent>

						<TabsContent
							value="financial"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<PatientFinancialTab appointments={appointments} />
						</TabsContent>

						<TabsContent
							value="gamification"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<GamificationTab patientId={id || ""} />
						</TabsContent>

						<TabsContent
							value="documents"
							className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2"
						>
							<DocumentsTab
								patientId={id || ""}
								documents={documents as any}
								isLoading={isLoadingDocuments}
							/>
						</TabsContent>
					</div>
				</Tabs>

				<EditPatientModal
					open={editingPatient}
					onOpenChange={setEditingPatient}
					patientId={id}
					patient={patient as any}
				/>

				<Dialog
					open={evaluationModalOpen}
					onOpenChange={setEvaluationModalOpen}
				>
					<DialogContent className="sm:max-w-[600px]">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<div className="p-2 bg-primary/10 rounded-lg">
									<ClipboardList className="h-5 w-5 text-primary" />
								</div>
								Iniciar Nova Avaliação
							</DialogTitle>
							<DialogDescription>
								Selecione um template de avaliação para {patientName}
							</DialogDescription>
						</DialogHeader>

						<ScrollArea className="max-h-[60vh] pr-4">
							<div className="space-y-4 pt-4">
								{evaluationForms.length === 0 ? (
									<div className="text-center py-8">
										<ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
										<p className="text-muted-foreground">
											Nenhum template de avaliação disponível
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											Vá em "Cadastros → Fichas de Avaliação" para criar
											templates
										</p>
									</div>
								) : (
									<div className="space-y-2">
										{evaluationForms.filter((f) => f.is_favorite).slice(0, 3)
											.length > 0 && (
											<div className="space-y-2">
												<p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
													<Sparkles className="h-3 w-3" />
													Favoritos
												</p>
												{evaluationForms
													.filter((f) => f.is_favorite)
													.slice(0, 3)
													.map((form) => (
														<button
															key={form.id}
															onClick={() => handleSelectTemplate(form.id)}
															className="w-full text-left p-3 rounded-lg border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group"
														>
															<div className="flex items-center justify-between">
																<div className="flex-1">
																	<p className="font-medium text-sm">
																		{form.nome}
																	</p>
																	{form.descricao && (
																		<p className="text-xs text-muted-foreground truncate">
																			{form.descricao}
																		</p>
																	)}
																</div>
																<div className="flex items-center gap-2 text-xs text-muted-foreground">
																	<Badge
																		variant="secondary"
																		className="text-xs"
																	>
																		{form.evaluation_form_fields?.length || 0}{" "}
																		campos
																	</Badge>
																</div>
															</div>
														</button>
													))}
											</div>
										)}

										<details className="group">
											<summary className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground list-none p-0 bg-transparent border-none w-full">
												<span>Ver todos os templates</span>
												<span className="ml-auto group-open:rotate-90 transition-transform">
													›
												</span>
											</summary>
											<div className="mt-2 space-y-2 pl-4">
												{evaluationForms.map((form) => (
													<button
														key={form.id}
														onClick={() => handleSelectTemplate(form.id)}
														className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-between group"
													>
														<div className="flex-1 min-w-0">
															<p className="font-medium text-sm truncate">
																{form.nome}
															</p>
															<div className="flex items-center gap-2 mt-1">
																<Badge variant="outline" className="text-xs">
																	{form.tipo}
																</Badge>
																<span className="text-xs text-muted-foreground">
																	{form.evaluation_form_fields?.length || 0}{" "}
																	campos
																</span>
															</div>
														</div>
														<div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
															Selecionar →
														</div>
													</button>
												))}
											</div>
										</details>
									</div>
								)}
							</div>
						</ScrollArea>

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setEvaluationModalOpen(false)}
							>
								Cancelar
							</Button>
							<Button onClick={() => setEvaluationModalOpen(false)}>
								Criar Template Novo
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</MainLayout>
	);
};

export default PatientProfilePage;
