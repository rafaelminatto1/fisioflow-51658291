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
	Sparkles,
	Camera,
	Printer,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PatientDashboard360 } from "@/components/patient/dashboard/PatientDashboard360";
import { PhysicalExamForm } from "@/components/patient/forms/PhysicalExamForm";
import { PainMapManager } from "@/components/evolution/PainMapManager";
import {
	EvaluationTemplateSelector,
	DynamicFieldRenderer,
	AddCustomFieldDialog,
	SaveAsTemplateDialog,
	EvaluationActionBridge,
} from "@/components/evaluation";
import { useActionBridge } from "@/hooks/useActionBridge";
import { NewPrescriptionModal } from "@/components/prescriptions/NewPrescriptionModal";

import type {
	EvaluationTemplate,
	TemplateField,
} from "@/components/evaluation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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

function mapEvaluationField(field: Record<string, unknown>): TemplateField {
	return {
		...(field as TemplateField),
		id: String(field.id),
		label: String(field.label ?? ""),
		tipo_campo: String(field.tipo_campo ?? "texto_curto"),
		placeholder:
			typeof field.placeholder === "string" ? field.placeholder : null,
		opcoes: Array.isArray(field.opcoes) ? (field.opcoes as string[]) : null,
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
	const { data: evaluationResponse, isLoading: isEvaluationLoading } =
		usePatientEvaluationResponse(evaluationId || undefined);
	const hasHydratedEvaluation = useRef(false);
	const hasMarkedStarted = useRef(false);

	const [activeTab, setActiveTab] = useState(() =>
		templateId || evaluationId ? "anamnesis" : "dashboard",
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
	const [preselectedProtocolId, setPreselectedProtocolId] = useState<string | undefined>(undefined);
	const [preselectedExerciseId, setPreselectedExerciseId] = useState<string | undefined>(undefined);

	// Physical Exam State
	const [physicalExamData, setPhysicalExamData] = useState<any>({});

	// Combined fields
	const allFields = [...(selectedTemplate?.fields || []), ...customFields];

	// Action Bridge Intelligence
	const suggestions = useActionBridge(allFields, fieldValues);

	// Fetch Patient Data
	const { data: patient, isLoading } = useQuery({
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

		const fields = (evaluationResponse.fields ?? []).map((field) =>
			mapEvaluationField(field as Record<string, unknown>),
		);
		const form = evaluationResponse.form ?? {};

		setSelectedTemplate({
			id: String(evaluationResponse.form_id),
			nome: String(form.nome ?? evaluationResponse.form_nome ?? "Avaliação"),
			descricao:
				typeof form.descricao === "string"
					? form.descricao
					: evaluationResponse.form_descricao ?? null,
			tipo: String(form.tipo ?? evaluationResponse.form_tipo ?? "geral"),
			referencias:
				typeof form.referencias === "string"
					? form.referencias
					: evaluationResponse.form_referencias ?? null,
			category: String(form.tipo ?? evaluationResponse.form_tipo ?? "geral"),
			fields,
			isBuiltin: false,
		});
		setFieldValues(evaluationResponse.responses ?? {});
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
			<MainLayout>
				<div className="p-8 space-y-4">
					<Skeleton className="h-12 w-1/3" />
					<Skeleton className="h-64 w-full" />
				</div>
			</MainLayout>
		);
	}

	return (
		<RichTextProvider>
			<MainLayout
				maxWidth="7xl"
				noPadding
				customHeader={
					<div className="flex items-center justify-between px-6 h-16 border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => navigate(-1)}
								className="rounded-full"
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div>
								<h1 className="text-lg font-bold tracking-tight">
									Nova Avaliação: {patient?.name}
								</h1>
								<p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
									Fisioterapia Clínica
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => window.print()}>
								<Printer className="mr-2 h-4 w-4" /> Imprimir
							</Button>
							{isReadOnlyEvaluation ? (
								<Badge variant="outline" className="rounded-xl px-4 py-2">
									Somente leitura
								</Badge>
							) : (
								<Button
									onClick={handleSaveEvaluation}
									disabled={isSaving}
									size="sm"
									className="rounded-xl px-6 font-bold"
								>
									{isSaving ? "Salvando..." : "Finalizar e Salvar"}
									{!isSaving && <Save className="ml-2 h-4 w-4" />}
								</Button>
							)}
						</div>
					</div>
				}
			>
				<div className="bg-slate-50/50 dark:bg-slate-950/50 min-h-[calc(100vh-4rem)]">
					<div className="container max-w-7xl mx-auto pt-6 px-4 space-y-8 print:pt-0">
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 p-1 bg-muted/50 rounded-xl mb-6 print:hidden">
								<TabsTrigger value="dashboard" className="gap-2">
									<LayoutDashboard className="h-4 w-4" />
									<span className="hidden sm:inline">Visão Geral</span>
								</TabsTrigger>
								<TabsTrigger value="anamnesis" className="gap-2">
									<FileText className="h-4 w-4" />
									<span className="hidden sm:inline">Anamnese</span>
								</TabsTrigger>
								<TabsTrigger value="physical" className="gap-2">
									<Activity className="h-4 w-4" />
									<span className="hidden sm:inline">Exame Físico</span>
								</TabsTrigger>
								<TabsTrigger value="postural" className="gap-2">
									<Camera className="h-4 w-4" />
									<span className="hidden sm:inline">Análise Postural</span>
								</TabsTrigger>
								<TabsTrigger value="pain-map" className="gap-2">
									<Map className="h-4 w-4" />
									<span className="hidden sm:inline">Mapa de Dor</span>
								</TabsTrigger>
							</TabsList>

							<div className="mt-6 animate-in fade-in-50 duration-500 print:mt-0">
								<TabsContent value="dashboard" className="m-0 print:hidden">
									<PatientDashboard360
										patient={patient}
										appointments={patient.appointments}
										currentAppointmentId={appointmentId || undefined}
										activeGoals={
											patient.goals?.filter((g: any) => g.status === "em_andamento") || []
										}
										activePathologies={
											patient.pathologies?.filter((p: any) => p.status !== "resolvido") || []
										}
										surgeries={patient.surgeries || []}
										onAction={(action) => setActiveTab(action === "goals" ? "dashboard" : action)}
									/>
								</TabsContent>

								<TabsContent value="anamnesis" className="m-0">
									<div className="max-w-4xl mx-auto space-y-6 print:max-w-full">
										<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 print:hidden">
											<div>
												<h2 className="text-2xl font-bold tracking-tight">Anamnese Detalhada</h2>
												<p className="text-muted-foreground">Colete o histórico clínico completo do paciente.</p>
											</div>
											{!isReadOnlyEvaluation && (
												<div className="flex gap-2">
													<Button variant="outline" size="sm" onClick={() => setShowAddFieldDialog(true)}>
														<Plus className="mr-2 h-4 w-4" /> Adicionar Campo
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => setShowSaveTemplateDialog(true)}
														disabled={allFields.length === 0}
													>
														<BookmarkPlus className="mr-2 h-4 w-4" /> Salvar Template
													</Button>
												</div>
											)}
										</div>

										<div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed print:hidden">
											<div className="flex items-center justify-between">
												<label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Template de Avaliação</label>
												{selectedTemplate && !evaluationId && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleTemplateSelect(null)}
														className="h-7 text-[10px] uppercase font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
													>
														Limpar e voltar para Quadro Branco
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
											<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-4">
												<div className="flex items-center justify-between border-b pb-4 print:hidden">
													<div className="space-y-1">
														<Badge variant="outline" className="gap-1.5 py-1 px-3 bg-primary/5 text-primary border-primary/20">
															<Sparkles className="h-3.5 w-3.5" /> Quadro Branco (Livre)
														</Badge>
														<p className="text-xs text-muted-foreground ml-1">Use este espaço para uma anamnese sem restrições.</p>
													</div>
												</div>
												<div className="border-2 border-muted/50 rounded-2xl bg-card shadow-sm overflow-hidden print:border-none">
													<div className="bg-muted/30 border-b p-1 print:hidden">
														<RichTextToolbar 
															imageUploadFolder={patientId ? `patients/${patientId}/evaluations/whiteboard` : undefined}
														/>
													</div>
													<div className="p-8 min-h-[600px] print:p-0">
														<RichTextEditor
															placeholder="Comece a escrever sua anamnese livre..."
															value={richTextAnamnesis}
															onValueChange={setRichTextAnamnesis}
															accentColor="sky"
															className="!border-0 !p-0 shadow-none min-h-[550px] [&_.ProseMirror]:text-lg"
														/>
													</div>
												</div>
											</div>
										) : (
											<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
												<div className="lg:col-span-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-4 print:pt-0">
													<DynamicFieldRenderer
														fields={allFields}
														values={fieldValues}
														onChange={handleFieldValueChange}
														readOnly={isReadOnlyEvaluation}
													/>
												</div>
												
												{/* Painel de Inteligência Action Bridge */}
												<div className="lg:col-span-4 sticky top-24 hidden lg:block print:hidden">
													<EvaluationActionBridge 
														suggestions={suggestions}
														onProtocolSelect={(id) => {
															toast({
																title: "Protocolo Sugerido",
																description: "Você pode visualizar este protocolo no dicionário clínico.",
																variant: "default"
															});
														}}
														onPrescribeProtocol={handlePrescribeProtocol}
														onPrescribeExercise={handlePrescribeExercise}
													/>
												</div>
											</div>
										)}
									</div>
								</TabsContent>

								<TabsContent value="physical" className="m-0">
									<div className="max-w-4xl mx-auto print:max-w-full">
										<div className="mb-6 print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">Exame Físico</h2>
											<p className="text-muted-foreground print:hidden">Registre os achados físicos e força.</p>
										</div>
										<PhysicalExamForm data={physicalExamData} onChange={setPhysicalExamData} />
									</div>
								</TabsContent>

								<TabsContent value="postural" className="m-0 print:break-before-page">
									<div className="max-w-6xl mx-auto print:max-w-full">
										<div className="mb-6 print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">Análise Postural AI</h2>
											<p className="text-muted-foreground print:hidden">Identifique desvios posturais automaticamente.</p>
										</div>
										<div className="print:hidden">
											<Suspense
												fallback={
													<div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed bg-card/30 text-sm text-muted-foreground">
														Carregando estúdio postural...
													</div>
												}
											>
												<KinoveaStudio
													patientName={patient ? PatientHelpers.getName(patient) : undefined}
													onCapture={(img, analysis) => {
														setPhysicalExamData((prev: any) => ({
															...prev,
															posturalAnalysis: [
																...(prev.posturalAnalysis || []),
																{ img, analysis, timestamp: new Date().toISOString() }
															]
														}));
													}}
												/>
											</Suspense>
										</div>
										<div className="hidden print:grid grid-cols-2 gap-4">
											{physicalExamData.posturalAnalysis?.map((item: any, idx: number) => (
												<div key={idx} className="border rounded-xl p-2">
													<img src={item.img} alt={`Análise ${idx}`} className="w-full h-auto rounded-lg" />
													<p className="text-[10px] mt-1 font-bold uppercase text-center">{item.analysis?.type || "Vista Postural"}</p>
												</div>
											))}
										</div>
									</div>
								</TabsContent>

								<TabsContent value="pain-map" className="m-0 print:break-before-page">
									<div className="max-w-5xl mx-auto print:max-w-full">
										<div className="mb-6 hidden md:block print:block print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">Mapa de Dor Interativo</h2>
											<p className="text-muted-foreground print:hidden">Marque as regiões dolorosas.</p>
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
			</MainLayout>
		</RichTextProvider>
	);
}
