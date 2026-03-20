/**
 * Document Scanner Page - Google AI Suite (EXPANDIDA)
 *
 * Funcionalidades:
 * - Classificação automática de documentos (MRI, X-Ray, Ultrasound, etc.)
 * - Extração estruturada de dados com preservação de tabelas
 * - Sumarização com Gemini/medLM destacando achados chave
 * - Tradução automática de documentos estrangeiros
 * - OCR com preservação de formatação
 * - Comparação com exames anteriores mostrando mudanças
 * - Tagging inteligente e organização
 */

import React, { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import {
	FileSearch,
	Camera,
	Save,
	User,
	Upload,
	Sparkles,
	Languages,
	FileText,
	AlertCircle,
	CheckCircle2,
	TrendingUp,
	Tag,
	Eye,
	Brain,
	Download,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { aiApi, examsApi } from "@/lib/api/workers-client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePatientsPostgres } from "@/hooks/useDataConnect";
import ReactMarkdown from "react-markdown";
import { analyzeWithGeminiVision } from "@/services/ai/geminiVisionService";
import type { Patient } from "@/types";

// Tipos para dados extraídos
interface ExtractedData {
	fileUrl: string;
	storagePath: string;
	text: string;
	fullText?: string;
	tables?: Array<{
		headers: string[];
		rows: string[][];
	}>;
	formFields?: Record<string, string>;
	confidence?: number;
	language?: string;
}

interface DocumentClassification {
	type:
		| "mri"
		| "xray"
		| "ultrasound"
		| "ct_scan"
		| "clinical_report"
		| "prescription"
		| "certificate"
		| "other";
	confidence: number;
	bodyPart?: string;
	modality?: string;
	view?: string;
}

interface DocumentSummary {
	keyFindings: string[];
	impression: string;
	recommendations: string[];
	criticalAlerts?: string[];
}

interface DocumentComparison {
	hasChanges: boolean;
	changes: string[];
	progressScore?: number;
	previousExamDate?: string;
}

interface TranslatedDocument {
	originalText: string;
	translatedText: string;
	sourceLanguage: string;
	targetLanguage: string;
}

interface DocumentTag {
	id: string;
	name: string;
	category: "anatomy" | "condition" | "modality" | "priority";
	confidence: number;
}

interface MedicalRecord {
	id: string;
	patientId: string;
	type: string;
	date: string;
	description?: string;
	[key: string]: unknown;
}

export default function DocumentScannerPage() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [extractedData, setExtractedData] = useState<ExtractedData | null>(
		null,
	);
	const [classification, setClassification] =
		useState<DocumentClassification | null>(null);
	const [summary, setSummary] = useState<DocumentSummary | null>(null);
	const [comparison, setComparison] = useState<DocumentComparison | null>(null);
	const [translation, setTranslation] = useState<TranslatedDocument | null>(
		null,
	);
	const [tags, setTags] = useState<DocumentTag[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("scan");
	const [autoTranslate, setAutoTranslate] = useState(false);
	const [translateLanguage, setTranslateLanguage] = useState("pt");
	const [previousExams, setPreviousExams] = useState<MedicalRecord[]>([]);
	const { toast } = useToast();
	const { profile } = useUserProfile();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const organizationId = profile?.organization_id || "default";
	const { data: patients } = usePatientsPostgres(organizationId);

	// Mapeamento de tipos de documentos para exibição
	const documentTypeLabels: Record<
		string,
		{ label: string; icon: string; color: string }
	> = {
		mri: {
			label: "Ressonância Magnética",
			icon: "🧠",
			color: "bg-purple-100 text-purple-700",
		},
		xray: { label: "Raio-X", icon: "💀", color: "bg-blue-100 text-blue-700" },
		ultrasound: {
			label: "Ultrassom",
			icon: "📊",
			color: "bg-green-100 text-green-700",
		},
		ct_scan: {
			label: "Tomografia",
			icon: "🔬",
			color: "bg-orange-100 text-orange-700",
		},
		clinical_report: {
			label: "Laudos Clínicos",
			icon: "📋",
			color: "bg-gray-100 text-gray-700",
		},
		prescription: {
			label: "Receituário",
			icon: "💊",
			color: "bg-pink-100 text-pink-700",
		},
		certificate: {
			label: "Atestado",
			icon: "📄",
			color: "bg-yellow-100 text-yellow-700",
		},
		other: { label: "Outro", icon: "📁", color: "bg-gray-100 text-gray-700" },
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];
			setFile(selectedFile);
			setExtractedData(null);
			setClassification(null);
			setSummary(null);
			setComparison(null);
			setTranslation(null);
			setTags([]);

			// Criar preview
			if (selectedFile.type.startsWith("image/")) {
				const url = URL.createObjectURL(selectedFile);
				setPreviewUrl(url);
			} else {
				setPreviewUrl(null);
			}
		}
	};

	const clearFile = () => {
		setFile(null);
		setPreviewUrl(null);
		setExtractedData(null);
		setClassification(null);
		setSummary(null);
		setComparison(null);
		setTranslation(null);
		setTags([]);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const openFilePicker = () => {
		fileInputRef.current?.click();
	};

	// Buscar exames anteriores do paciente para comparação
	const fetchPreviousExams = async (patientId: string) => {
		try {
			const result = await examsApi.list(patientId);
			const exams = (result.data ?? []).slice(0, 5).map((e) => ({
				id: e.id,
				patientId: e.patient_id,
				type: e.exam_type ?? "exam_result",
				date: e.exam_date ?? e.created_at,
				description: e.description,
			})) as MedicalRecord[];
			setPreviousExams(exams);
			return exams;
		} catch (error) {
			console.error("Erro ao buscar exames anteriores:", error);
			return [];
		}
	};

	// Fallback local com Gemini Vision client-side (sem Cloud Functions)
	const scanLocally = async (file: File) => {
		const toBase64 = (f: File) =>
			new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () =>
					resolve((reader.result as string).split(",")[1] || "");
				reader.onerror = reject;
				reader.readAsDataURL(f);
			});

		const base64 = await toBase64(file);
		const visionResult = await analyzeWithGeminiVision(base64);
		const text = visionResult.text || "Nenhum texto detectado.";

		// Heurística simples de classificação
		const lower = text.toLowerCase();
		let type: DocumentClassification["type"] = "clinical_report";
		if (
			lower.includes("rx") ||
			lower.includes("raio") ||
			lower.includes("x-ray")
		)
			type = "xray";
		if (lower.includes("ressonância") || lower.includes("mri")) type = "mri";
		if (lower.includes("tomografia") || lower.includes("ct")) type = "ct_scan";
		if (lower.includes("ultra") || lower.includes("doppler"))
			type = "ultrasound";

		const fallbackSummary: DocumentSummary = {
			keyFindings: text.split("\n").slice(0, 3).filter(Boolean),
			impression:
				text.split("\n").slice(3, 8).join("\n") ||
				"Impressão automática gerada pela IA local.",
			recommendations: [
				"Validar com radiologista",
				"Comparar com exame anterior",
				"Salvar no prontuário",
			],
		};

		const localExtracted: ExtractedData = {
			fileUrl: `local://${file.name}`,
			storagePath: "",
			text,
			fullText: text,
			confidence: 0.42,
		};

		setExtractedData(localExtracted);
		setClassification({ type, confidence: 0.42 });
		setSummary(fallbackSummary);
		setComparison(null);
		setTranslation(null);
		setTags([
			{
				id: "local-1",
				name: type.toUpperCase(),
				category: "modality",
				confidence: 0.42,
			},
		]);
	};

	const handleScan = async () => {
		if (!file) return;
		setLoading(true);

		try {
			// 1. Upload para R2
			let fileUrl = "";
			try {
				const { url } = await uploadToR2(file, "medical_reports");
				fileUrl = url;
			} catch (uploadError) {
				console.error(
					"Falha no upload para o R2, usando fallback local",
					uploadError,
				);
				toast({
					title: "Sem acesso ao Storage",
					description: "Processando localmente.",
					variant: "default",
				});
				await scanLocally(file);
				return;
			}

			toast({
				title: "Upload Completo",
				description: "Enviando para análise...",
			});

			try {
				// 2. Análise completa via Cloud Functions (se disponível)
				const result = await aiApi.documentAnalyze({
					fileUrl,
					fileName: file.name,
					mediaType: file.type,
					options: {
						includeClassification: true,
						includeSummary: true,
						includeExtraction: true,
						includeTables: true,
						includeTranslation: autoTranslate,
						targetLanguage: translateLanguage,
						compareWithPrevious: selectedPatient ? true : false,
						patientId: selectedPatient || null,
					},
				});

				const data = result.data as unknown as {
					extractedData: ExtractedData;
					classification?: DocumentClassification;
					summary?: DocumentSummary;
					comparison?: DocumentComparison;
					translation?: TranslatedDocument;
					tags?: DocumentTag[];
				};

				setExtractedData({
					...data.extractedData,
					storagePath: fileUrl,
				});
				setClassification(data.classification || null);
				setSummary(data.summary || null);
				setComparison(data.comparison || null);
				setTranslation(data.translation || null);
				setTags(data.tags || []);

				if (selectedPatient) {
					await fetchPreviousExams(selectedPatient);
				}

				toast({
					title: "Análise Completa Concluída",
					description: "Documento processado com sucesso.",
				});
			} catch (cloudError) {
				console.error(
					"Cloud analysis failed, usando fallback local",
					cloudError,
				);
				toast({
					title: "Modo local ativado",
					description: "Processando com Gemini Vision no frontend.",
					variant: "default",
				});
				await scanLocally(file);
			}
		} catch (error) {
			console.error(error);
			toast({
				title: "Erro",
				description: "Falha na análise do documento.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleClassifyOnly = async () => {
		if (!extractedData) return;

		try {
			const result = await aiApi.documentClassify({
				text: extractedData.text,
				fileUrl: extractedData.fileUrl,
			});

			setClassification(result.data as unknown as DocumentClassification);
			toast({
				title: "Documento Classificado",
				description: "Tipo identificado com sucesso.",
			});
		} catch (error) {
			console.error(error);
			// Fallback heurístico
			const fallbackType = extractedData.text.toLowerCase().includes("rx")
				? "xray"
				: "clinical_report";
			setClassification({
				type: fallbackType as DocumentClassification["type"],
				confidence: 0.35,
			});
			toast({
				title: "Classificação local",
				description: "Usando heurística offline.",
				variant: "default",
			});
		}
	};

	const handleSummarizeOnly = async () => {
		if (!extractedData) return;

		try {
			const result = await aiApi.documentSummarize({
				text: extractedData.fullText || extractedData.text,
				documentType: classification?.type || "clinical_report",
			});

			setSummary(result.data as unknown as DocumentSummary);
			toast({
				title: "Resumo Gerado",
				description: "IA analisou o documento.",
			});
		} catch (error) {
			console.error(error);
			const fallback: DocumentSummary = {
				keyFindings: extractedData.text.split("\n").slice(0, 3),
				impression:
					extractedData.text.split("\n").slice(3, 8).join("\n") ||
					"Resumo gerado localmente.",
				recommendations: ["Validar com especialista", "Arquivar no prontuário"],
			};
			setSummary(fallback);
			toast({
				title: "Resumo local",
				description: "Gerado offline com heurística.",
				variant: "default",
			});
		}
	};

	const handleTranslateOnly = async () => {
		if (!extractedData) return;

		try {
			const result = await aiApi.documentTranslate({
				text: extractedData.fullText || extractedData.text,
				targetLanguage: translateLanguage,
			});

			setTranslation(result.data as unknown as TranslatedDocument);
			toast({
				title: "Tradução Concluída",
				description: "Documento traduzido.",
			});
		} catch (error) {
			console.error(error);
			const fallback: TranslatedDocument = {
				originalText: extractedData.text,
				translatedText: extractedData.text,
				sourceLanguage: "auto",
				targetLanguage: translateLanguage,
			};
			setTranslation(fallback);
			toast({
				title: "Tradução local",
				description: "Exibindo texto original (tradução indisponível).",
			});
		}
	};

	const handleCompareOnly = async () => {
		if (!selectedPatient) {
			toast({
				title: "Aviso",
				description: "Selecione um paciente primeiro.",
				variant: "destructive",
			});
			return;
		}

		if (!extractedData) return;

		try {
			const result = await aiApi.documentCompare({
				currentText: extractedData.fullText || extractedData.text,
				patientId: selectedPatient,
				documentType: classification?.type,
			});

			setComparison(result.data as unknown as DocumentComparison);
			await fetchPreviousExams(selectedPatient);
			toast({
				title: "Comparação Concluída",
				description: "Exames comparados.",
			});
		} catch (error) {
			console.error(error);
			setComparison({
				hasChanges: false,
				changes: ["Comparação offline não disponível."],
			});
			toast({
				title: "Comparação offline",
				description: "Não foi possível chamar a função, exibindo fallback.",
			});
		}
	};

	const handleSaveToRecord = async () => {
		if (!selectedPatient || !extractedData) return;
		setSaving(true);

		try {
			const patient = (patients as Patient[] | undefined)?.find(
				(p) => p.id === selectedPatient,
			);

			// Salvar como exame/registro médico via Workers API
			const isImaging = ["mri", "xray", "ct_scan", "ultrasound"].includes(
				classification?.type ?? "",
			);
			const newExam = await examsApi.create({
				patient_id: selectedPatient,
				title:
					summary?.impression?.substring(0, 100) ||
					classification?.type ||
					"Documento Digitalizado",
				exam_type: isImaging ? "exam_result" : "clinical_note",
				exam_date: new Date().toISOString(),
				description:
					summary?.impression || extractedData.text.substring(0, 500),
			});
			if (extractedData.fileUrl && newExam?.data?.id) {
				await examsApi.addFile(newExam.data.id, {
					file_path: extractedData.fileUrl,
					file_name: file?.name ?? "documento",
					file_type: "pdf",
				});
			}

			toast({
				title: "Salvo!",
				description: `Documento anexado ao prontuário de ${patient?.name || "paciente"}.`,
			});

			clearFile();
			setSelectedPatient("");
		} catch (error) {
			console.error(error);
			toast({
				title: "Erro ao salvar",
				description: "Falha ao vincular documento.",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleDownloadPDF = async () => {
		if (!extractedData) return;

		try {
			await aiApi.documentPdf({
				documentData: {
					extractedData,
					classification,
					summary,
					tags,
				},
				includeTranslation: translation !== null,
			});

			toast({
				title: "PDF Gerado",
				description: "Documento disponível para download.",
			});
		} catch (error) {
			console.error(error);
			toast({
				title: "PDF não disponível",
				description: "Função não encontrada. Copie o texto manualmente.",
				variant: "destructive",
			});
		}
	};

	return (
		<MainLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="p-3 bg-green-100 rounded-lg">
							<FileSearch className="w-8 h-8 text-green-600" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								Digitalizador Inteligente de Laudos
							</h1>
							<p className="text-gray-500">
								Análise avançada com Gemini Vision, Document AI e Translation
								API
							</p>
						</div>
					</div>

					{/* Opções de IA */}
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
							<Languages className="w-4 h-4 text-blue-600" />
							<Switch
								checked={autoTranslate}
								onCheckedChange={setAutoTranslate}
								id="translate-toggle"
							/>
							<label
								htmlFor="translate-toggle"
								className="text-sm text-gray-600"
							>
								Traduzir
							</label>
							{autoTranslate && (
								<Select
									value={translateLanguage}
									onValueChange={setTranslateLanguage}
								>
									<SelectTrigger className="w-20 h-7 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pt">Português</SelectItem>
										<SelectItem value="en">English</SelectItem>
										<SelectItem value="es">Español</SelectItem>
									</SelectContent>
								</Select>
							)}
						</div>
					</div>
				</div>

				{/* Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="scan">Digitalizar</TabsTrigger>
						<TabsTrigger value="analysis">Análise</TabsTrigger>
						<TabsTrigger value="comparison">Comparação</TabsTrigger>
						<TabsTrigger value="history">Histórico</TabsTrigger>
					</TabsList>

					{/* Scan Tab */}
					<TabsContent value="scan">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Painel de Controle */}
							<Card className="lg:col-span-1">
								<CardHeader>
									<CardTitle>Configuração</CardTitle>
									<CardDescription>
										Upload e processamento de documentos
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Upload */}
									<div className="space-y-2">
										<label className="text-sm font-medium">
											1. Selecione o Arquivo
										</label>
										<div
											className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative"
											role="button"
											tabIndex={0}
											onClick={openFilePicker}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													openFilePicker();
												}
											}}
										>
											<Input
												ref={fileInputRef}
												type="file"
												accept="application/pdf,image/*"
												className="hidden"
												onChange={handleFileChange}
											/>
											<Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
											<p className="text-sm text-gray-600">
												{file ? file.name : "Arraste ou clique para selecionar"}
											</p>
											<p className="text-xs text-gray-400 mt-1">
												PDF, JPG, PNG
											</p>
										</div>
									</div>

									{file && (
										<>
											{/* Preview da imagem */}
											{previewUrl && (
												<div className="relative">
													<img
														src={previewUrl}
														alt="Preview"
														className="w-full rounded-lg border"
													/>
													<Button
														variant="destructive"
														size="sm"
														className="absolute top-2 right-2"
														onClick={clearFile}
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											)}

											{/* Seleção de Paciente */}
											<div className="space-y-2">
												<label className="text-sm font-medium flex items-center gap-2">
													<User className="w-4 h-4" /> Paciente (Opcional)
												</label>
												<PatientCombobox
													patients={(patients as Patient[] | undefined) || []}
													value={selectedPatient}
													onValueChange={setSelectedPatient}
												/>
												<p className="text-xs text-gray-500">
													Selecionar um paciente permite comparar com exames
													anteriores
												</p>
											</div>

											{/* Botão de Scan */}
											<Button
												className="w-full bg-green-600 hover:bg-green-700"
												onClick={handleScan}
												disabled={loading}
											>
												{loading ? (
													<>
														<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
														Processando com IA...
													</>
												) : (
													<>
														<Sparkles className="w-4 h-4 mr-2" />
														2. Digitalizar com IA
													</>
												)}
											</Button>
										</>
									)}

									{/* Ações após scan */}
									{extractedData && (
										<div className="pt-4 border-t space-y-2">
											<Button
												className="w-full"
												variant="outline"
												onClick={handleDownloadPDF}
											>
												<Download className="w-4 h-4 mr-2" />
												Exportar PDF
											</Button>

											{selectedPatient && (
												<Button
													className="w-full"
													onClick={handleSaveToRecord}
													disabled={saving}
												>
													<Save className="w-4 h-4 mr-2" />
													{saving ? "Salvando..." : "3. Salvar no Prontuário"}
												</Button>
											)}
										</div>
									)}
								</CardContent>
							</Card>

							{/* Visualização de Resultados */}
							<Card className="lg:col-span-2">
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										<span>Dados Extraídos</span>
										{extractedData?.confidence && (
											<Badge
												variant="outline"
												className="text-green-600 border-green-600"
											>
												{Math.round(extractedData.confidence * 100)}% confiança
											</Badge>
										)}
									</CardTitle>
									<CardDescription>
										{classification
											? `Documento classificado como: ${documentTypeLabels[classification.type]?.label}`
											: "Gemini Vision e Document AI"}
									</CardDescription>
								</CardHeader>
								<CardContent>
									{extractedData ? (
										<Tabs defaultValue="text">
											<TabsList className="mb-4">
												<TabsTrigger value="text">Texto</TabsTrigger>
												{extractedData.tables &&
													extractedData.tables.length > 0 && (
														<TabsTrigger value="tables">Tabelas</TabsTrigger>
													)}
												{extractedData.formFields && (
													<TabsTrigger value="fields">Campos</TabsTrigger>
												)}
												{translation && (
													<TabsTrigger value="translation">
														Tradução
													</TabsTrigger>
												)}
											</TabsList>

											<TabsContent value="text">
												<ScrollArea className="h-[400px]">
													<div className="bg-gray-50 p-4 rounded-lg border">
														<pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
															{extractedData.fullText || extractedData.text}
														</pre>
													</div>
												</ScrollArea>
											</TabsContent>

											{extractedData.tables &&
												extractedData.tables.length > 0 && (
													<TabsContent value="tables">
														<ScrollArea className="h-[400px]">
															<div className="space-y-4">
																{extractedData.tables.map((table, idx) => (
																	<div
																		key={idx}
																		className="border rounded-lg overflow-hidden"
																	>
																		<table className="w-full text-sm">
																			<thead className="bg-gray-100">
																				<tr>
																					{table.headers.map((h, i) => (
																						<th
																							key={i}
																							className="px-4 py-2 text-left font-medium"
																						>
																							{h}
																						</th>
																					))}
																				</tr>
																			</thead>
																			<tbody>
																				{table.rows.map((row, i) => (
																					<tr key={i} className="border-t">
																						{row.map((cell, j) => (
																							<td key={j} className="px-4 py-2">
																								{cell}
																							</td>
																						))}
																					</tr>
																				))}
																			</tbody>
																		</table>
																	</div>
																))}
															</div>
														</ScrollArea>
													</TabsContent>
												)}

											{extractedData.formFields && (
												<TabsContent value="fields">
													<ScrollArea className="h-[400px]">
														<div className="grid grid-cols-2 gap-2">
															{Object.entries(extractedData.formFields).map(
																([key, value]) => (
																	<div
																		key={key}
																		className="p-2 bg-gray-50 rounded border"
																	>
																		<div className="text-xs text-gray-500">
																			{key}
																		</div>
																		<div className="text-sm font-medium">
																			{value}
																		</div>
																	</div>
																),
															)}
														</div>
													</ScrollArea>
												</TabsContent>
											)}

											{translation && (
												<TabsContent value="translation">
													<ScrollArea className="h-[400px]">
														<div className="space-y-4">
															<div className="p-3 bg-blue-50 rounded border border-blue-200">
																<div className="text-xs text-blue-600 mb-1">
																	{translation.sourceLanguage.toUpperCase()} →{" "}
																	{translation.targetLanguage.toUpperCase()}
																</div>
																<p className="text-sm whitespace-pre-wrap">
																	{translation.translatedText}
																</p>
															</div>
														</div>
													</ScrollArea>
												</TabsContent>
											)}
										</Tabs>
									) : (
										<div className="flex flex-col items-center justify-center h-96 text-gray-500 border-2 border-dashed rounded-lg">
											<Camera className="w-16 h-16 mb-4 opacity-20" />
											<p className="text-lg font-medium">
												Nenhum documento processado
											</p>
											<p className="text-sm">
												Faça upload de uma imagem ou PDF para iniciar a análise
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Analysis Tab */}
					<TabsContent value="analysis">
						{extractedData ? (
							<div className="space-y-6">
								{/* Classificação */}
								{classification && (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Tag className="w-5 h-5" />
												Classificação Automática
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex items-center gap-4">
												<div
													className={`p-4 rounded-lg ${documentTypeLabels[classification.type]?.color}`}
												>
													<span className="text-3xl">
														{documentTypeLabels[classification.type]?.icon}
													</span>
												</div>
												<div className="flex-1">
													<h3 className="text-xl font-semibold">
														{documentTypeLabels[classification.type]?.label}
													</h3>
													<p className="text-sm text-gray-500">
														Confiança:{" "}
														{Math.round(classification.confidence * 100)}%
													</p>
													{classification.bodyPart && (
														<p className="text-sm text-gray-600 mt-1">
															Região: {classification.bodyPart}
														</p>
													)}
												</div>
												<Badge variant="outline" className="text-lg px-4 py-2">
													{Math.round(classification.confidence * 100)}%
												</Badge>
											</div>

											{/* Tags */}
											{tags.length > 0 && (
												<div className="mt-4 pt-4 border-t">
													<div className="text-sm font-medium mb-2">
														Tags Identificadas
													</div>
													<div className="flex flex-wrap gap-2">
														{tags.map((tag) => (
															<Badge
																key={tag.id}
																variant="secondary"
																className="cursor-pointer hover:opacity-80"
															>
																{tag.name} ({Math.round(tag.confidence * 100)}%)
															</Badge>
														))}
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								)}

								{/* Resumo com IA */}
								{summary && (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Brain className="w-5 h-5 text-purple-600" />
												Análise com Gemini/MedLM
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											{/* Alertas Críticos */}
											{summary.criticalAlerts &&
												summary.criticalAlerts.length > 0 && (
													<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
														<div className="flex items-center gap-2 text-red-700 font-medium mb-2">
															<AlertCircle className="w-5 h-5" />
															Alertas Críticos
														</div>
														<ul className="space-y-1">
															{summary.criticalAlerts.map((alert, idx) => (
																<li key={idx} className="text-sm text-red-600">
																	• {alert}
																</li>
															))}
														</ul>
													</div>
												)}

											{/* Achados Chave */}
											{summary.keyFindings.length > 0 && (
												<div>
													<h4 className="font-semibold mb-2 flex items-center gap-2">
														<Eye className="w-4 h-4" />
														Achados Chave
													</h4>
													<ul className="space-y-2">
														{summary.keyFindings.map((finding, idx) => (
															<li key={idx} className="flex items-start gap-2">
																<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
																<span className="text-sm text-gray-700">
																	{finding}
																</span>
															</li>
														))}
													</ul>
												</div>
											)}

											{/* Impressão */}
											{summary.impression && (
												<div>
													<h4 className="font-semibold mb-2">
														Impressão do Exame
													</h4>
													<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm prose prose-blue max-w-none">
														<ReactMarkdown>{summary.impression}</ReactMarkdown>
													</div>
												</div>
											)}

											{/* Recomendações */}
											{summary.recommendations.length > 0 && (
												<div>
													<h4 className="font-semibold mb-2">Recomendações</h4>
													<ul className="space-y-1">
														{summary.recommendations.map((rec, idx) => (
															<li
																key={idx}
																className="text-sm text-gray-600 flex items-start gap-2"
															>
																<span className="text-blue-600">→</span>
																{rec}
															</li>
														))}
													</ul>
												</div>
											)}
										</CardContent>
									</Card>
								)}

								{/* Ações adicionais */}
								<Card>
									<CardHeader>
										<CardTitle>Análises Adicionais</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
											<Button
												variant="outline"
												onClick={handleClassifyOnly}
												disabled={loading}
											>
												<Tag className="w-4 h-4 mr-2" />
												Reclassificar
											</Button>
											<Button
												variant="outline"
												onClick={handleSummarizeOnly}
												disabled={loading}
											>
												<Sparkles className="w-4 h-4 mr-2" />
												Reanalisar
											</Button>
											<Button
												variant="outline"
												onClick={handleTranslateOnly}
												disabled={loading}
											>
												<Languages className="w-4 h-4 mr-2" />
												Traduzir
											</Button>
											<Button
												variant="outline"
												onClick={handleCompareOnly}
												disabled={loading || !selectedPatient}
											>
												<TrendingUp className="w-4 h-4 mr-2" />
												Comparar
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						) : (
							<Card>
								<CardContent className="py-16">
									<div className="text-center text-gray-500">
										<Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
										<p>Digitalize um documento para ver a análise completa</p>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* Comparison Tab */}
					<TabsContent value="comparison">
						{comparison ? (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<TrendingUp className="w-5 h-5" />
										Comparação com Exames Anteriores
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{comparison.hasChanges ? (
										<>
											<div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
												<div>
													<div className="text-sm text-gray-600">
														Score de Evolução
													</div>
													{comparison.progressScore !== undefined && (
														<div className="text-2xl font-bold text-blue-600">
															{comparison.progressScore >= 0 ? "+" : ""}
															{comparison.progressScore}%
														</div>
													)}
												</div>
												<Badge
													variant={
														comparison.progressScore &&
														comparison.progressScore >= 0
															? "default"
															: "destructive"
													}
													className={
														comparison.progressScore &&
														comparison.progressScore >= 0
															? "bg-green-600"
															: "bg-red-600"
													}
												>
													{comparison.progressScore &&
													comparison.progressScore >= 0
														? "Melhora"
														: "Piora"}
												</Badge>
											</div>

											<div>
												<h4 className="font-semibold mb-2">
													Mudanças Identificadas
												</h4>
												<ul className="space-y-2">
													{comparison.changes.map((change, idx) => (
														<li key={idx} className="flex items-start gap-2">
															<span
																className={
																	change.includes("melhor") ||
																	change.includes("diminuiu")
																		? "text-green-600"
																		: change.includes("pior") ||
																				change.includes("aumentou")
																			? "text-red-600"
																			: "text-blue-600"
																}
															>
																•
															</span>
															<span className="text-sm text-gray-700">
																{change}
															</span>
														</li>
													))}
												</ul>
											</div>
										</>
									) : (
										<div className="text-center py-8 text-gray-500">
											<CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
											<p>
												Sem mudanças significativas em relação ao exame anterior
											</p>
										</div>
									)}

									{comparison.previousExamDate && (
										<p className="text-sm text-gray-500 text-center">
											Comparado com exame de{" "}
											{new Date(comparison.previousExamDate).toLocaleDateString(
												"pt-BR",
											)}
										</p>
									)}
								</CardContent>
							</Card>
						) : (
							<Card>
								<CardContent className="py-16">
									<div className="text-center text-gray-500">
										<TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
										<p>
											{selectedPatient
												? "Digitalize um documento para comparar com exames anteriores"
												: "Selecione um paciente para habilitar a comparação"}
										</p>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Lista de exames anteriores */}
						{selectedPatient && previousExams.length > 0 && (
							<Card className="mt-6">
								<CardHeader>
									<CardTitle>Exames Anteriores</CardTitle>
								</CardHeader>
								<CardContent>
									<ScrollArea className="h-[300px]">
										<div className="space-y-2">
											{previousExams.map((exam) => (
												<div
													key={exam.id}
													className="p-3 bg-gray-50 rounded-lg border flex items-center justify-between"
												>
													<div>
														<div className="font-medium text-sm">
															{exam.description?.substring(0, 50)}...
														</div>
														<div className="text-xs text-gray-500">
															{new Date(exam.date).toLocaleDateString("pt-BR")}
														</div>
													</div>
													<Button variant="ghost" size="sm">
														<Eye className="w-4 h-4" />
													</Button>
												</div>
											))}
										</div>
									</ScrollArea>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					{/* History Tab */}
					<TabsContent value="history">
						<Card>
							<CardHeader>
								<CardTitle>Histórico de Digitalizações</CardTitle>
								<CardDescription>
									Documentos processados recentemente
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="text-center py-12 text-gray-500">
									<FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
									<p>O histórico será exibido aqui</p>
									<p className="text-sm mt-1">
										Em breve: listagem de todos os documentos processados
									</p>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
