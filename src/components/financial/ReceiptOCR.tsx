import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { marketingApi } from "@/api/v2";

interface ReceiptOCRProps {
	onDataExtracted: (data: {
		valor: number;
		nome?: string;
		cardLastDigits?: string;
		isFirstPayment?: boolean;
		patientId?: string;
	}) => void;
}

export function ReceiptOCR({ onDataExtracted }: ReceiptOCRProps) {
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [preview, setPreview] = useState<string | null>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Preview
		const reader = new FileReader();
		reader.onloadend = () => setPreview(reader.result as string);
		reader.readAsDataURL(file);

		// Analyze via IA
		setIsAnalyzing(true);
		try {
			// Aqui usamos o Gemini ou Vision API do Worker para extrair os dados
			// Como é experimental, simulamos a extração que seria feita pelo Worker
			const formData = new FormData();
			formData.append("image", file);

			const result = await marketingApi.analysis.extractReceiptData(formData);

			if (result.success && result.data) {
				let extractedData = result.data;

				// Se detectou final de cartão, tenta buscar paciente já mapeado
				if (extractedData.cardLastDigits) {
					try {
						const mappingRes = await fetch(
							`/api/financial/card-mapping/${extractedData.cardLastDigits}`,
						);
						const mapping = await mappingRes.json();
						if (mapping.data) {
							extractedData = {
								...extractedData,
								patientId: mapping.data.patient_id,
								nome: mapping.data.patient_name,
							};
							toast.success(
								`Paciente ${mapping.data.patient_name} reconhecido pelo cartão!`,
							);
						}
					} catch (e) {
						console.error("Mapping lookup error:", e);
					}
				}

				onDataExtracted(extractedData);
				toast.success("Dados extraídos com sucesso via IA!");
			} else {
				throw new Error("Não foi possível ler os dados do comprovante");
			}
		} catch (error) {
			console.error("OCR Error:", error);
			toast.error("Erro ao ler comprovante. Tente digitar manualmente.");
		} finally {
			setIsAnalyzing(false);
		}
	};

	return (
		<div className="space-y-4">
			<Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 transition-all overflow-hidden relative group">
				<CardContent className="p-0">
					<Label
						htmlFor="receipt-upload"
						className="flex flex-col items-center justify-center py-10 cursor-pointer w-full h-full"
					>
						{preview ? (
							<div className="relative w-full h-40">
								<img
									src={preview}
									alt="Preview"
									className="w-full h-full object-contain opacity-50 blur-[1px]"
								/>
								<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm">
									{isAnalyzing ? (
										<>
											<Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
											<p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
												IA Analisando Comprovante...
											</p>
										</>
									) : (
										<>
											<Check className="h-8 w-8 text-emerald-500 mb-2" />
											<p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
												Comprovante Processado
											</p>
										</>
									)}
								</div>
							</div>
						) : (
							<>
								<div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-premium-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
									<Camera className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
								</div>
								<div className="text-center space-y-1">
									<p className="text-sm font-black tracking-tightest">
										Anexar Comprovante (PIX/Foto)
									</p>
									<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
										<Sparkles className="w-3 h-3 text-amber-500" />
										Preenchimento Automático via IA
									</p>
								</div>
							</>
						)}
						<Input
							id="receipt-upload"
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleFileChange}
							disabled={isAnalyzing}
						/>
					</Label>
				</CardContent>
			</Card>

			{!preview && !isAnalyzing && (
				<div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 items-start animate-in fade-in duration-700">
					<Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
					<p className="text-[10px] font-bold text-blue-700 leading-tight">
						Dica: Tire um print do PIX ou uma foto do recibo físico. Nossa IA
						identificará o valor e o paciente automaticamente.
					</p>
				</div>
			)}
		</div>
	);
}

function Info(props: any) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 16v-4" />
			<path d="M12 8h.01" />
		</svg>
	);
}
