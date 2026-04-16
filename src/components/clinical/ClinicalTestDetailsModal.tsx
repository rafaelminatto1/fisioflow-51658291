import { useEffect, useState } from "react";
import {
	CalendarCheck,
	CheckSquare,
	Download,
	Edit3,
	ExternalLink,
	FileText,
	Image as ImageIcon,
	Info,
	Link2,
	PlayCircle,
	ThumbsUp,
	Trash2,
	X,
	ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import {
	CustomModal,
	CustomModalBody,
	CustomModalFooter,
	CustomModalHeader,
	CustomModalTitle,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import type { ClinicalTestCatalogRecord } from "@/data/clinicalTestsCatalog";
import { useIsMobile } from "@/hooks/use-mobile";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { diagnosticClusters } from "@/data/clinicalClusters";

interface ClinicalTestDetailsModalProps {
	test: ClinicalTestCatalogRecord | null;
	isOpen: boolean;
	onClose: () => void;
	onEdit: (test: ClinicalTestCatalogRecord) => void;
	onDelete: (test: ClinicalTestCatalogRecord) => void;
	onAddToProtocol: (test: ClinicalTestCatalogRecord) => void;
	onNavigateToTest?: (testId: string) => void;
}

const MediaPlaceholder = ({ label }: { label: string }) => (
	<div className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center shadow-sm transition-all hover:border-teal-300 hover:bg-white">
		<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
			<ImageIcon className="h-5 w-5 text-slate-300" />
		</div>
		<span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
			{label}
		</span>
	</div>
);

export function ClinicalTestDetailsModal({
	test,
	isOpen,
	onClose,
	onEdit,
	onDelete,
	onAddToProtocol,
	onNavigateToTest,
}: ClinicalTestDetailsModalProps) {
	const isMobile = useIsMobile();
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

	// Lógica de Clusters
	const currentCluster = diagnosticClusters.find(
		(c) => c.id === test?.cluster_id,
	);
	const relatedTestIds = (currentCluster?.tests || []).filter(
		(id) => id !== test?.id,
	);

	const handleImageLoad = (url: string) => {
		setImageLoaded((prev) => ({ ...prev, [url]: true }));
	};

	useEffect(() => {
		if (!previewImage) return;

		const handlePreviewEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopImmediatePropagation();
			setPreviewImage(null);
		};

		document.addEventListener("keydown", handlePreviewEscape);
		return () => document.removeEventListener("keydown", handlePreviewEscape);
	}, [previewImage]);

	useEffect(() => {
		if (!isOpen || !test) setPreviewImage(null);
	}, [isOpen, test]);

	if (!test) return null;

	const primaryImage = test.image_url || test.media_urls?.[0] || null;
	const evidenceResources = test.evidence_resources ?? [];

	const handleDownloadPDF = async () => {
		try {
			const { generateClinicalTestPdf } = await import(
				"@/utils/generateClinicalTestPdf"
			);
			await generateClinicalTestPdf(test);
			toast.success("PDF gerado com sucesso.");
		} catch (error) {
			logger.error("Error generating PDF", error, "ClinicalTestDetailsModal");
			toast.error("Erro ao gerar PDF.");
		}
	};

	return (
		<CustomModal
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			isMobile={isMobile}
			contentClassName="max-w-6xl max-h-[94vh]"
		>
			<CustomModalHeader onClose={onClose}>
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">
							{test.category || "Sem categoria"}
						</span>
						<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
							{test.is_builtin ? "Biblioteca curada" : "Teste da clínica"}
						</span>
						{test.regularity_sessions ? (
							<span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
								<CalendarCheck className="h-3 w-3" />A cada{" "}
								{test.regularity_sessions} sessões
							</span>
						) : null}
					</div>

					<CustomModalTitle className="text-2xl font-bold leading-tight text-slate-900">
						{test.name}
						{test.name_en ? (
							<span className="mt-1 block text-sm font-normal italic text-slate-400">
								{test.name_en}
							</span>
						) : null}
					</CustomModalTitle>
				</div>

				<div className="ml-auto mr-4 flex items-center gap-2">
					{test.is_builtin ? (
						<Button
							variant="outline"
							size="sm"
							className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
							onClick={() => onEdit(test)}
						>
							<Edit3 className="mr-2 h-4 w-4" />
							Editar
						</Button>
					) : (
						<>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onEdit(test)}
								className="h-8 w-8 rounded-full text-slate-400 hover:bg-teal-50 hover:text-teal-600"
								title="Editar teste"
							>
								<Edit3 className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDelete(test)}
								className="h-8 w-8 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"
								title="Excluir teste"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</>
					)}
				</div>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
					<div className="space-y-5">
						{primaryImage ? (
							<button
								type="button"
								onClick={() => setPreviewImage(primaryImage)}
								className="group relative w-full cursor-zoom-in overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 text-left shadow-sm"
								aria-label={`Ampliar imagem do teste ${test.name}`}
							>
								{!imageLoaded[primaryImage] && (
									<Skeleton className="absolute inset-0 h-full w-full rounded-3xl" />
								)}
								<div className="aspect-video">
									<img
										src={primaryImage}
										alt={`Execução: ${test.name}`}
										onLoad={() => handleImageLoad(primaryImage)}
										className={cn(
											"h-full w-full object-contain transition-all duration-500 group-hover:scale-[1.02]",
											!imageLoaded[primaryImage] ? "opacity-0" : "opacity-100",
										)}
									/>
								</div>
								<div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
								<div className="pointer-events-none absolute bottom-4 right-4 inline-flex translate-y-2 items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs font-bold text-white opacity-0 shadow-2xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
									<ZoomIn className="h-4 w-4" />
									Clique para ampliar
								</div>
							</button>
						) : (
							<div className="group relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl">
								<div className="aspect-video">
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/40 via-slate-950/20 to-slate-900/70 text-white/90">
										<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/5 bg-white/10 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/20">
											<PlayCircle className="h-10 w-10 text-teal-400" />
										</div>
										<span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
											Visualização ilustrativa
										</span>
									</div>
								</div>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							{[
								{
									url: test.initial_position_image_url,
									label: "Posição inicial",
								},
								{ url: test.final_position_image_url, label: "Posição final" },
							].map((item) => (
								<div key={item.label} className="space-y-2">
									<span className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
										{item.label}
									</span>
									{item.url ? (
										<button
											type="button"
											onClick={() => setPreviewImage(item.url || null)}
											className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-sm transition-all active:scale-95"
										>
											<img
												src={item.url}
												alt={`${test.name} - ${item.label}`}
												className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
											/>
											<div className="absolute inset-0 bg-slate-900/0 transition-colors group-hover:bg-slate-900/10" />
											<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
												<div className="rounded-full border border-slate-100 bg-white/90 p-2 text-slate-700 shadow-lg">
													<ZoomIn className="h-4 w-4" />
												</div>
											</div>
										</button>
									) : (
										<MediaPlaceholder label={item.label} />
									)}
								</div>
							))}
						</div>
					</div>

					<div className="flex h-full flex-col gap-6">
						<div>
							<h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
								<CheckSquare className="h-4 w-4 text-teal-600" />
								Protocolo de execução
							</h3>
							<div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
								<p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
									{test.execution ||
										"Nenhuma instrução de execução disponível."}
								</p>
							</div>
						</div>

						{test.positive_sign ? (
							<div>
								<h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
									<ThumbsUp className="h-4 w-4 text-blue-600" />
									Interpretação positiva
								</h3>
								<div className="rounded-2xl border border-blue-100 border-l-4 border-l-blue-500 bg-blue-50/60 p-4">
									<p className="text-sm font-medium italic text-blue-900">
										{test.positive_sign}
									</p>
								</div>
							</div>
						) : null}

						{test.evidence_summary ? (
							<div>
								<h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
									<FileText className="h-4 w-4 text-emerald-600" />
									Leitura clínica
								</h3>
								<div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
									<p className="text-sm leading-relaxed text-emerald-950">
										{test.evidence_summary}
									</p>
									<p className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-700">
										{test.evidence_label || "Base científica"} •{" "}
										{test.source_label || "Curadoria clínica"}
									</p>
								</div>
							</div>
						) : null}

						{test.sensitivity_specificity || test.lr_positive ? (
							<div className="rounded-3xl border border-slate-100 bg-white/50 p-5 shadow-sm backdrop-blur-sm">
								<h3 className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
									<Info className="h-3.5 w-3.5" />
									Acurácia Diagnóstica
								</h3>

								<div className="grid grid-cols-2 gap-4">
									{test.sensitivity_specificity && (
										<div className="col-span-2 mb-2">
											<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
												Evidência Geral
											</p>
											<p className="text-sm font-medium text-slate-700">
												{test.sensitivity_specificity}
											</p>
										</div>
									)}

									{test.lr_positive && (
										<div className="rounded-2xl bg-teal-50/50 p-3 border border-teal-100/50">
											<p className="text-[10px] font-black text-teal-600 uppercase tracking-wider mb-1">
												LR+
											</p>
											<p className="text-lg font-black text-teal-700">
												{test.lr_positive}
											</p>
											<p className="text-[10px] text-teal-600/70 font-medium">
												Likelihood Ratio Positivo
											</p>
										</div>
									)}

									{test.lr_negative && (
										<div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
											<p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
												LR-
											</p>
											<p className="text-lg font-black text-slate-700">
												{test.lr_negative}
											</p>
											<p className="text-[10px] text-slate-500/70 font-medium">
												Likelihood Ratio Negativo
											</p>
										</div>
									)}
								</div>

								{test.lr_positive && test.lr_positive > 5 && (
									<div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-500/10 p-3 text-[11px] font-bold text-teal-700">
										<ThumbsUp className="h-3.5 w-3.5" />
										Teste com forte poder confirmatório (LR+ &gt; 5)
									</div>
								)}
							</div>
						) : null}

						{currentCluster && relatedTestIds.length > 0 && (
							<div className="rounded-3xl border border-amber-100 bg-amber-50/30 p-5">
								<h3 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">
									<Sparkles className="h-3.5 w-3.5" />
									Refinar Diagnóstico (Cluster)
								</h3>
								<p className="mb-4 text-xs font-medium text-amber-800 leading-relaxed">
									{currentCluster.interpretation}
								</p>
								<div className="space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70">
										Testes Complementares:
									</p>
									<div className="flex flex-wrap gap-2">
										{relatedTestIds.map((testId) => (
											<button
												key={testId}
												type="button"
												onClick={() => onNavigateToTest?.(testId)}
												className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-amber-700 shadow-sm border border-amber-100 transition-all hover:scale-105 hover:bg-amber-100 active:scale-95"
											>
												{testId.replace("builtin-", "").replace(/-/g, " ")}
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{test.reference ? (
							<div>
								<h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
									<Link2 className="h-3.5 w-3.5" />
									Referência principal
								</h3>
								<p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-500">
									{test.reference}
								</p>
							</div>
						) : null}

						{evidenceResources.length > 0 ? (
							<div className="mt-auto">
								<h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
									<FileText className="h-4 w-4 text-rose-600" />
									PDFs e materiais de apoio
								</h3>
								<div className="space-y-3">
									{evidenceResources.map((resource) => {
										const isPdf = resource.kind === "pdf";

										return (
											<a
												key={`${resource.title}-${resource.url}`}
												href={resource.url}
												target="_blank"
												rel="noreferrer"
												download={isPdf ? "" : undefined}
												className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-teal-200 hover:bg-teal-50/40"
											>
												<div className="min-w-0">
													<p className="font-medium text-slate-900">
														{resource.title}
													</p>
													{resource.description ? (
														<p className="mt-1 text-sm leading-6 text-slate-500">
															{resource.description}
														</p>
													) : null}
												</div>
												<div className="flex shrink-0 items-center gap-2 text-sm font-medium text-teal-700">
													{isPdf ? (
														<>
															<FileText className="h-4 w-4" />
															PDF
														</>
													) : (
														<>
															<ExternalLink className="h-4 w-4" />
															Abrir
														</>
													)}
												</div>
											</a>
										);
									})}
								</div>
							</div>
						) : null}
					</div>
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					variant="ghost"
					className="h-11 rounded-xl px-6 font-bold text-slate-500 hover:bg-slate-100"
					onClick={handleDownloadPDF}
				>
					<Download className="mr-2 h-4 w-4" />
					Exportar PDF
				</Button>
				{test.is_builtin ? (
					<Button
						className="h-11 rounded-xl bg-slate-900 px-8 font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition-all hover:scale-105 hover:bg-slate-800 active:scale-95"
						onClick={() => onEdit(test)}
					>
						<Edit3 className="mr-2 h-4 w-4" />
						Editar teste
					</Button>
				) : (
					<Button
						className="h-11 rounded-xl bg-slate-900 px-8 font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition-all hover:scale-105 hover:bg-slate-800 active:scale-95"
						onClick={() => onAddToProtocol(test)}
					>
						Adicionar ao protocolo
					</Button>
				)}
			</CustomModalFooter>

			{previewImage ? (
				<div
					className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
					onClick={() => setPreviewImage(null)}
					role="dialog"
					aria-modal="true"
					aria-label={`Imagem ampliada de ${test.name}`}
				>
					<button
						type="button"
						onClick={() => setPreviewImage(null)}
						className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
						aria-label="Fechar imagem ampliada"
					>
						<X className="h-5 w-5" />
					</button>

					<div
						className="flex max-h-[94vh] w-full max-w-6xl flex-col gap-3"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="px-1">
							<p className="text-sm font-semibold text-white">
								Imagem do teste
							</p>
							<p className="text-sm text-slate-300">{test.name}</p>
						</div>

						<div className="flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl sm:p-5">
							<img
								src={previewImage}
								alt={`Imagem ampliada de ${test.name}`}
								className={cn(
									"max-w-full rounded-xl object-contain",
									isMobile ? "max-h-[70dvh]" : "max-h-[82vh]",
								)}
							/>
						</div>
					</div>
				</div>
			) : null}
		</CustomModal>
	);
}
