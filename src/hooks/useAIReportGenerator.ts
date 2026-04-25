import { useState, useCallback } from "react";
import { generateClinicalReport, ClinicalReportInput } from "../services/ai/geminiAiService";

export function useAIReportGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const generateReport = useCallback(async (input: ClinicalReportInput) => {
    setIsGenerating(true);
    setError(null);
    try {
      const report = await generateClinicalReport(input);
      setGeneratedReport(report);
      return report;
    } catch (err: any) {
      console.error("Error generating clinical report:", err);
      const errorMessage = err.message || "Ocorreu um erro ao gerar o relatório clínico com IA.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearReport = useCallback(() => {
    setGeneratedReport(null);
    setError(null);
  }, []);

  return {
    generateReport,
    isGenerating,
    error,
    generatedReport,
    setGeneratedReport,
    clearReport,
  };
}
