import React, { Suspense, lazy, useState } from "react";
import { Download, File as FileIcon, Files, Trash } from "lucide-react";
import { useDeleteDocument, useDownloadDocument, useUploadDocument, type PatientDocument } from "@/hooks/usePatientDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";

const LazyDocumentScanner = lazy(() =>
	import("@/components/patient/DocumentScanner").then((m) => ({
		default: m.DocumentScanner,
	})),
);

interface PatientDocumentsTabProps {
	patientId: string;
	documents: PatientDocument[];
	isLoading: boolean;
}

export function PatientDocumentsTab({
	patientId,
	documents,
	isLoading,
}: PatientDocumentsTabProps) {
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
		if (!file) return;
		setSelectedFile(file);
		setUploadDialogOpen(true);
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

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const categoryLabels: Record<PatientDocument["category"], string> = {
		laudo: "Laudo",
		exame: "Exame",
		receita: "Receita",
		termo: "Termo",
		outro: "Outro",
	};

	if (isLoading) {
		return (
			<div className="p-8 text-center">
				<Skeleton className="h-40 w-full mx-auto" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Suspense fallback={<Skeleton className="h-20 w-full rounded-xl" />}>
				<LazyDocumentScanner
					onScanComplete={(text) =>
						alert(`Texto extraído: ${text.substring(0, 100)}...`)
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

			{documents.length > 0 ? (
				<div className="space-y-3">
					{documents.map((doc) => (
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
}
