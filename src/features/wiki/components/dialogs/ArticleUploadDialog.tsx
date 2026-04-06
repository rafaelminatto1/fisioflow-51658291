import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Upload, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { knowledgeService } from "../../services/knowledgeService";
import { aiService } from "../../services/aiService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface ArticleUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function ArticleUploadDialog({
	open,
	onOpenChange,
	onSuccess,
}: ArticleUploadDialogProps) {
	const isMobile = useIsMobile();
	const { user } = useAuth();
	const [file, setFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadStep, setUploadStep] = useState<
		"idle" | "uploading" | "indexing"
	>("idle");

	const { register, handleSubmit, reset, setValue } = useForm({
		defaultValues: {
			title: "",
			group: "Ortopedia",
			subgroup: "",
			evidenceLevel: "Consensus",
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFile(e.target.files[0]);
			// Auto-fill title from filename if empty
			setValue(
				"title",
				e.target.files[0].name.replace(".pdf", "").replace(/_/g, " "),
			);
		}
	};

	const onSubmit = async (data: any) => {
		if (!file || !user?.organizationId) return;

		try {
			setIsUploading(true);
			setUploadStep("uploading");

			// 1. Upload to R2
			const { url: downloadURL } = await uploadToR2(
				file,
				`knowledge-base/${user.organizationId}`,
			);

			// 2. Create Record (Worker API)
			const artifactId = await knowledgeService.createArtifact({
				organizationId: user.organizationId,
				title: data.title,
				type: "pdf",
				url: downloadURL,
				group: data.group,
				subgroup: data.subgroup,
				evidenceLevel: data.evidenceLevel,
				status: "verified",
				tags: [],
				vectorStatus: "pending",
				metadata: {
					year: new Date().getFullYear(),
					authors: [{ name: user.email || "Internal" }],
				},
				viewCount: 0,
				createdBy: user.uid,
			});

			// 3. Trigger AI Processing
			setUploadStep("indexing");
			try {
				await aiService.processArtifact(artifactId);
				toast.success("Artigo adicionado e processado pela IA!");
			} catch (aiError) {
				console.error("AI Processing failed", aiError);
				toast.warning("Artigo salvo, mas o processamento de IA falhou.");
			}

			onSuccess();
			onOpenChange(false);
			reset();
			setFile(null);
		} catch (error) {
			console.error(error);
			toast.error("Erro ao fazer upload do artigo.");
		} finally {
			setIsUploading(false);
			setUploadStep("idle");
		}
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-[500px]"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-primary" />
					Adicionar Conhecimento
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Faça upload de um PDF (Consenso, Diretriz ou Protocolo) para a base
						de conhecimento.
					</p>

					<div className="space-y-2">
						<Label className="font-semibold">Arquivo PDF *</Label>
						<div
							className={cn(
								"border-2 border-dashed rounded-xl p-4 transition-all text-center",
								file
									? "bg-primary/5 border-primary/20"
									: "bg-slate-50 border-slate-200",
							)}
						>
							<Input
								id="wiki-file"
								type="file"
								accept="application/pdf"
								onChange={handleFileChange}
								disabled={isUploading}
								className="hidden"
							/>
							<label htmlFor="wiki-file" className="cursor-pointer block">
								{file ? (
									<div className="flex items-center justify-center gap-2 text-primary font-bold">
										<FileCheck className="h-5 w-5" />
										<span className="truncate max-w-[200px]">{file.name}</span>
									</div>
								) : (
									<div className="space-y-1">
										<Upload className="h-6 w-6 mx-auto text-slate-400" />
										<p className="text-xs text-slate-500 font-medium">
											Clique para selecionar ou arraste o arquivo
										</p>
									</div>
								)}
							</label>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="font-semibold">Título do Artigo</Label>
						<Input
							{...register("title", { required: true })}
							placeholder="Ex: Consenso LCA 2024"
							disabled={isUploading}
							className="rounded-xl"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label className="font-semibold text-xs">Grupo</Label>
							<Select
								onValueChange={(v) => setValue("group", v)}
								defaultValue="Ortopedia"
								disabled={isUploading}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder="Selecione" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Ortopedia">Ortopedia</SelectItem>
									<SelectItem value="Esportiva">Esportiva</SelectItem>
									<SelectItem value="Pós-Operatório">Pós-Operatório</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label className="font-semibold text-xs">
								Subgrupo (Opcional)
							</Label>
							<Input
								{...register("subgroup")}
								placeholder="Ex: Joelho, Ombro"
								disabled={isUploading}
								className="rounded-xl"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="font-semibold">Nível de Evidência</Label>
						<Select
							onValueChange={(v) => setValue("evidenceLevel", v)}
							defaultValue="Consensus"
							disabled={isUploading}
						>
							<SelectTrigger className="rounded-xl">
								<SelectValue placeholder="Selecione" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="CPG">Diretriz Clínica (CPG)</SelectItem>
								<SelectItem value="Consensus">Consenso</SelectItem>
								<SelectItem value="SystematicReview">
									Revisão Sistemática
								</SelectItem>
								<SelectItem value="Protocol">Protocolo Interno</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					variant="ghost"
					type="button"
					onClick={() => onOpenChange(false)}
					disabled={isUploading}
					className="rounded-xl"
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={handleSubmit(onSubmit)}
					disabled={isUploading || !file}
					className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg"
				>
					{isUploading ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							{uploadStep === "uploading" ? "Enviando..." : "Indexando IA..."}
						</>
					) : (
						<>
							<Upload className="h-4 w-4" />
							Adicionar à Base
						</>
					)}
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}

// Helper icons
function FileCheck({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
			<polyline points="14 2 14 8 20 8" />
			<path d="m9 15 2 2 4-4" />
		</svg>
	);
}
