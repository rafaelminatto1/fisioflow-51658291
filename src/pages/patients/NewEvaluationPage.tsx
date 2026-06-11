import {
	Suspense,
	lazy,
	useState,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeft,
	BookmarkPlus,
	LayoutDashboard,
	FileText,
	Activity,
	Map,
	Plus,
	Save,
	Camera,
	Printer,
	Mic,
} from "lucide-react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { PatientDashboard360 } from "@/components/patient/dashboard/PatientDashboard360";
import { PhysicalExamForm } from "@/components/patient/forms/PhysicalExamForm";
import { PainMapManager } from "@/components/evolution/PainMapManager";
import {
	EvaluationTemplateSelector,
	DynamicFieldRenderer,
	AddCustomFieldDialog,
	SaveAsTemplateDialog,
	EvaluationActionBridge,
	EvaluationHistorySidebar,
} from "@/components/evaluation";
import { useActionBridge } from "@/hooks/useActionBridge";
import { useRedFlagsDetector } from "@/hooks/useRedFlagsDetector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Loader2 } from "lucide-react";
import { NewPrescriptionModal } from "@/components/prescriptions/NewPrescriptionModal";
import { AssessmentVoiceRecorder } from "@/components/ai/AssessmentVoiceRecorder";

import type {
	EvaluationTemplate,
	TemplateField,
} from "@/components/evaluation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PatientHelpers } from "@/types";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { patientRoutes } from "@/lib/routing/appRoutes";
import { normalizeGoalRows } from "@/lib/clinical/goalNormalization";
import {
	appointmentsApi,
	evaluationFormsApi,
	goalsApi,
	patientsApi,
} from "@/api/v2";

import { useIncrementTemplateUsage } from "@/hooks/useTemplateStats";
import {
	usePatientEvaluationResponse,
	useUpdatePatientEvaluationResponse,
} from "@/hooks/useEvaluationForms";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { RichTextToolbar } from "@/components/ui/RichTextToolbar";
import { RichTextProvider } from "@/contexts/RichTextContext";
import { Badge } from "@/components/ui/badge";

const KinoveaStudio = lazy(() =>
	import("@/components/analysis/KinoveaStudio").then((module) => ({
		default: module.KinoveaStudio,
	})),
);

// Helper function to generate UUID
const uuidv4 = (): string => crypto.randomUUID();

function normalizeOptionList(value: unknown): string[] | null {
	if (Array.isArray(value)) {
		return value.map(String).filter(Boolean);
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (Array.isArray(parsed)) {
				return parsed.map(String).filter(Boolean);
			}
		} catch {
			// Some older rows stored options as plain text, one option per line.
		}

		return trimmed
			.split(/\r?\n/)
			.map((option) => option.trim())
			.filter(Boolean);
	}

	if (value && typeof value === "object") {
		return Object.values(value).map(String).filter(Boolean);
	}

	return null;
}

function normalizeEvaluationFields(value: unknown): TemplateField[] {
	const rawFields = Array.isArray(value)
		? value
		: value && typeof value === "object"
			? Object.values(value)
			: [];

	return rawFields
		.filter(
			(field): field is Record<string, unknown> =>
				!!field && typeof field === "object",
		)
		.map(mapEvaluationField)
		.sort((a, b) => a.ordem - b.ordem);
}

