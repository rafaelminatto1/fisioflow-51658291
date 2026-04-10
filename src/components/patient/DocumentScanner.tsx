import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, FileSearch, Loader2 } from "lucide-react";
import { aiApi } from "@/api/v2";
import { useToast } from "@/hooks/use-toast";

export const DocumentScanner = ({
	onScanComplete,
}: {
	onScanComplete: (data: {
		text: string;
		summary?: string;
		category: string;
	}) => void;
}) => {
	const [isScanning, setIsScanning] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToast();

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setSelectedFile(file);
			if (file.type.startsWith("image/")) {
				const reader = new FileReader();
				reader.onloadend = () => setPreview(reader.result as string);
				reader.readAsDataURL(file);
			} else {
				setPreview(null);
			}
		}
	};

	const startScan = async () => {
		if (!selectedFile) return;

		try {
			setIsScanning(true);
			let fileUrl = preview || "";

			if (selectedFile.type === "application/pdf") {
				const arrayBuffer = await selectedFile.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(arrayBuffer).reduce(
						(data, byte) => data + String.fromCharCode(byte),
						"",
					),
				);
				fileUrl = `data:application/pdf;base64,${base64}`;
			}

			const response = await aiApi.documentAnalyze({
				fileName: selectedFile.name,
				fileUrl: fileUrl,
				mediaType: selectedFile.type || "application/pdf",
				options: { extractText: true, generateSummary: true },
			});

			const extractedData = (response.data.extractedData ?? {}) as Record<
				string,
				unknown
			>;
			const text =
				typeof extractedData.text === "string" ? extractedData.text : "";
			const summary =
				typeof extractedData.summary === "string"
					? extractedData.summary
					: undefined;
			const category =
				typeof extractedData.category === "string"
					? extractedData.category
					: "outro";

			toast({
				title: "Scanner Concluído",
				description: "O texto do laudo foi extraído com sucesso.",
			});

			onScanComplete({ text, summary, category });
			setPreview(null);
			setSelectedFile(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch {
			toast({
				title: "Erro no Scanner",
				description: "Não foi possível ler o documento.",
				variant: "destructive",
			});
		} finally {
			setIsScanning(false);
		}
	};

	return (
		<Card className="border-dashed">
			<CardHeader className="py-4">
				<CardTitle className="text-sm flex items-center gap-2">
					<FileSearch className="h-4 w-4 text-blue-500" />
					Scanner Inteligente de Laudos
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{!preview && !selectedFile ? (
					<div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
						<Camera className="h-8 w-8 text-muted-foreground mb-2" />
						<p className="text-xs text-muted-foreground text-center mb-4">
							Tire uma foto do laudo médico para extrair o texto
							automaticamente.
						</p>
						<Button size="sm" onClick={() => fileInputRef.current?.click()}>
							Selecionar Imagem ou PDF
						</Button>
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							accept="image/*,application/pdf"
							onChange={handleFileSelect}
						/>
					</div>
				) : (
					<div className="space-y-4">
						{preview && (
							<img
								src={preview}
								alt="Preview"
								className="rounded-lg max-h-[300px] mx-auto"
							/>
						)}
						{selectedFile && !preview && (
							<div className="p-4 bg-muted rounded-lg text-center">
								<FileSearch className="h-8 w-8 mx-auto mb-2 text-blue-500" />
								<p className="text-sm font-medium">{selectedFile.name}</p>
								<p className="text-xs text-muted-foreground">
									{(selectedFile.size / 1024).toFixed(1)} KB
								</p>
							</div>
						)}
						<div className="flex gap-2">
							<Button
								className="flex-1 bg-blue-600"
								onClick={startScan}
								disabled={isScanning}
							>
								{isScanning ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : (
									<FileSearch className="h-4 w-4 mr-2" />
								)}
								{isScanning ? "Lendo Documento..." : "Iniciar Scanner IA"}
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setPreview(null);
									setSelectedFile(null);
									if (fileInputRef.current) fileInputRef.current.value = "";
								}}
								disabled={isScanning}
							>
								Cancelar
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
