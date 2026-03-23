import { useState, useCallback, useEffect, useMemo } from "react";
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
import { PosturalAnalysisTool } from "@/components/analysis/PosturalAnalysisTool";
import { PainMapManager } from "@/components/evolution/PainMapManager";
import {
	EvaluationTemplateSelector,
	DynamicFieldRenderer,
	AddCustomFieldDialog,
	SaveAsTemplateDialog,
} from "@/components/evaluation";

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
import { normalizeGoalRows } from "@/lib/clinical/goalNormalization";
import { AppointmentService } from "@/services/appointmentService";
import {
	appointmentsApi,
	evaluationFormsApi,
	goalsApi,
	patientsApi,
} from "@/api/v2";

import { useIncrementTemplateUsage } from "@/hooks/useTemplateStats";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { RichTextToolbar } from "@/components/ui/RichTextToolbar";
import { RichTextProvider } from "@/contexts/RichTextContext";
import { Badge } from "@/components/ui/badge";

// Helper function to generate UUID - using crypto.randomUUID() to avoid "ne is not a function" error in production
const uuidv4 = (): string => crypto.randomUUID();

export default function NewEvaluationPage() {
	const { patientId, templateId } = useParams();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const appointmentId = searchParams.get("appointmentId");
	const { toast } = useToast();
	const incrementTemplateUsage = useIncrementTemplateUsage();

	const [activeTab, setActiveTab] = useState("dashboard");
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

	// Physical Exam State (keep existing)
	const [physicalExamData, setPhysicalExamData] = useState<any>({});

	// Combined fields (template + custom)
	const allFields = [...(selectedTemplate?.fields || []), ...customFields];

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
			setSelectedTemplate(template);
			setIsTemplateLoading(false);
			// Optionally reset custom fields when changing template
			// setCustomFields([]);
		},
		[],
	);

	// Auto-load template if templateId is in URL
	useEffect(() => {
		if (templateId && !selectedTemplate) {
			// The template will be loaded by EvaluationTemplateSelector
			// We just need to ensure we wait for it
			const timer = setTimeout(() => {
				setIsTemplateLoading(false);
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [templateId, selectedTemplate]);

	// Handle field value change
	const handleFieldValueChange = useCallback(
		(fieldId: string, value: unknown) => {
			setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
		},
		[],
	);

	// Handle adding custom field
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
		if (!patientId) return;
		setIsSaving(true);
		try {
			// Save evaluation responses
			if (selectedTemplate) {
				await evaluationFormsApi.responses.create(selectedTemplate.id, {
					patient_id: patientId,
					responses: fieldValues,
					appointment_id: appointmentId || null,
				});

				// Increment template usage counter
				if (!selectedTemplate.id.startsWith("builtin-")) {
					await incrementTemplateUsage.mutateAsync(selectedTemplate.id);
				}
			} else if (richTextAnamnesis.trim() || Object.keys(physicalExamData).length > 0) {
				// Save free-form evaluation (anamnesis + physical exam)
				await evaluationFormsApi.responses.create("free-form", {
					patient_id: patientId,
					responses: {
						anamnesis: richTextAnamnesis,
						physical_exam: physicalExamData,
					},
					appointment_id: appointmentId || null,
				});
			}

			toast({
				title: "Avaliação Salva",
				description: "Os dados da avaliação foram registrados com sucesso.",
			});

			// Update appointment status via API (agenda IDs are from API)
			if (appointmentId) {
				await AppointmentService.updateStatus(appointmentId, "realizado");
			}

			navigate("/agenda");
		} catch (error) {
			logger.error("Erro ao salvar avaliação", error, "NewEvaluationPage");
			toast({
				title: "Erro ao salvar",
				description: "Ocorreu um erro ao salvar a avaliação.",
				variant: "destructive",
			});
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<MainLayout>
				<div className="p-8 space-y-6 max-w-7xl mx-auto">
					<div className="flex gap-4">
						<Skeleton className="h-32 w-32 rounded-full" />
						<div className="space-y-4 flex-1">
							<Skeleton className="h-8 w-1/3" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
					<Skeleton className="h-[500px] w-full" />
				</div>
			</MainLayout>
		);
	}

	if (!patient) return <div>Paciente não encontrado</div>;

	return (
		<RichTextProvider>
			<MainLayout>
				{/* Print-only Header */}
				<div className="hidden print:block mb-8 border-b-2 border-primary pb-6">
					<div className="flex justify-between items-start">
						<div>
							<h1 className="text-3xl font-black text-primary tracking-tighter">FISIOFLOW</h1>
							<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Centro de Reabilitação Avançada</p>
						</div>
						<div className="text-right">
							<p className="text-sm font-bold">Data da Avaliação</p>
							<p className="text-lg">{new Date().toLocaleDateString('pt-BR')}</p>
						</div>
					</div>
					<div className="mt-8 grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
						<div>
							<p className="text-[10px] font-bold uppercase text-muted-foreground">Paciente</p>
							<p className="font-bold text-lg">{PatientHelpers.getName(patient)}</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase text-muted-foreground">Avaliador</p>
							<p className="font-bold text-lg">Dr. {patient.therapist_name || 'Fisioterapeuta'}</p>
						</div>
					</div>
				</div>

				<div className="min-h-screen bg-background/50 pb-20 print:bg-white print:pb-0">
					{/* Header Actions */}
					<div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3 flex items-center justify-between print:hidden">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => navigate("/agenda")}
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div>
								<h1 className="text-xl font-bold text-primary">
									Avaliação Inicial
								</h1>
								<p className="text-xs text-muted-foreground">
									Paciente: {PatientHelpers.getName(patient)}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={() => navigate(`/patients/${patientId}/history`)}
							>
								Ver Histórico
							</Button>
							<Button
								variant="outline"
								onClick={() => window.print()}
								className="gap-2"
							>
								<Printer className="h-4 w-4" />
								Imprimir
							</Button>
							<Button onClick={handleSaveEvaluation} disabled={isSaving}>
								<Save className="mr-2 h-4 w-4" />
								{isSaving ? "Salvando..." : "Salvar Avaliação"}
							</Button>
						</div>
					</div>

					<div className="container max-w-7xl mx-auto pt-6 px-4 space-y-8 print:pt-0">
						{/* Tabs Navigation */}
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
											patient.goals?.filter(
												(g: { status?: string }) => g.status === "em_andamento",
											) || []
										}
										activePathologies={
											patient.pathologies?.filter(
												(p: { status?: string }) => p.status !== "resolvido",
											) || []
										}
										surgeries={patient.surgeries || []}
										onAction={(action) =>
											setActiveTab(action === "goals" ? "dashboard" : action)
										}
									/>
								</TabsContent>

								<TabsContent value="anamnesis" className="m-0">
									<div className="max-w-4xl mx-auto space-y-6 print:max-w-full">
										{/* Header with Template Selector */}
										<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 print:hidden">
											<div>
												<h2 className="text-2xl font-bold tracking-tight">
													Anamnese Detalhada
												</h2>
												<p className="text-muted-foreground">
													Colete o histórico clínico completo do paciente.
												</p>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setShowAddFieldDialog(true)}
												>
													<Plus className="mr-2 h-4 w-4" />
													Adicionar Campo
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setShowSaveTemplateDialog(true)}
													disabled={allFields.length === 0}
												>
													<BookmarkPlus className="mr-2 h-4 w-4" />
													Salvar Template
												</Button>
											</div>
										</div>

										{/* Template Selector */}
										<div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed print:hidden">
											<div className="flex items-center justify-between">
												<label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
													Template de Avaliação
												</label>
												{selectedTemplate && (
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

										{/* Content Area: Template Fields or Rich Text */}
										{!selectedTemplate && customFields.length === 0 ? (
											<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-4">
												<div className="flex items-center justify-between border-b pb-4 print:hidden">
													<div className="space-y-1">
														<Badge variant="outline" className="gap-1.5 py-1 px-3 bg-primary/5 text-primary border-primary/20">
															<Sparkles className="h-3.5 w-3.5" /> Quadro Branco (Livre)
														</Badge>
														<p className="text-xs text-muted-foreground ml-1">
															Use este espaço para uma anamnese sem restrições de campos.
														</p>
													</div>
													<div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
														<span>Estilo Notion</span>
														<div className="h-4 w-px bg-muted" />
														<span>Editor Rico</span>
													</div>
												</div>
												<div className="border-2 border-muted/50 rounded-2xl bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all print:border-none print:shadow-none">
													<div className="bg-muted/30 border-b p-1 print:hidden">
														<RichTextToolbar 
															className="border-none shadow-none bg-transparent" 
															imageUploadFolder={patientId ? `patients/${patientId}/evaluations/whiteboard` : undefined}
														/>
													</div>
													<div className="p-8 min-h-[600px] print:p-0">
														<RichTextEditor
															placeholder="Comece a escrever sua anamnese livre... Use '/' para comandos como tabelas, listas e títulos."
															value={richTextAnamnesis}
															onValueChange={setRichTextAnamnesis}
															accentColor="sky"
															className="!border-0 !p-0 shadow-none min-h-[550px] [&_.ProseMirror]:text-lg [&_.ProseMirror]:leading-relaxed print:text-base"
														/>
													</div>
												</div>
											</div>
										) : (
											<div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-4 print:pt-0">
												<DynamicFieldRenderer
													fields={allFields}
													values={fieldValues}
													onChange={handleFieldValueChange}
												/>
											</div>
										)}

										{/* Custom Fields Note */}
										{customFields.length > 0 && (
											<div className="text-sm text-muted-foreground text-center py-2 print:hidden">
												{customFields.length} campo(s) personalizado(s)
												adicionado(s)
											</div>
										)}
									</div>
								</TabsContent>

								<TabsContent value="physical" className="m-0">
									<div className="max-w-4xl mx-auto print:max-w-full">
										<div className="mb-6 print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">
												Exame Físico
											</h2>
											<p className="text-muted-foreground print:hidden">
												Registre os achados físicos, amplitude de movimento e
												força.
											</p>
										</div>
										<PhysicalExamForm
											data={physicalExamData}
											onChange={setPhysicalExamData}
										/>
									</div>
								</TabsContent>

								<TabsContent value="postural" className="m-0 print:break-before-page">
									<div className="max-w-6xl mx-auto print:max-w-full">
										<div className="mb-6 print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">
												Análise Postural AI
											</h2>
											<p className="text-muted-foreground print:hidden">
												Use a câmera para identificar desvios posturais e calcular ângulos automaticamente.
											</p>
										</div>
										<div className="print:hidden">
											<PosturalAnalysisTool 
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
										</div>
										
										{/* Print view for postural analysis */}
										<div className="hidden print:grid grid-cols-2 gap-4">
											{physicalExamData.posturalAnalysis?.map((item: any, idx: number) => (
												<div key={idx} className="border rounded-xl p-2">
													<img src={item.img} alt={`Análise ${idx}`} className="w-full h-auto rounded-lg" />
													<p className="text-[10px] mt-1 font-bold uppercase text-center">{item.analysis?.type || 'Vista Postural'}</p>
												</div>
											))}
										</div>
									</div>
								</TabsContent>

								<TabsContent value="pain-map" className="m-0 print:break-before-page">
									<div className="max-w-5xl mx-auto print:max-w-full">
										<div className="mb-6 hidden md:block print:block print:mb-4">
											<h2 className="text-2xl font-bold tracking-tight">
												Mapa de Dor Interativo
											</h2>
											<p className="text-muted-foreground print:hidden">
												Marque as regiões dolorosas e a intensidade.
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

				{/* Dialogs */}
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
			</MainLayout>
		</RichTextProvider>
	);
}