function normalizeEvaluationResponses(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function mapEvaluationField(
	field: Record<string, unknown>,
	index = 0,
): TemplateField {
	return {
		...(field as TemplateField),
		id: String(field.id ?? `field-${index}`),
		label: String(field.label ?? ""),
		tipo_campo: String(field.tipo_campo ?? "texto_curto"),
		placeholder:
			typeof field.placeholder === "string" ? field.placeholder : null,
		opcoes: normalizeOptionList(field.opcoes),
		ordem: Number(field.ordem ?? 0),
		obrigatorio: Boolean(field.obrigatorio),
		section:
			typeof field.grupo === "string"
				? field.grupo
				: typeof field.section === "string"
					? field.section
					: undefined,
		description:
			typeof field.descricao === "string"
				? field.descricao
				: typeof field.description === "string"
					? field.description
					: null,
		min:
			field.minimo != null
				? Number(field.minimo)
				: field.min != null
					? Number(field.min)
					: undefined,
		max:
			field.maximo != null
				? Number(field.maximo)
				: field.max != null
					? Number(field.max)
					: undefined,
	};
}

import { useAIScribeMapping } from "@/hooks/useAIScribeMapping";

export default function NewEvaluationPage() {
	const { patientId, templateId } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const appointmentId = searchParams.get("appointmentId");
	const evaluationId = searchParams.get("evaluationId");
	const isViewMode = searchParams.get("mode") === "view";
	const { toast } = useToast();
	const incrementTemplateUsage = useIncrementTemplateUsage();
	const updateEvaluationResponse = useUpdatePatientEvaluationResponse();
	const {
		data: evaluationResponse,
		isLoading: isEvaluationLoading,
		isError: isEvaluationError,
	} = usePatientEvaluationResponse(evaluationId || undefined);
	const hasHydratedEvaluation = useRef(false);
	const hasMarkedStarted = useRef(false);

	const [activeTab, setActiveTab] = useState(() =>
		templateId || evaluationId || appointmentId ? "anamnesis" : "dashboard",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [_isTemplateLoading, setIsTemplateLoading] = useState(!!templateId);

	// Template-based Anamnesis State
	const [selectedTemplate, setSelectedTemplate] =
		useState<EvaluationTemplate | null>(null);
	const [customFields, setCustomFields] = useState<TemplateField[]>([]);
	const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
	const [richTextAnamnesis, setRichTextAnamnesis] = useState("");
	const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
	const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

	// Prescription State
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
	const [preselectedProtocolId, setPreselectedProtocolId] = useState<
		string | undefined
	>(undefined);
	const [preselectedExerciseId, setPreselectedExerciseId] = useState<
		string | undefined
	>(undefined);

	// Physical Exam State
	const [physicalExamData, setPhysicalExamData] = useState<any>({});

	// History Data for Comparison & Trends
	const { data: allEvaluations = [] } =
		usePatientEvaluationResponses(patientId);
	const lastCompletedEvaluation = useMemo(() => {
		if (!selectedTemplate || !allEvaluations.length) return null;
		return allEvaluations
			.filter(
				(ev) =>
					ev.id !== evaluationId &&
					ev.status === "completed" &&
					ev.form_id === selectedTemplate.id,
			)
			.sort(
				(a, b) =>
					new Date(b.completed_at || 0).getTime() -
					new Date(a.completed_at || 0).getTime(),
			)[0];
	}, [selectedTemplate, allEvaluations, evaluationId]);

	const previousValues = useMemo(() => {
		return normalizeEvaluationResponses(lastCompletedEvaluation?.responses);
	}, [lastCompletedEvaluation]);

	const historicalFieldData = useMemo(() => {
		if (!selectedTemplate || !allEvaluations.length) return {};

		const history: Record<string, Array<{ date: string; value: number }>> = {};

		// Get all completed evaluations for this template, chronologically
		const evalsForThisForm = allEvaluations
			.filter(
				(ev) =>
					ev.id !== evaluationId &&
					ev.status === "completed" &&
					ev.form_id === selectedTemplate.id,
			)
			.sort(
				(a, b) =>
					new Date(a.completed_at || 0).getTime() -
					new Date(b.completed_at || 0).getTime(),
			);

		evalsForThisForm.forEach((ev) => {
			const responses = normalizeEvaluationResponses(ev.responses);
			const dateStr = ev.completed_at || ev.created_at;
			if (!dateStr) return;

			Object.entries(responses).forEach(([fieldId, rawVal]) => {
				// Only track numerical values for trends
				const numVal = Number(rawVal);
				if (!isNaN(numVal) && rawVal !== null && rawVal !== "") {
					if (!history[fieldId]) history[fieldId] = [];
					history[fieldId].push({ date: dateStr, value: numVal });
				}
			});
		});

		return history;
	}, [selectedTemplate, allEvaluations, evaluationId]);

	// Combined fields
	const allFields = [...(selectedTemplate?.fields || []), ...customFields];

	// Action Bridge Intelligence
	const suggestions = useActionBridge(allFields, fieldValues);

	// AI Scribe Mapping
	const { mapTranscriptToFields, isMapping } = useAIScribeMapping({
		onSuccess: (mappedData) => {
			if (Object.keys(mappedData).length > 0) {
				setFieldValues((prev) => ({ ...prev, ...mappedData }));
				toast({
					title: "Scribe IA Concluído",
					description: `${Object.keys(mappedData).length} campos preenchidos automaticamente.`,
				});
			}
		},
		onError: () => {
			toast({
				title: "Erro no Scribe IA",
				description:
					"Não foi possível extrair campos do áudio. O texto foi salvo no quadro branco.",
				variant: "destructive",
			});
		},
	});

	const handleVoiceCompleted = async (text: string) => {
		// Sempre salva o texto bruto no quadro branco como backup
		setRichTextAnamnesis((prev) =>
			prev ? `${prev}\n\n[Transcrição IA]: ${text}` : text,
		);

		// Se temos campos estruturados, tenta o mapeamento inteligente
		if (allFields.length > 0) {
			toast({
				title: "Processando Scribe IA...",
				description: "Extraindo dados clínicos do áudio para o formulário.",
			});
			await mapTranscriptToFields(text, allFields);
		}

		setActiveTab("anamnesis");
	};

	// Red Flags Detection
	const { hasRedFlags, detectedFlags } = useRedFlagsDetector(
		richTextAnamnesis,
		fieldValues,
	);

	// Fetch Patient Data
	const {
		data: patient,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["patient-full", patientId],
		queryFn: async () => {
			if (!patientId) return null;

			const [
				patientRes,
				goalsRes,
				pathologiesRes,
				surgeriesRes,
				appointmentsRes,
			] = await Promise.all([
				patientsApi.get(patientId),
				goalsApi.list(patientId),
				patientsApi.pathologies(patientId),
				patientsApi.surgeries(patientId),
				appointmentsApi.list({ patientId, limit: 20 }),
			]);

			if (!patientRes?.data) throw new Error("Paciente não encontrado");

			return {
				...patientRes.data,
				goals: normalizeGoalRows(goalsRes?.data),
				pathologies: pathologiesRes?.data ?? [],
				surgeries: surgeriesRes?.data ?? [],
				appointments: appointmentsRes?.data ?? [],
			};
		},
		enabled: !!patientId,
		retry: 1,
	});

	// Handle template selection
	const handleTemplateSelect = useCallback(
		(template: EvaluationTemplate | null) => {
			if (evaluationId && hasHydratedEvaluation.current) return;
			setSelectedTemplate(template);
			setIsTemplateLoading(false);
		},
		[evaluationId],
	);

	// Auto-load template if templateId is in URL
	useEffect(() => {
		if (templateId && !selectedTemplate) {
			const timer = setTimeout(() => {
				setIsTemplateLoading(false);
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [templateId, selectedTemplate]);

	useEffect(() => {
		if (!evaluationResponse || hasHydratedEvaluation.current) return;

		const fields = normalizeEvaluationFields(evaluationResponse.fields);
		const form = evaluationResponse.form ?? {};

		setSelectedTemplate({
			id: String(evaluationResponse.form_id),
			nome: String(form.nome ?? evaluationResponse.form_nome ?? "Avaliação"),
			descricao:
				typeof form.descricao === "string"
					? form.descricao
					: (evaluationResponse.form_descricao ?? null),
			tipo: String(form.tipo ?? evaluationResponse.form_tipo ?? "geral"),
			referencias:
				typeof form.referencias === "string"
					? form.referencias
					: (evaluationResponse.form_referencias ?? null),
			category: String(form.tipo ?? evaluationResponse.form_tipo ?? "geral"),
			fields,
			isBuiltin: false,
		});
		setFieldValues(normalizeEvaluationResponses(evaluationResponse.responses));
		setIsTemplateLoading(false);
		setActiveTab("anamnesis");
		hasHydratedEvaluation.current = true;
	}, [evaluationResponse]);

	useEffect(() => {
		if (
			!evaluationId ||
			!evaluationResponse ||
			evaluationResponse.status !== "scheduled" ||
			isViewMode ||
			hasMarkedStarted.current
		) {
			return;
		}

		hasMarkedStarted.current = true;
		updateEvaluationResponse.mutate({
			id: evaluationId,
			status: "in_progress",
			started_at: new Date().toISOString(),
		});
	}, [evaluationId, evaluationResponse, isViewMode, updateEvaluationResponse]);

	const handleFieldValueChange = useCallback(
		(fieldId: string, value: unknown) => {
			setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
		},
		[],
	);

	const handleAddCustomField = useCallback(
		(field: Omit<TemplateField, "id" | "ordem">) => {
			const newField: TemplateField = {
				...field,
				id: uuidv4(),
				ordem: allFields.length + 1,
			};
			setCustomFields((prev) => [...prev, newField]);
		},
		[allFields.length],
	);

	const handleSaveEvaluation = async () => {
		if (!patientId || isViewMode) return;
		setIsSaving(true);
		try {
			if (selectedTemplate) {
				if (evaluationId) {
					await updateEvaluationResponse.mutateAsync({
						id: evaluationId,
						responses: fieldValues,
						appointment_id: appointmentId || null,
						status: "completed",
						completed_at: new Date().toISOString(),
					});
				} else {
					await evaluationFormsApi.responses.create(selectedTemplate.id, {
						patient_id: patientId,
						responses: fieldValues,
						appointment_id: appointmentId || null,
						status: "completed",
						completed_at: new Date().toISOString(),
					});
				}

				if (!selectedTemplate.id.startsWith("builtin-")) {
					await incrementTemplateUsage.mutateAsync(selectedTemplate.id);
				}
			} else if (
				richTextAnamnesis.trim() ||
				Object.keys(physicalExamData).length > 0
			) {
				// Legacy free-form save logic if applicable
			}

			toast({
				title: "Avaliação salva",
				description: "Os dados foram registrados com sucesso.",
			});
			navigate(patientRoutes.clinicalTab(patientId));
		} catch (error) {
			logger.error("Error saving evaluation:", error);
			toast({
				title: "Erro ao salvar",
				description: "Não foi possível registrar a avaliação.",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handlePrescribeProtocol = useCallback((protocolId: string) => {
		setPreselectedExerciseId(undefined);
		setPreselectedProtocolId(protocolId);
		setIsPrescriptionModalOpen(true);
	}, []);

	const handlePrescribeExercise = useCallback((exerciseId: string) => {
		setPreselectedProtocolId(undefined);
		setPreselectedExerciseId(exerciseId);
		setIsPrescriptionModalOpen(true);
	}, []);

	const isReadOnlyEvaluation =
		isViewMode && evaluationResponse?.status === "completed";

	if (isLoading || (evaluationId && isEvaluationLoading)) {
		return (
			<PageLayout>
				<PageContainer>
					<div className="p-8 space-y-4">
						<Skeleton className="h-12 w-1/3" />
						<Skeleton className="h-64 w-full" />
					</div>
				</PageContainer>
			</PageLayout>
		);
	}

	if (isError || !patient || (evaluationId && isEvaluationError)) {
		return (
			<PageLayout>
				<PageContainer>
					<div className="p-8 text-center space-y-6 max-w-2xl mx-auto min-h-[60vh] flex flex-col items-center justify-center">
						<div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-4">
							<Activity className="h-10 w-10 text-rose-500" />
						</div>
						<div className="space-y-2">
							<h2 className="text-3xl font-bold tracking-tight">
								{isEvaluationError
									? "Avaliação não encontrada"
									: "Paciente não encontrado"}
							</h2>
							<p className="text-muted-foreground text-lg">
								{isEvaluationError
									? "Não foi possível carregar os dados desta avaliação. Ela pode ter sido removida ou o ID está incorreto."
									: "Não foi possível carregar as informações deste paciente. O registro pode ter sido removido ou o link está incorreto."}
							</p>
						</div>
						<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-4">
							<Button
								variant="outline"
								size="lg"
								onClick={() => navigate(-1)}
								className="rounded-xl px-8"
							>
								<ArrowLeft className="mr-2 h-4 w-4" /> Voltar
							</Button>
							<Button
								size="lg"
								onClick={() => window.location.reload()}
								className="rounded-xl px-8"
							>
								Tentar novamente
							</Button>
						</div>
					</div>
				</PageContainer>
			</PageLayout>
		);
	}

	return (
		<RichTextProvider>
			<PageLayout>
				<PageContainer>
					<PageHeader
						title={<>Nova Avaliação: {patient?.name}</>}
						subtitle="Fisioterapia Clínica"
						actions={
							<>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => navigate(-1)}
									className="rounded-full"
								>
									<ArrowLeft className="h-5 w-5" />
								</Button>
							</>
						}
					/>
					<div className="bg-muted dark:bg-slate-950/50 min-h-[calc(100vh-4rem)]">
						<div className="container max-w-7xl mx-auto pt-6 px-4 space-y-8 print:pt-0">
							<Tabs
								value={activeTab}
								onValueChange={setActiveTab}
								className="w-full"
							>
								<div className="sticky top-16 z-40 bg-muted dark:bg-slate-950/95 -mx-4 px-4 py-3 border-b border-blue-100/50 shadow-sm print:hidden mb-6">
									<TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl gap-2 scrollbar-hide">
										<TabsTrigger
											value="dashboard"
											className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<LayoutDashboard className="h-4 w-4" />
											<span>Visão Geral</span>
										</TabsTrigger>
										<TabsTrigger
											value="voice-ai"
											className="flex-1 min-w-[100px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<Mic className="h-4 w-4" />
											<span>Voz IA</span>
										</TabsTrigger>
										<TabsTrigger
											value="anamnesis"
											className="flex-1 min-w-[110px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<FileText className="h-4 w-4" />
											<span>Anamnese</span>
										</TabsTrigger>
										<TabsTrigger
											value="physical"
											className="flex-1 min-w-[110px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<Activity className="h-4 w-4" />
											<span>Exame Físico</span>
										</TabsTrigger>
										<TabsTrigger
											value="postural"
											className="flex-1 min-w-[140px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<Camera className="h-4 w-4" />
											<span>Análise Postural</span>
										</TabsTrigger>
										<TabsTrigger
											value="pain-map"
											className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold py-2.5 transition-all gap-2"
										>
											<Map className="h-4 w-4" />
											<span>Mapa de Dor</span>
										</TabsTrigger>
									</TabsList>
								</div>

								<div className="mt-6 animate-in fade-in-50 duration-500 print:mt-0">
									<TabsContent value="dashboard" className="m-0 print:hidden">
										<PatientDashboard360
											patient={patient}
											appointments={patient?.appointments || []}
											currentAppointmentId={appointmentId || undefined}
											activeGoals={
												patient?.goals?.filter(
													(g: any) => g.status === "em_andamento",
												) || []
											}
											activePathologies={
												patient?.pathologies?.filter(
													(p: any) => p.status !== "resolvido",
												) || []
											}
											surgeries={patient?.surgeries || []}
											onAction={(action) =>
												setActiveTab(action === "goals" ? "dashboard" : action)
											}
										/>
									</TabsContent>

									<TabsContent value="voice-ai" className="m-0 print:hidden">
										<div className="max-w-4xl mx-auto relative">
											{isMapping && (
												<div className="absolute inset-0 z-10 bg-card flex flex-col items-center justify-center rounded-[32px]">
													<Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
													<p className="text-sm font-bold text-slate-800">
														Extraindo dados clínicos...
													</p>
													<p className="text-xs text-slate-500">
														Mapeando sua fala para os campos do formulário
													</p>
												</div>
											)}
											<AssessmentVoiceRecorder
												patientId={patientId}
												patientContextHint={
													patient?.name
														? `Paciente: ${patient.name}`
														: undefined
												}
												onCompleted={handleVoiceCompleted}
											/>
										</div>
									</TabsContent>

									<TabsContent value="anamnesis" className="m-0">
										<div className="max-w-7xl mx-auto space-y-6 print:max-w-full">
											<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 print:hidden">
												<div className="space-y-1">
													<h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
														<FileText className="h-6 w-6 text-blue-600" />
														Anamnese Clínica
													</h2>
													<p className="text-sm text-muted-foreground font-medium">
														Registro detalhado e histórico clínico do paciente.
													</p>
												</div>
												{!isReadOnlyEvaluation && (
													<div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setShowAddFieldDialog(true)}
															className="rounded-xl h-9 font-bold text-xs"
														>
															<Plus className="mr-1.5 h-3.5 w-3.5" /> Campo
														</Button>
														<Separator orientation="vertical" className="h-4" />
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setShowSaveTemplateDialog(true)}
															disabled={allFields.length === 0}
															className="rounded-xl h-9 font-bold text-xs"
														>
															<BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />{" "}
															Template
														</Button>
													</div>
												)}
											</div>

											{hasRedFlags && (
												<Alert
													variant="destructive"
													className="bg-rose-50 border-rose-200 text-rose-900 animate-in fade-in slide-in-from-top-2"
												>
													<ShieldAlert className="h-5 w-5 !text-rose-600" />
													<AlertTitle className="text-rose-800 font-bold uppercase tracking-widest text-xs">
														Alerta de Segurança Clínica
													</AlertTitle>
													<AlertDescription className="text-sm mt-1">
														Foram detectados possíveis sinais de alerta (Red
														Flags) baseados na avaliação:
														<span className="font-bold ml-1">
															{detectedFlags.join(", ")}
														</span>
														.
														<br />
														Considere encaminhamento médico ou investigação
														aprofundada antes de prosseguir com o tratamento.
													</AlertDescription>
												</Alert>
											)}

											<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
												{/* Main Form Area */}
												<div
													className={cn(
														"space-y-6",
														patientId ? "lg:col-span-8" : "lg:col-span-12",
													)}
												>
													<div className="space-y-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-100/50 shadow-premium-sm print:hidden">
														<div className="flex items-center justify-between mb-2">
															<label className="text-[10px] font-black uppercase tracking-widest text-blue-600/80">
																Template de Avaliação Selecionado
															</label>
															{selectedTemplate && !evaluationId && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => handleTemplateSelect(null)}
																	className="h-7 text-[9px] uppercase font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
																>
																	Descartar Template
																</Button>
															)}
														</div>
														<EvaluationTemplateSelector
															selectedTemplateId={selectedTemplate?.id}
															onTemplateSelect={handleTemplateSelect}
															autoLoadDefault={false}
															initialTemplateId={templateId}
														/>
													</div>

													{!selectedTemplate && customFields.length === 0 ? (
														<div className="animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-4">
															<div className="border-2 border-slate-200/50 dark:border-slate-800/50 rounded-[32px] bg-white dark:bg-slate-950 shadow-premium-md overflow-hidden print:border-none relative">
																<div className="bg-muted dark:bg-slate-900/50 border-b p-2 print:hidden flex items-center justify-between">
																	<RichTextToolbar
																		imageUploadFolder={
																			patientId
																				? `patients/${patientId}/evaluations/whiteboard`
																				: undefined
																		}
																	/>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => setActiveTab("pain-map")}
																		className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/50 hover:bg-blue-100 rounded-xl px-3 gap-2"
																		title="Marcar local da dor no corpo do paciente"
																	>
																		<Map className="h-3.5 w-3.5" />
																		<span className="hidden sm:inline">
																			Mapa de Dor
																		</span>
																	</Button>
																</div>
																<div className="p-8 md:p-12 min-h-[600px] print:p-0">
																	<RichTextEditor
																		placeholder="Comece a escrever sua anamnese livre de forma detalhada..."
																		value={richTextAnamnesis}
																		onValueChange={setRichTextAnamnesis}
																		accentColor="sky"
																		className="!border-0 !p-0 shadow-none min-h-[550px] [&_.ProseMirror]:text-lg [&_.ProseMirror]:leading-relaxed"
																	/>
																</div>
															</div>
														</div>
													) : (
														<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2 print:pt-0">
															<DynamicFieldRenderer
																fields={allFields}
																values={fieldValues}
																onChange={handleFieldValueChange}
																readOnly={isReadOnlyEvaluation}
																previousValues={previousValues}
																historicalData={historicalFieldData}
															/>

															{/* Mobile Action Bridge (hidden on desktop) */}
															<div className="lg:hidden print:hidden">
																<EvaluationActionBridge
																	suggestions={suggestions}
																	onProtocolSelect={(_id) => {
																		toast({
																			title: "Protocolo Sugerido",
																			description: "Visualizando detalhes...",
																		});
																	}}
																	onPrescribeProtocol={handlePrescribeProtocol}
																	onPrescribeExercise={handlePrescribeExercise}
																/>
															</div>
														</div>
													)}
												</div>

												{/* Right Sidebar Area (History & Intel) */}
												{patientId && (
													<div className="lg:col-span-4 space-y-6 sticky top-24 print:hidden">
														<EvaluationHistorySidebar
															patientId={patientId}
															currentEvaluationId={evaluationId}
															onSelectEvaluation={(id) => {
																// Open in a new tab or mode? For now just navigate
																navigate(
																	`/patients/${patientId}/evaluations/new/${selectedTemplate?.id || "manual"}?evaluationId=${id}&mode=view`,
																);
																toast({
																	title: "Visualizando histórico",
																	description:
																		"Carregando dados da avaliação anterior.",
																});
															}}
														/>

														<div className="hidden lg:block">
															<EvaluationActionBridge
																suggestions={suggestions}
																onProtocolSelect={(_id) => {
																	toast({
																		title: "Protocolo Sugerido",
																		description: "Visualizando detalhes...",
																	});
																}}
																onPrescribeProtocol={handlePrescribeProtocol}
																onPrescribeExercise={handlePrescribeExercise}
															/>
														</div>
													</div>
												)}
											</div>
										</div>
									</TabsContent>

									<TabsContent value="physical" className="m-0">
										<div className="max-w-4xl mx-auto print:max-w-full">
											<div className="mb-6 print:mb-4">
												<h2 className="text-2xl font-bold tracking-tight">
													Exame Físico
												</h2>
												<p className="text-muted-foreground print:hidden">
													Registre os achados físicos e força.
												</p>
											</div>
											<PhysicalExamForm
												data={physicalExamData}
												onChange={setPhysicalExamData}
											/>
										</div>
									</TabsContent>

									<TabsContent
										value="postural"
										className="m-0 print:break-before-page"
									>
										<div className="max-w-6xl mx-auto print:max-w-full">
											<div className="mb-6 print:mb-4">
												<h2 className="text-2xl font-bold tracking-tight">
													Análise Postural AI
												</h2>
												<p className="text-muted-foreground print:hidden">
													Identifique desvios posturais automaticamente.
												</p>
											</div>
											<div className="print:hidden">
												<Suspense
													fallback={
														<div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed bg-card text-sm text-muted-foreground">
															Carregando estúdio postural...
														</div>
													}
												>
													<KinoveaStudio
														patientName={
															patient
																? PatientHelpers.getName(patient)
																: undefined
														}
														onCapture={(img, analysis) => {
															setPhysicalExamData((prev: any) => ({
																...prev,
																posturalAnalysis: [
																	...(prev.posturalAnalysis || []),
																	{
																		img,
																		analysis,
																		timestamp: new Date().toISOString(),
																	},
																],
															}));
														}}
													/>
												</Suspense>
											</div>
											<div className="hidden print:grid grid-cols-2 gap-4">
												{(Array.isArray(physicalExamData.posturalAnalysis)
													? physicalExamData.posturalAnalysis
													: []
												).map((item: any, idx: number) => (
													<div key={idx} className="border rounded-xl p-2">
														<img
															src={item.img}
															alt={`Análise ${idx}`}
															className="w-full h-auto rounded-lg"
														/>
														<p className="text-[10px] mt-1 font-bold uppercase text-center">
															{item.analysis?.type || "Vista Postural"}
														</p>
													</div>
												))}
											</div>
										</div>
									</TabsContent>

									<TabsContent
										value="pain-map"
										className="m-0 print:break-before-page"
									>
										<div className="max-w-5xl mx-auto print:max-w-full">
											<div className="mb-6 hidden md:block print:block print:mb-4">
												<h2 className="text-2xl font-bold tracking-tight">
													Mapa de Dor Interativo
												</h2>
												<p className="text-muted-foreground print:hidden">
													Marque as regiões dolorosas.
												</p>
											</div>
											<PainMapManager
												patientId={patientId || ""}
												appointmentId={appointmentId || undefined}
												sessionId={appointmentId || undefined}
											/>
										</div>
									</TabsContent>
								</div>
							</Tabs>
						</div>
					</div>
					{/* Floating Action Bar (Sticky Footer) */}
					{!isReadOnlyEvaluation &&
						activeTab !== "dashboard" &&
						activeTab !== "voice-ai" && (
							<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-500 print:hidden pointer-events-auto">
								<div className="bg-card border border-blue-100/50 dark:border-blue-900/50 shadow-premium-md rounded-full px-6 py-3 flex items-center gap-4">
									<div className="hidden sm:block">
										<p className="text-xs font-black uppercase tracking-widest text-slate-500">
											Ação Rápida
										</p>
										<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
											Finalizou o preenchimento?
										</p>
									</div>
									<Separator
										orientation="vertical"
										className="h-8 hidden sm:block mx-2"
									/>
									<Button
										onClick={handleSaveEvaluation}
										disabled={isSaving}
										className="rounded-full px-8 h-12 font-black text-sm shadow-sm shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all"
									>
										{isSaving ? (
											<>
												<Loader2 className="mr-2 h-5 w-5 animate-spin" />
												Salvando...
											</>
										) : (
											<>
												Salvar e Concluir
												<Save className="ml-2 h-5 w-5" />
											</>
										)}
									</Button>
								</div>
							</div>
						)}
					<AddCustomFieldDialog
						open={showAddFieldDialog}
						onOpenChange={setShowAddFieldDialog}
						onAddField={handleAddCustomField}
					/>
					<SaveAsTemplateDialog
						open={showSaveTemplateDialog}
						onOpenChange={setShowSaveTemplateDialog}
						fields={allFields}
					/>
					{patient && (
						<NewPrescriptionModal
							key={`${preselectedProtocolId}-${preselectedExerciseId}`} // Force remount to reset internal state
							open={isPrescriptionModalOpen}
							onOpenChange={setIsPrescriptionModalOpen}
							patientId={patientId || ""}
							patientName={patient.name}
							initialProtocolId={preselectedProtocolId}
							initialExerciseId={preselectedExerciseId}
						/>
					)}
				</PageContainer>
			</PageLayout>
		</RichTextProvider>
	);
}
