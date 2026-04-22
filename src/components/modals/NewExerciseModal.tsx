import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
	Sparkles,
	Loader2,
	Upload,
	X,
	Plus,
	Film,
	Image as ImageIcon,
	BookOpen,
} from "lucide-react";
import { exercisesApi } from "@/api/v2";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { MultiSelect } from "@/components/ui/multi-select";
import { 
	getBodyPartsOptions,
	getEquipmentOptions,
	getPathologyOptions,
	getPrecautionOptions,
	getEvidenceLevelOptions,
} from "@/lib/constants/exerciseConstants";
import type { Exercise } from "@/hooks/useExercises";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { knowledgeBase } from "@/data/knowledgeBase";

const exerciseSchema = z.object({
	name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
	description: z.string().optional(),
	category: z.string().optional(),
	difficulty: z.enum(["Iniciante", "Intermediário", "Avançado"]).optional(),
	video_url: z.string().optional().or(z.literal("")),
	image_url: z.string().optional().or(z.literal("")),
	instructions: z.string().optional(),
	sets: z.number().int().positive().optional().nullable(),
	repetitions: z.number().int().positive().optional().nullable(),
	duration: z.number().int().positive().optional().nullable(),
	indicated_pathologies: z.array(z.string()).optional(),
	contraindicated_pathologies: z.array(z.string()).optional(),
	equipment: z.array(z.string()).optional(),
	alternativeEquipment: z.array(z.string()).optional(),
	precaution_level: z.enum(["safe", "supervised", "restricted"]).optional(),
	precaution_notes: z.string().optional(),
	scientific_references: z.union([z.array(z.any()), z.string()]).optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: Omit<Exercise, "id" | "created_at" | "updated_at">) => void;
	exercise?: Exercise;
	isLoading?: boolean;
}

