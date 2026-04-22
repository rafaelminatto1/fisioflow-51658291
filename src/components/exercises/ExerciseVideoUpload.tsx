import React, { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
	X,
	Check,
	AlertCircle,
	Info,
	ImageIcon,
	Film,
	Image as ImageIconLucide,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUploadExerciseVideo } from "@/hooks/useExerciseVideos";
import { toast } from "@/hooks/use-toast";
import {
	VIDEO_CATEGORIES,
	VIDEO_DIFFICULTY,
	BODY_PARTS,
	EQUIPMENT_OPTIONS,
	exerciseVideosService,
	MAX_VIDEO_SIZE,
	ALLOWED_VIDEO_EXTENSIONS,
	ALLOWED_IMAGE_EXTENSIONS,
	VideoCategory,
	VideoDifficulty,
} from "@/services/exerciseVideos";

export interface ExerciseMediaUploadProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
	exerciseId?: string;
	defaultValues?: {
		title?: string;
		category?: string;
		difficulty?: string;
		description?: string;
		bodyParts?: string[];
		equipment?: string[];
	};
}

export const ExerciseVideoUpload: React.FC<ExerciseMediaUploadProps> = ({
	open = false,
	onOpenChange,
	onSuccess,
	exerciseId,
	defaultValues,
}) => {
	const uploadMutation = useUploadExerciseVideo();

	// Form state
	const [title, setTitle] = useState(defaultValues?.title || "");
	const [description, setDescription] = useState(
		defaultValues?.description || "",
	);
	const [category, setCategory] = useState(defaultValues?.category || "");
	const [difficulty, setDifficulty] = useState(defaultValues?.difficulty || "");
	const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>(
		defaultValues?.bodyParts || [],
	);
	const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
		defaultValues?.equipment || [],
	);

	// File state
	const [mediaFile, setMediaFile] = useState<File | null>(null);
	const [mediaType, setMediaType] = useState<"video" | "image">("video");
	const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
	const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
	const [mediaPreview, setMediaPreview] = useState<string>("");

	// Upload state
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const thumbnailInputRef = useRef<HTMLInputElement>(null);

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			setTitle(defaultValues?.title || "");
			setDescription(defaultValues?.description || "");
			setCategory(defaultValues?.category || "");
			setDifficulty(defaultValues?.difficulty || "");
			setSelectedBodyParts(defaultValues?.bodyParts || []);
			setSelectedEquipment(defaultValues?.equipment || []);
			setUploadError(null);
		}
	}, [open, defaultValues]);

	const resetForm = () => {
		setTitle("");
		setDescription("");
		setCategory("");
		setDifficulty("");
		setSelectedBodyParts([]);
		setSelectedEquipment([]);
		setMediaFile(null);
		setThumbnailFile(null);
		setThumbnailPreview("");
		setMediaPreview("");
		setIsUploading(false);
		setUploadProgress(0);
		setUploadError(null);
	};

	const handleClose = () => {
		if (!isUploading) {
			resetForm();
			onOpenChange?.(false);
		}
	};

	const handleMediaDrop = useCallback(
		(
			acceptedFiles: File[],
			rejectedFiles: Array<{
				file: File;
				errors: Array<{ code: string; message?: string }>;
			}>,
		) => {
			setUploadError(null);

			// Handle rejections
			if (rejectedFiles.length > 0) {
				const rejection = rejectedFiles[0];
				const error = rejection.errors[0];
				if (error?.code === "file-too-large") {
					setUploadError(
						`O arquivo é muito grande. Máximo permitido: ${exerciseVideosService.formatFileSize(MAX_VIDEO_SIZE)}`,
					);
				} else if (error?.code === "file-invalid-type") {
					setUploadError(
						"Formato não suportado. Use vídeos (MP4, WebM, MOV) ou imagens (JPG, PNG, WebP, AVIF).",
					);
				} else {
					setUploadError("Erro ao validar arquivo. Tente novamente.");
				}
				return;
			}

			const file = acceptedFiles[0];
			if (file) {
				const type = file.type.startsWith("video/") ? "video" : "image";
				
				// Validate using service
				const validation = exerciseVideosService.validateMediaFile(file, type);
				if (!validation.valid) {
					setUploadError(validation.error || "Erro ao validar arquivo");
					return;
				}

				setMediaType(type);
				setMediaFile(file);
				setMediaPreview(URL.createObjectURL(file));
				setUploadError(null);

				// Auto-fill title from filename if empty
				if (!title) {
					const fileName = file.name
						.replace(/\.[^/.]+$/, "")
						.replace(/[-_]/g, " ");
					setTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
				}
			}
		},
		[title],
	);

	const { getRootProps, getInputProps, isDragActive, isDragReject } =
		useDropzone({
			onDrop: handleMediaDrop,
			accept: {
				"video/*": ALLOWED_VIDEO_EXTENSIONS.map((ext) => ext),
				"image/*": ALLOWED_IMAGE_EXTENSIONS.map((ext) => ext),
			},
			multiple: false,
			disabled: isUploading,
		});

	const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			if (!file.type.startsWith("image/")) {
				setUploadError("Thumbnail deve ser uma imagem");
				return;
			}
			if (file.size > 5 * 1024 * 1024) {
				setUploadError("Thumbnail deve ter no máximo 5MB");
				return;
			}
			setThumbnailFile(file);
			setThumbnailPreview(URL.createObjectURL(file));
			setUploadError(null);
		}
	};

	const toggleBodyPart = (part: string) => {
		setSelectedBodyParts((prev) =>
			prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part],
		);
	};

	const toggleEquipment = (equipment: string) => {
		setSelectedEquipment((prev) =>
			prev.includes(equipment)
				? prev.filter((e) => e !== equipment)
				: [...prev, equipment],
		);
	};

	const isFormValid = () => {
		return (
			title.trim().length >= 3 &&
			category !== "" &&
			difficulty !== "" &&
			mediaFile !== null
		);
	};

	const handleSubmit = async () => {
		if (!isFormValid()) {
			toast({
				title: "Campos obrigatórios",
				description: "Preencha todos os campos obrigatórios",
				variant: "destructive",
			});
			return;
		}

		if (!mediaFile) return;

		setUploadError(null);
		setIsUploading(true);
		setUploadProgress(10);

		try {
			// Simulate progress for UX
			const progressInterval = setInterval(() => {
				setUploadProgress((prev) => Math.min(prev + 5, 90));
			}, 500);

			await uploadMutation.mutateAsync(
				{
					exercise_id: exerciseId,
					title: title.trim(),
					description: description.trim() || undefined,
					file: mediaFile,
					thumbnail: thumbnailFile || undefined,
					category: category as VideoCategory,
					difficulty: difficulty as VideoDifficulty,
					body_parts: selectedBodyParts,
					equipment: selectedEquipment,
					type: mediaType,
				},
				{
					onSuccess: () => {
						clearInterval(progressInterval);
						setUploadProgress(100);
						toast({
							title: `${mediaType === "video" ? "Vídeo" : "Imagem"} enviada com sucesso!`,
							description: `A mídia de exercício foi adicionada à biblioteca.`,
						});
						resetForm();
						onSuccess?.();
						setTimeout(() => onOpenChange?.(false), 500);
					},
					onError: (error: { message?: string }) => {
						clearInterval(progressInterval);
						const errorMsg = error?.message || "Tente novamente mais tarde";
						setUploadError(`Erro ao enviar mídia: ${errorMsg}`);
						setIsUploading(false);
						setUploadProgress(0);
					},
				},
			);
		} catch (error: unknown) {
			const errorMsg =
				error instanceof Error ? error.message : "Tente novamente";
			setUploadError(`Erro ao enviar mídia: ${errorMsg}`);
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
				<DialogHeader className="p-6 pb-2">
					<DialogTitle>Adicionar Mídia de Exercício</DialogTitle>
					<DialogDescription>
						Faça upload de um vídeo ou imagem demonstrativa para a biblioteca
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-2">
					<div className="space-y-5">
						{/* Media Upload Area */}
						<div className="space-y-2">
							<Label>
								Mídia (Vídeo ou Imagem) <span className="text-destructive">*</span>
							</Label>
							{!mediaFile ? (
								<div
									{...getRootProps()}
									className={cn(
										"border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
										"hover:border-primary/50 hover:bg-muted/50",
										isDragActive &&
											!isDragReject &&
											"border-primary bg-primary/5 scale-[1.02]",
										isDragReject && "border-destructive bg-destructive/5",
										isUploading && "opacity-50 cursor-not-allowed",
									)}
								>
									<input {...getInputProps()} />
									<div
										className={cn(
											"w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors",
											isDragActive && !isDragReject
												? "bg-primary/20"
												: "bg-muted",
											isDragReject && "bg-destructive/20",
										)}
									>
										<Film
											className={cn(
												"h-8 w-8 transition-colors",
												isDragActive && !isDragReject
													? "text-primary"
													: "text-muted-foreground",
												isDragReject && "text-destructive",
											)}
										/>
									</div>
									<p className="text-sm font-medium">
										{isDragActive
											? isDragReject
												? "Formato não suportado"
												: "Solte o arquivo aqui"
											: "Arraste um vídeo/imagem ou clique para selecionar"}
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										Vídeos (MP4, WebM) ou Imagens (JPG, PNG, WebP)
									</p>
								</div>
							) : (
								<Card className="overflow-hidden">
									<CardContent className="p-4">
										<div className="flex items-start gap-4">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-2">
													{mediaType === "video" ? (
														<Film className="h-5 w-5 text-primary flex-shrink-0" />
													) : (
														<ImageIconLucide className="h-5 w-5 text-primary flex-shrink-0" />
													)}
													<p className="font-medium text-sm truncate">
														{mediaFile.name}
													</p>
												</div>
												<p className="text-xs text-muted-foreground mb-3">
													{exerciseVideosService.formatFileSize(mediaFile.size)}
												</p>
												{mediaType === "video" ? (
													<video
														src={mediaPreview}
														className="rounded-md w-full max-h-48 object-cover bg-black"
														controls
													/>
												) : (
													<img
														src={mediaPreview}
														className="rounded-md w-full max-h-48 object-contain bg-muted"
														alt="Preview"
													/>
												)}
											</div>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setMediaFile(null);
													setMediaPreview("");
													setUploadError(null);
												}}
												disabled={isUploading}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							)}
						</div>

						{/* Thumbnail Upload (Optional - Only for Videos) */}
						{mediaType === "video" && (
							<div className="space-y-2 animate-in fade-in slide-in-from-top-2">
								<div className="flex items-center gap-2">
									<Label>Thumbnail (opcional)</Label>
									<Badge variant="outline" className="text-xs">
										Será gerada automaticamente
									</Badge>
								</div>
								{!thumbnailPreview ? (
									<div
										className={cn(
											"border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50",
											isUploading && "opacity-50 cursor-not-allowed",
										)}
										onClick={() =>
											!isUploading && thumbnailInputRef.current?.click()
										}
									>
										<input
											ref={thumbnailInputRef}
											type="file"
											accept="image/*"
											onChange={handleThumbnailChange}
											className="hidden"
											disabled={isUploading}
										/>
										<ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											Clique para adicionar uma imagem personalizada
										</p>
									</div>
								) : (
									<Card>
										<CardContent className="p-4">
											<div className="flex items-center gap-4">
												<img
													src={thumbnailPreview}
													alt="Thumbnail"
													className="w-24 h-16 object-cover rounded"
												/>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														Thumbnail personalizada
													</p>
													<p className="text-xs text-muted-foreground truncate">
														{thumbnailFile?.name}
													</p>
												</div>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setThumbnailFile(null);
														setThumbnailPreview("");
														if (thumbnailInputRef.current) {
															thumbnailInputRef.current.value = "";
														}
													}}
													disabled={isUploading}
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						)}

						{/* Title */}
						<div className="space-y-2">
							<Label>
								Título do Exercício <span className="text-destructive">*</span>
							</Label>
							<Input
								placeholder="Ex: Rotação de Ombro com Bastão"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								disabled={isUploading}
								maxLength={100}
							/>
							<p className="text-xs text-muted-foreground text-right">
								{title.length}/100 caracteres
							</p>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label>Descrição</Label>
							<Textarea
								placeholder="Descreva o exercício, objetivo e cuidados importantes..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={isUploading}
								rows={3}
								maxLength={500}
							/>
							<p className="text-xs text-muted-foreground text-right">
								{description.length}/500 caracteres
							</p>
						</div>

						{/* Category and Difficulty */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>
									Categoria <span className="text-destructive">*</span>
								</Label>
								<Select
									value={category}
									onValueChange={setCategory}
									disabled={isUploading}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{VIDEO_CATEGORIES.map((cat) => (
											<SelectItem key={cat} value={cat}>
												{cat.charAt(0).toUpperCase() + cat.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>
									Dificuldade <span className="text-destructive">*</span>
								</Label>
								<Select
									value={difficulty}
									onValueChange={setDifficulty}
									disabled={isUploading}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										{VIDEO_DIFFICULTY.map((diff) => (
											<SelectItem key={diff} value={diff}>
												{diff.charAt(0).toUpperCase() + diff.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Body Parts */}
						<div className="space-y-2">
							<Label>Partes do Corpo</Label>
							<div className="flex flex-wrap gap-2">
								{BODY_PARTS.map((part) => (
									<Badge
										key={part}
										variant={
											selectedBodyParts.includes(part) ? "default" : "outline"
										}
										className={cn(
											"cursor-pointer transition-colors",
											!isUploading && "hover:bg-primary/20",
											selectedBodyParts.includes(part) &&
												"bg-primary text-primary-foreground hover:bg-primary",
										)}
										onClick={() => !isUploading && toggleBodyPart(part)}
									>
										{part.charAt(0).toUpperCase() + part.slice(1)}
										{selectedBodyParts.includes(part) && (
											<Check className="h-3 w-3 ml-1" />
										)}
									</Badge>
								))}
							</div>
						</div>

						{/* Equipment */}
						<div className="space-y-2">
							<Label>Equipamentos Necessários</Label>
							<div className="flex flex-wrap gap-2">
								{EQUIPMENT_OPTIONS.map((eq) => (
									<Badge
										key={eq}
										variant={
											selectedEquipment.includes(eq) ? "default" : "outline"
										}
										className={cn(
											"cursor-pointer transition-colors",
											!isUploading && "hover:bg-primary/20",
											selectedEquipment.includes(eq) &&
												"bg-primary text-primary-foreground hover:bg-primary",
										)}
										onClick={() => !isUploading && toggleEquipment(eq)}
									>
										{eq.charAt(0).toUpperCase() + eq.slice(1)}
										{selectedEquipment.includes(eq) && (
											<Check className="h-3 w-3 ml-1" />
										)}
									</Badge>
								))}
							</div>
						</div>

						{/* Upload Progress */}
						{isUploading && (
							<div className="space-y-3 p-4 bg-muted/50 rounded-lg">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm">
										<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
										<span className="font-medium">Enviando mídia...</span>
									</div>
									<span className="text-sm text-muted-foreground">
										{uploadProgress}%
									</span>
								</div>
								<Progress value={uploadProgress} className="h-2" />
							</div>
						)}

						{/* Error Message */}
						{uploadError && (
							<div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
								<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
								<p className="text-sm text-destructive">{uploadError}</p>
							</div>
						)}

						{/* Info Message */}
						{!mediaFile && (
							<div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
								<Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
								<div className="text-sm text-blue-800 dark:text-blue-200">
									<p className="font-medium mb-1">Dicas para uma boa mídia:</p>
									<ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
										<li>Use iluminação adequada</li>
										<li>Vídeos curtos (30s - 2min) funcionam melhor</li>
										<li>Imagens devem estar focadas no movimento</li>
										<li>Demonstre o movimento completamente</li>
									</ul>
								</div>
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="p-6 pt-2 border-t mt-auto bg-background">
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={isUploading}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!isFormValid() || isUploading}
						className="min-w-[140px]"
					>
						{isUploading ? (
							<span className="flex items-center gap-2">
								<div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
								Enviando...
							</span>
						) : (
							"Adicionar Mídia"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};


export default ExerciseVideoUpload;
