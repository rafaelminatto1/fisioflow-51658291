import React, { useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, FileDown, Copy, RefreshCw } from "lucide-react";
import { useAIReportGenerator } from "@/hooks/useAIReportGenerator";
import { ClinicalReportInput } from "@/services/ai/geminiAiService";
import { toast } from "sonner";

interface AIReportGeneratorModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	patientName: string;
	reportInput: ClinicalReportInput | null;
}

export const AIReportGeneratorModal: React.FC<AIReportGeneratorModalProps> = ({
	open,
	onOpenChange,
	patientName,
	reportInput,
}) => {
	const {
		isGenerating,
		generatedReport,
		setGeneratedReport,
		generateReport,
		error,
	} = useAIReportGenerator();

	useEffect(() => {
		// Somente gerar automaticamente ao abrir se não houver relatório gerado nem erro
		if (open && reportInput && !generatedReport && !isGenerating && !error) {
			generateReport(reportInput);
		}
	}, [open, reportInput, generatedReport, isGenerating, generateReport, error]);

	const [isExporting, setIsExporting] = React.useState(false);

	const handleExportPDF = async () => {
		if (!generatedReport || !reportInput) return;
		try {
			setIsExporting(true);
			const { exportClinicalReportToPDF } = await import(
				"@/lib/export/clinicalReportPdfExport"
			);
			await exportClinicalReportToPDF(
				patientName,
				generatedReport,
				reportInput,
			);
			toast.success("Relatório exportado com sucesso!");
		} catch (err) {
			console.error("Erro ao exportar PDF:", err);
			toast.error("Erro ao exportar PDF do relatório.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleCopy = () => {
		if (!generatedReport) return;
		navigator.clipboard.writeText(generatedReport);
		toast.success("Relatório copiado para a área de transferência!");
	};

	const handleRegenerate = () => {
		if (reportInput) {
			generateReport(reportInput);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
				<DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50">
					<DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
						<Sparkles className="h-5 w-5 text-purple-600" />
						Relatório Clínico IA
					</DialogTitle>
					<DialogDescription className="text-slate-500">
						A inteligência artificial analisou as evoluções do paciente e gerou
						este relatório. Faça ajustes manuais se necessário antes de
						exportar.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-hidden p-6 flex flex-col">
					{isGenerating ? (
						<div className="flex flex-col items-center justify-center py-20 flex-1">
							<Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-6" />
							<h3 className="text-lg font-medium text-slate-800">
								Gerando relatório clínico...
							</h3>
							<p className="text-slate-500 text-center max-w-sm mt-2 text-sm leading-relaxed">
								Analisando as queixas, condutas e evolução funcional a partir
								das sessões documentadas do paciente.
							</p>
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center py-10 flex-1 text-center">
							<div className="bg-red-50 text-red-600 p-4 rounded-lg max-w-lg border border-red-100">
								<p className="font-medium text-red-800">
									Erro ao gerar o relatório
								</p>
								<p className="text-sm mt-1">{error}</p>
							</div>
							<Button
								onClick={() => reportInput && generateReport(reportInput)}
								className="mt-6"
								variant="outline"
							>
								Tentar Novamente
							</Button>
						</div>
					) : generatedReport ? (
						<div className="flex flex-col flex-1 h-full gap-4">
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-semibold text-slate-700">
									Edição do Relatório
								</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleRegenerate}
									className="h-8 gap-2 text-slate-500 hover:text-purple-700"
								>
									<RefreshCw className="h-3.5 w-3.5" /> Gerar Novamente
								</Button>
							</div>
							<Textarea
								value={generatedReport}
								onChange={(e) => setGeneratedReport(e.target.value)}
								className="flex-1 min-h-[400px] font-mono text-sm resize-none focus-visible:ring-purple-500 p-4 bg-slate-50/50 border-slate-200"
								placeholder="O relatório gerado aparecerá aqui..."
							/>
							<div className="flex items-center justify-between pt-2">
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										onClick={handleCopy}
										className="gap-2 shadow-sm"
									>
										<Copy className="h-4 w-4" /> Copiar
									</Button>
								</div>
								<div className="flex items-center gap-3">
									<Button variant="ghost" onClick={handleClose}>
										Fechar
									</Button>
									<Button
										disabled={isExporting}
										onClick={handleExportPDF}
										className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow shadow-purple-200"
									>
										{isExporting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<FileDown className="h-4 w-4" />
										)}
										{isExporting ? "Exportando..." : "Exportar PDF"}
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
};