export function NewExerciseModal({
	open,
	onOpenChange,
	onSubmit,
	exercise,
	isLoading: isSaving,
}: ExerciseModalProps) {
	const [isAnalyzing, setIsAnalyzing] = React.useState(false);
	const [isUploading, setIsUploading] = React.useState(false);
	const [uploadProgress, setUploadProgress] = React.useState(0);
	const [imageFile, setImageFile] = React.useState<File | null>(null);
	const [videoFile, setVideoFile] = React.useState<File | null>(null);
	const [imagePreview, setImagePreview] = React.useState<string | null>(null);
	const [videoPreview, setVideoPreview] = React.useState<string | null>(null);

	const imageInputRef = React.useRef<HTMLInputElement>(null);
	const videoInputRef = React.useRef<HTMLInputElement>(null);

	const form = useForm<ExerciseFormData>({
		resolver: zodResolver(exerciseSchema),
		defaultValues: {
			name: "",
			description: "",
			category: "",
			difficulty: undefined,
			video_url: "",
			image_url: "",
			instructions: "",
			sets: undefined,
			repetitions: undefined,
			duration: undefined,
			indicated_pathologies: [],
			contraindicated_pathologies: [],
			body_parts: [],
			equipment: [],
			alternativeEquipment: [],
			precaution_level: "safe",
			precaution_notes: "",
			scientific_references: [],
		},
	});

	useEffect(() => {
		// Clear files and previews when switching exercises or opening/closing
		setImageFile(null);
		setVideoFile(null);
		setImagePreview(null);
		setVideoPreview(null);
		setUploadProgress(0);
		setIsUploading(false);

		if (exercise) {
			form.reset({
				name: exercise.name || "",
				description: exercise.description || "",
				category: exercise.category || "",
				difficulty:
					(exercise.difficulty as "Iniciante" | "Intermediário" | "Avançado") ||
					undefined,
				video_url: exercise.video_url || "",
				image_url: exercise.image_url || "",
				instructions: exercise.instructions || "",
				sets: exercise.sets || undefined,
				repetitions: exercise.repetitions || undefined,
				duration: exercise.duration || undefined,
				indicated_pathologies: Array.isArray(exercise.indicated_pathologies) ? exercise.indicated_pathologies : [],
				contraindicated_pathologies: Array.isArray(exercise.contraindicated_pathologies) ? exercise.contraindicated_pathologies : [],
				body_parts: Array.isArray(exercise.body_parts) ? exercise.body_parts : [],
				equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
				alternativeEquipment: Array.isArray((exercise as any).alternativeEquipment) ? (exercise as any).alternativeEquipment : [],
				precaution_level: (exercise as any).precaution_level || "safe",
				precaution_notes: (exercise as any).precaution_notes || "",
				scientific_references: (exercise as any).scientific_references || [],
			});
		} else {
			form.reset({
				name: "",
				description: "",
				category: "",
				difficulty: undefined,
				video_url: "",
				image_url: "",
				instructions: "",
				sets: undefined,
				repetitions: undefined,
				duration: undefined,
				indicated_pathologies: [],
				contraindicated_pathologies: [],
				body_parts: [],
				equipment: [],
				alternativeEquipment: [],
				precaution_level: "safe",
				precaution_notes: "",
				scientific_references: [],
			});
		}
	}, [exercise, form]);

	const handleAnalyzeImage = async () => {
		const imageUrl = form.getValues("image_url");
		if (!imageUrl) {
			toast({
				title: "URL da imagem necessária",
				description: "Insira a URL de uma imagem para analisar",
				variant: "destructive",
			});
			return;
		}

		setIsAnalyzing(true);
		try {
			const result = await exercisesApi.analyzeImage(imageUrl);
			if (result.success && result.analysis) {
				// Preencher campos automaticamente baseados na análise
				if (result.analysis.labels?.length > 0) {
					const currentDesc = form.getValues("description") || "";
					const aiTags = `Tags IA: ${result.analysis.labels.join(", ")}`;
					form.setValue(
						"description",
						currentDesc ? `${currentDesc}\n\n${aiTags}` : aiTags,
					);
				}

				toast({
					title: "Análise concluída",
					description:
						"A imagem foi analisada e as informações foram extraídas.",
				});
			}
		} catch (error) {
			console.error("Erro na análise:", error);
			toast({
				title: "Erro na análise",
				description: "Não foi possível analisar a imagem no momento.",
				variant: "destructive",
			});
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleFileChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		type: "image" | "video",
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (type === "image") {
			if (!file.type.startsWith("image/")) {
				toast({
					title: "Erro",
					description: "Por favor selecione uma imagem",
					variant: "destructive",
				});
				return;
			}
			setImageFile(file);
			setImagePreview(URL.createObjectURL(file));
		} else {
			if (!file.type.startsWith("video/")) {
				toast({
					title: "Erro",
					description: "Por favor selecione um vídeo",
					variant: "destructive",
				});
				return;
			}
			setVideoFile(file);
			setVideoPreview(URL.createObjectURL(file));
		}
	};

	const uploadFile = async (file: File, path: string): Promise<string> => {
		const { publicUrl } = await uploadToR2(file, path);
		return publicUrl;
	};

	const handleSubmit = async (data: ExerciseFormData) => {
		setIsUploading(true);
		setUploadProgress(10);

		try {
			let finalImageUrl = data.image_url;
			let finalVideoUrl = data.video_url;

			if (imageFile) {
				setUploadProgress(20);
				finalImageUrl = await uploadFile(imageFile, "exercise-images");
			}

			if (videoFile) {
				setUploadProgress(imageFile ? 50 : 30);
				finalVideoUrl = await uploadFile(videoFile, "exercise-videos");
			}

			setUploadProgress(90);
			onSubmit({
				...data,
				image_url: finalImageUrl,
				video_url: finalVideoUrl,
			} as Omit<Exercise, "id" | "created_at" | "updated_at">);

			onOpenChange(false);
		} catch (error) {
			console.error("Erro ao salvar exercício:", error);
			toast({
				title: "Erro ao salvar",
				description:
					"Ocorreu um erro ao fazer upload dos arquivos. Tente novamente.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col p-0">
				<DialogHeader className="p-4 sm:p-6 pb-2">
					<DialogTitle className="text-lg sm:text-xl">
						{exercise ? "Editar Exercício" : "Novo Exercício"}
					</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2">
					<Form {...form}>
						<form
							id="exercise-form"
							onSubmit={form.handleSubmit(handleSubmit)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nome*</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Nome do exercício" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Descrição</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Descrição do exercício"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="category"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Categoria</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Ex: Fortalecimento" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="difficulty"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Dificuldade</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="Iniciante">Iniciante</SelectItem>
													<SelectItem value="Intermediário">
														Intermediário
													</SelectItem>
													<SelectItem value="Avançado">Avançado</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="instructions"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Instruções</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Instruções detalhadas"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<p className="text-[11px] text-muted-foreground italic mb-1">📊 Valores médios recomendados — o profissional ajusta na prescrição individual</p>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="sets"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Séries (Recomendado)</FormLabel>
											<FormControl>
												<Input
													type="number"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="repetitions"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Repetições (Recomendado)</FormLabel>
											<FormControl>
												<Input
													type="number"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="duration"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Duração Recomendada (seg)</FormLabel>
											<FormControl>
												<Input
													type="number"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="video_url"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Vídeo</FormLabel>
										<div className="space-y-2">
											<div className="flex gap-2">
												<FormControl>
													<Input
														{...field}
														placeholder="URL do Vídeo (Youtube, Vimeo...)"
														className="flex-1"
													/>
												</FormControl>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() => videoInputRef.current?.click()}
													title="Fazer upload de vídeo"
												>
													<Upload className="h-4 w-4" />
												</Button>
											</div>

											<input
												type="file"
												ref={videoInputRef}
												className="hidden"
												accept="video/*"
												onChange={(e) => handleFileChange(e, "video")}
											/>

											{videoPreview && (
												<div className="relative aspect-video rounded-lg overflow-hidden bg-black mt-2">
													<video
														src={videoPreview}
														className="w-full h-full object-contain"
														controls
													/>
													<Button
														type="button"
														variant="destructive"
														size="icon"
														className="absolute top-2 right-2 h-8 w-8"
														onClick={() => {
															setVideoFile(null);
															setVideoPreview(null);
														}}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											)}

											{videoFile && !videoPreview && (
												<div className="flex items-center gap-2 p-2 bg-muted rounded-md">
													<Film className="h-4 w-4" />
													<span className="text-sm truncate">
														{videoFile.name}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-6 w-6 ml-auto"
														onClick={() => setVideoFile(null)}
													>
														<X className="h-3 w-3" />
													</Button>
												</div>
											)}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="image_url"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Imagem</FormLabel>
										<div className="space-y-2">
											<div className="flex gap-2">
												<FormControl>
													<Input
														{...field}
														placeholder="URL da Imagem"
														className="flex-1"
													/>
												</FormControl>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() => imageInputRef.current?.click()}
													title="Fazer upload de imagem"
												>
													<Upload className="h-4 w-4" />
												</Button>
												<Button
													type="button"
													variant="secondary"
													size="icon"
													onClick={handleAnalyzeImage}
													disabled={isAnalyzing || !field.value}
													title="Analisar com IA"
												>
													{isAnalyzing ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Sparkles className="h-4 w-4" />
													)}
												</Button>
											</div>

											<input
												type="file"
												ref={imageInputRef}
												className="hidden"
												accept="image/*"
												onChange={(e) => handleFileChange(e, "image")}
											/>

											{imagePreview && (
												<div className="relative aspect-video rounded-lg overflow-hidden border bg-muted mt-2">
													<img
														src={imagePreview}
														className="w-full h-full object-contain"
														alt="Preview"
													/>
													<Button
														type="button"
														variant="destructive"
														size="icon"
														className="absolute top-2 right-2 h-8 w-8"
														onClick={() => {
															setImageFile(null);
															setImagePreview(null);
														}}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											)}

											{imageFile && !imagePreview && (
												<div className="flex items-center gap-2 p-2 bg-muted rounded-md">
													<ImageIcon className="h-4 w-4" />
													<span className="text-sm truncate">
														{imageFile.name}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-6 w-6 ml-auto"
														onClick={() => setImageFile(null)}
													>
														<X className="h-3 w-3" />
													</Button>
												</div>
											)}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="indicated_pathologies"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												✅ Indicações Clínicas
											</FormLabel>
											<FormControl>
												<MultiSelect
													options={getPathologyOptions()}
													selected={Array.isArray(field.value) ? field.value : []}
													onChange={field.onChange}
													allowCustom={true}
													placeholder="Selecionar patologias indicadas..."
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contraindicated_pathologies"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												⚠️ Contraindicações
											</FormLabel>
											<FormControl>
												<MultiSelect
													options={getPathologyOptions()}
													selected={Array.isArray(field.value) ? field.value : []}
													onChange={field.onChange}
													allowCustom={true}
													placeholder="Selecionar contraindicações..."
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="body_parts"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Partes do Corpo
											</FormLabel>
											<FormControl>
												<MultiSelect
													options={getBodyPartsOptions()}
													selected={Array.isArray(field.value) ? field.value : []}
													onChange={field.onChange}
													allowCustom={true}
													placeholder="Selecionar ou digitar..."
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="equipment"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Equipamentos</FormLabel>
											<FormControl>
												<MultiSelect
													options={getEquipmentOptions()}
													selected={Array.isArray(field.value) ? field.value : []}
													onChange={field.onChange}
													allowCustom={true}
													placeholder="Selecionar ou digitar..."
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="alternativeEquipment"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Equipamentos Alternativos
											</FormLabel>
											<FormControl>
												<MultiSelect
													options={getEquipmentOptions()}
													selected={Array.isArray(field.value) ? field.value : []}
													onChange={field.onChange}
													allowCustom={true}
													placeholder="Selecionar ou digitar..."
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							
							<div className="space-y-4 pt-4 border-t mt-4">
								<h3 className="text-sm font-semibold flex items-center gap-2">
									<Sparkles className="h-4 w-4 text-primary" />
									Inteligência Clínica & Segurança
								</h3>
								
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="precaution_level"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nível de Precaução</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value}>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Selecione o nível" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{getPrecautionOptions().map(opt => (
															<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="precaution_notes"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Notas de Segurança</FormLabel>
												<FormControl>
													<Input {...field} placeholder="Ex: Evitar valgo dinâmico" />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<FormLabel className="text-sm font-semibold">Referências Científicas (Wiki)</FormLabel>
										<Button 
											type="button" 
											variant="outline" 
											size="sm" 
											className="h-7 text-[10px] gap-1"
											onClick={() => {
												const refs = form.getValues("scientific_references") || [];
												form.setValue("scientific_references", [
													...refs, 
													{ title: "", year: new Date().getFullYear(), evidence_level: "ExpertOpinion" }
												]);
											}}
										>
											<Plus className="h-3 w-3" /> Adicionar Ref.
										</Button>
									</div>
									
									<div className="space-y-2">
										{Array.isArray(form.watch("scientific_references")) ? (
											(form.watch("scientific_references") || []).map((ref: any, index: number) => (
												<div key={index} className="flex gap-2 items-start border p-2 rounded-lg bg-muted/30">
													<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
														<Input 
															placeholder="Título do artigo" 
															className="h-8 text-xs" 
															value={ref.title}
															onChange={(e) => {
																const refs = [...form.getValues("scientific_references") as any[]];
																refs[index].title = e.target.value;
																form.setValue("scientific_references", refs);
															}}
														/>
														<div className="flex gap-2 relative">
															<Input 
																placeholder="ID do Artigo Wiki (Opcional)" 
																className="h-8 text-xs font-mono pr-8" 
																value={ref.wiki_artifact_id || ""}
																onChange={(e) => {
																	const refs = [...form.getValues("scientific_references") as any[]];
																	refs[index].wiki_artifact_id = e.target.value;
																	form.setValue("scientific_references", refs);
																}}
															/>
															{ref.wiki_artifact_id && knowledgeBase.find(a => a.id === ref.wiki_artifact_id) && (
																<Popover>
																	<PopoverTrigger asChild>
																		<Button variant="ghost" size="icon" className="h-6 w-6 absolute right-1 top-1 text-sky-600 hover:bg-sky-50">
																			<BookOpen className="h-3.5 w-3.5" />
																		</Button>
																	</PopoverTrigger>
																	<PopoverContent className="w-80 p-3 shadow-xl border-sky-100" side="top">
																		{(() => {
																			const article = knowledgeBase.find(a => a.id === ref.wiki_artifact_id);
																			if (!article) return null;
																			return (
																				<div className="space-y-2">
																					<h4 className="font-bold text-sm text-slate-800 leading-tight">{article.title}</h4>
																					<div className="flex items-center gap-2">
																						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{article.group}</span>
																						<span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">{article.year}</span>
																					</div>
																					{article.highlights && article.highlights.length > 0 && (
																						<div className="mt-2 space-y-1">
																							<p className="text-[10px] font-bold text-slate-400 uppercase">Key Findings:</p>
																							<ul className="text-xs text-slate-600 space-y-1">
																								{article.highlights.map((h, i) => (
																									<li key={i} className="flex gap-1.5"><span className="text-sky-500 mt-0.5">•</span> <span>{h}</span></li>
																								))}
																							</ul>
																						</div>
																					)}
																				</div>
																			);
																		})()}
																	</PopoverContent>
																</Popover>
															)}
														</div>
														<div className="flex gap-2">
															<Input 
																type="number" 
																className="h-8 text-xs w-20" 
																value={ref.year}
																onChange={(e) => {
																	const refs = [...form.getValues("scientific_references") as any[]];
																	refs[index].year = parseInt(e.target.value);
																	form.setValue("scientific_references", refs);
																}}
															/>
															<Select 
																value={ref.evidence_level}
																onValueChange={(val) => {
																	const refs = [...form.getValues("scientific_references") as any[]];
																	refs[index].evidence_level = val;
																	form.setValue("scientific_references", refs);
																}}
															>
																<SelectTrigger className="h-8 text-[10px]">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{getEvidenceLevelOptions().map(opt => (
																		<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
													</div>
													<Button 
														type="button" 
														variant="ghost" 
														size="icon" 
														className="h-8 w-8 text-destructive"
														onClick={() => {
															const refs = [...form.getValues("scientific_references") as any[]];
															refs.splice(index, 1);
															form.setValue("scientific_references", refs);
														}}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))
										) : (
											<FormField
												control={form.control}
												name="scientific_references"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<Textarea 
																{...field} 
																value={typeof field.value === 'string' ? field.value : ''}
																onChange={(e) => field.onChange(e.target.value)}
																placeholder="Referências em formato texto/markdown..."
																className="text-xs min-h-[100px] font-mono bg-muted/10"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}
									</div>
								</div>
							</div>
						</form>
					</Form>
				</div>

				{isUploading && (
					<div className="px-4 sm:px-6 py-2 border-t">
						<div className="flex items-center justify-between mb-1">
							<span className="text-xs font-medium text-muted-foreground">
								Fazendo upload...
							</span>
							<span className="text-xs font-medium text-muted-foreground">
								{uploadProgress}%
							</span>
						</div>
						<Progress value={uploadProgress} className="h-1" />
					</div>
				)}

				<div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t mt-auto bg-background">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="w-full sm:w-auto"
						disabled={isUploading || isSaving}
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="exercise-form"
						disabled={isSaving || isUploading}
						className="w-full sm:w-auto"
					>
						{isUploading
							? "Fazendo Upload..."
							: isSaving
								? "Salvando..."
								: exercise
									? "Atualizar"
									: "Criar"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
